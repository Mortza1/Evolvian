"""
RAG Service — Agent Knowledge Base

Handles chunking, embedding, storing, and retrieving agent knowledge.

Storage:
  - agent_knowledge_chunks  — regular table, stores chunk text + metadata
  - agent_knowledge_vecs    — sqlite-vec virtual table, stores float[1536] embeddings
    (linked by rowid so we can join on chunk id)

Embedding model: openai/text-embedding-3-small via OpenRouter (1536 dims)
Similarity: cosine / L2 via sqlite-vec KNN search
"""

from __future__ import annotations

import json
import os
import sqlite3
import struct
import textwrap
from typing import List, Dict, Optional, Tuple

import requests
import sqlite_vec
from dotenv import load_dotenv

load_dotenv()

EMBEDDING_MODEL = "openai/text-embedding-3-small"
EMBEDDING_DIMS  = 1536
CHUNK_SIZE      = 800   # characters per chunk
CHUNK_OVERLAP   = 100   # overlap between consecutive chunks
TOP_K_DEFAULT   = 5

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./evolvian.db").replace("sqlite:///", "").replace("./", "")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _pack(vec: List[float]) -> bytes:
    """Pack a float list into the binary format sqlite-vec expects."""
    return struct.pack(f"{len(vec)}f", *vec)


def _get_conn() -> sqlite3.Connection:
    """Open a connection with sqlite-vec loaded."""
    conn = sqlite3.connect(DB_PATH)
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    conn.row_factory = sqlite3.Row
    return conn


# ─── Embedding ───────────────────────────────────────────────────────────────

class EmbeddingService:
    def __init__(self):
        self.api_key  = os.getenv("OPENROUTER_API_KEY", "")
        self.api_url  = "https://openrouter.ai/api/v1/embeddings"
        self.model    = EMBEDDING_MODEL

    def embed(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of texts. Returns a list of float vectors."""
        if not texts:
            return []

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {"model": self.model, "input": texts}

        resp = requests.post(self.api_url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()

        if "error" in data:
            raise RuntimeError(f"Embedding API error: {data['error']}")

        # Sort by index to preserve order
        items = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in items]

    def embed_one(self, text: str) -> List[float]:
        return self.embed([text])[0]


# ─── Chunker ─────────────────────────────────────────────────────────────────

def _chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Split text into overlapping chunks.
    Tries to break on paragraph boundaries first, then sentence boundaries,
    then falls back to character slicing.
    """
    text = text.strip()
    if not text:
        return []

    # If short enough, return as-is
    if len(text) <= size:
        return [text]

    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = start + size
        if end >= len(text):
            chunks.append(text[start:].strip())
            break

        # Try to break on double newline (paragraph)
        break_at = text.rfind("\n\n", start, end)
        if break_at == -1 or break_at <= start:
            # Try single newline
            break_at = text.rfind("\n", start, end)
        if break_at == -1 or break_at <= start:
            # Try period + space
            break_at = text.rfind(". ", start, end)
            if break_at != -1:
                break_at += 1  # include the period
        if break_at == -1 or break_at <= start:
            break_at = end  # hard cut

        chunk = text[start:break_at].strip()
        if chunk:
            chunks.append(chunk)
        start = break_at - overlap if break_at - overlap > start else break_at

    return [c for c in chunks if c]


# ─── RAG Service ─────────────────────────────────────────────────────────────

class KnowledgeRAG:
    def __init__(self):
        self.embedder = EmbeddingService()
        self._ensure_tables()

    # ── Schema ───────────────────────────────────────────────────────────────

    def _ensure_tables(self):
        """Create tables if they don't exist yet."""
        conn = _get_conn()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS agent_knowledge_chunks (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id   INTEGER NOT NULL,
                    entry_id   TEXT    NOT NULL,
                    entry_title TEXT   NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    chunk_text TEXT    NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_akc_agent ON agent_knowledge_chunks(agent_id);
            """)

            # vec0 virtual table — partition key on agent_id enables fast per-agent filtering
            conn.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS agent_knowledge_vecs USING vec0(
                    agent_id  INTEGER partition key,
                    embedding float[1536]
                );
            """)
            conn.commit()
        finally:
            conn.close()

    # ── Indexing ─────────────────────────────────────────────────────────────

    def index_agent_knowledge(
        self,
        agent_id: int,
        knowledge_base: List[Dict],
    ) -> int:
        """
        Re-index all knowledge entries for an agent.
        Deletes existing chunks/vectors first, then re-embeds everything.

        Returns number of chunks stored.
        """
        conn = _get_conn()
        try:
            # Wipe existing data for this agent
            conn.execute("DELETE FROM agent_knowledge_chunks WHERE agent_id = ?", (agent_id,))
            conn.execute("DELETE FROM agent_knowledge_vecs WHERE agent_id = ?", (agent_id,))
            conn.commit()

            if not knowledge_base:
                return 0

            # Build all chunks across all entries
            all_chunks: List[Tuple[str, str, str, int]] = []  # (entry_id, title, chunk_text, chunk_idx)
            for entry in knowledge_base:
                entry_id    = str(entry.get("id", ""))
                entry_title = entry.get("title", "Untitled")
                content     = entry.get("content", "")
                if not content.strip():
                    continue
                chunks = _chunk_text(content)
                for i, chunk in enumerate(chunks):
                    all_chunks.append((entry_id, entry_title, chunk, i))

            if not all_chunks:
                return 0

            # Embed in batches of 50 (OpenRouter limit)
            batch_size = 50
            chunk_texts = [c[2] for c in all_chunks]
            all_embeddings: List[List[float]] = []

            for i in range(0, len(chunk_texts), batch_size):
                batch = chunk_texts[i : i + batch_size]
                vecs = self.embedder.embed(batch)
                all_embeddings.extend(vecs)

            # Insert metadata + vectors together
            for (entry_id, entry_title, chunk_text, chunk_idx), vec in zip(all_chunks, all_embeddings):
                cur = conn.execute(
                    """INSERT INTO agent_knowledge_chunks
                       (agent_id, entry_id, entry_title, chunk_index, chunk_text)
                       VALUES (?, ?, ?, ?, ?)""",
                    (agent_id, entry_id, entry_title, chunk_idx, chunk_text),
                )
                chunk_row_id = cur.lastrowid

                conn.execute(
                    "INSERT INTO agent_knowledge_vecs (rowid, agent_id, embedding) VALUES (?, ?, ?)",
                    (chunk_row_id, agent_id, _pack(vec)),
                )

            conn.commit()
            print(f"[RAG] Indexed {len(all_chunks)} chunks for agent {agent_id}")
            return len(all_chunks)

        except Exception as e:
            conn.rollback()
            print(f"[RAG] Error indexing agent {agent_id}: {e}")
            raise
        finally:
            conn.close()

    # ── Retrieval ─────────────────────────────────────────────────────────────

    def retrieve(
        self,
        agent_id: int,
        query: str,
        top_k: int = TOP_K_DEFAULT,
    ) -> List[Dict]:
        """
        Embed the query and return the top-k most relevant chunks for this agent.

        Returns list of dicts: {entry_title, chunk_text, distance}
        """
        conn = _get_conn()
        try:
            # Check if this agent has any indexed chunks
            count = conn.execute(
                "SELECT COUNT(*) FROM agent_knowledge_chunks WHERE agent_id = ?",
                (agent_id,),
            ).fetchone()[0]

            if count == 0:
                return []

            query_vec = self.embedder.embed_one(query)

            rows = conn.execute(
                """
                SELECT
                    c.entry_title,
                    c.chunk_text,
                    v.distance
                FROM agent_knowledge_vecs v
                JOIN agent_knowledge_chunks c ON c.id = v.rowid
                WHERE v.agent_id = ?
                  AND v.embedding MATCH ?
                  AND k = ?
                ORDER BY v.distance
                """,
                (agent_id, _pack(query_vec), top_k),
            ).fetchall()

            return [
                {
                    "entry_title": row["entry_title"],
                    "chunk_text":  row["chunk_text"],
                    "distance":    row["distance"],
                }
                for row in rows
            ]

        except Exception as e:
            print(f"[RAG] Error retrieving for agent {agent_id}: {e}")
            return []
        finally:
            conn.close()

    def has_knowledge(self, agent_id: int) -> bool:
        """Quick check — does this agent have any indexed knowledge?"""
        conn = _get_conn()
        try:
            count = conn.execute(
                "SELECT COUNT(*) FROM agent_knowledge_chunks WHERE agent_id = ?",
                (agent_id,),
            ).fetchone()[0]
            return count > 0
        finally:
            conn.close()

    def chunk_count(self, agent_id: int) -> int:
        conn = _get_conn()
        try:
            return conn.execute(
                "SELECT COUNT(*) FROM agent_knowledge_chunks WHERE agent_id = ?",
                (agent_id,),
            ).fetchone()[0]
        finally:
            conn.close()


# ─── Singleton ────────────────────────────────────────────────────────────────
rag_service = KnowledgeRAG()
