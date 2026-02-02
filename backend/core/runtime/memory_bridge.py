"""
MemoryBridge - Connects agents to memory systems.

This module bridges the gap between:
- Short-term memory (per operation) - stored in ExecutionContext
- Long-term memory (per team) - stored in KnowledgeGraph

The MemoryBridge allows agents to:
1. Query team knowledge before executing tasks
2. Store learnings back to the knowledge graph
3. Access relevant policies, entities, and past decisions
4. Build context-aware prompts

This is how Evolvian absorbs EvoAgentX memory concepts
instead of being swallowed by them.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
from sqlalchemy.orm import Session

# Import will be done at runtime to avoid circular imports
# from models import KnowledgeNode


@dataclass
class MemoryItem:
    """A single item from memory (either short-term or long-term)."""
    key: str
    value: Any
    source: str  # "short_term", "long_term", "policy", "entity", etc.
    relevance_score: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "value": self.value,
            "source": self.source,
            "relevance_score": self.relevance_score,
            "metadata": self.metadata
        }


@dataclass
class KnowledgeContext:
    """
    Aggregated knowledge context for an agent.
    Contains relevant policies, entities, decisions, and other knowledge.
    """
    policies: List[Dict[str, Any]] = field(default_factory=list)
    entities: List[Dict[str, Any]] = field(default_factory=list)
    decisions: List[Dict[str, Any]] = field(default_factory=list)
    documents: List[Dict[str, Any]] = field(default_factory=list)
    risks: List[Dict[str, Any]] = field(default_factory=list)
    concepts: List[Dict[str, Any]] = field(default_factory=list)

    def to_prompt_section(self) -> str:
        """Convert knowledge context to a prompt section for the agent."""
        sections = []

        if self.policies:
            sections.append("## Team Policies")
            for policy in self.policies:
                sections.append(f"- **{policy['label']}**: {policy['description']}")

        if self.entities:
            sections.append("\n## Key Entities")
            for entity in self.entities:
                sections.append(f"- **{entity['label']}**: {entity['description']}")

        if self.decisions:
            sections.append("\n## Past Decisions")
            for decision in self.decisions:
                sections.append(f"- **{decision['label']}**: {decision['description']}")

        if self.risks:
            sections.append("\n## Known Risks")
            for risk in self.risks:
                sections.append(f"- **{risk['label']}**: {risk['description']}")

        if self.documents:
            sections.append("\n## Reference Documents")
            for doc in self.documents:
                sections.append(f"- **{doc['label']}**: {doc['description'][:100]}...")

        if self.concepts:
            sections.append("\n## Domain Concepts")
            for concept in self.concepts:
                sections.append(f"- **{concept['label']}**: {concept['description']}")

        return "\n".join(sections) if sections else ""

    def is_empty(self) -> bool:
        """Check if the context has any content."""
        return not any([
            self.policies, self.entities, self.decisions,
            self.documents, self.risks, self.concepts
        ])

    def to_dict(self) -> dict:
        return {
            "policies": self.policies,
            "entities": self.entities,
            "decisions": self.decisions,
            "documents": self.documents,
            "risks": self.risks,
            "concepts": self.concepts
        }


class ShortTermMemory:
    """
    Short-term memory for a single operation.

    Stores operation-scoped information like:
    - Task goal and description
    - Previous agent outputs
    - Tool results
    - Assumptions and answers

    This is essentially a wrapper around ExecutionContext.memory
    with additional helper methods.
    """

    def __init__(self):
        self._memory: Dict[str, MemoryItem] = {}
        self._history: List[Dict[str, Any]] = []

    def add(self, key: str, value: Any, metadata: Dict[str, Any] = None) -> None:
        """Add an item to short-term memory."""
        item = MemoryItem(
            key=key,
            value=value,
            source="short_term",
            metadata=metadata or {}
        )
        self._memory[key] = item
        self._history.append({
            "action": "add",
            "key": key,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    def get(self, key: str, default: Any = None) -> Any:
        """Get an item from short-term memory."""
        item = self._memory.get(key)
        return item.value if item else default

    def has(self, key: str) -> bool:
        """Check if a key exists in memory."""
        return key in self._memory

    def remove(self, key: str) -> bool:
        """Remove an item from memory."""
        if key in self._memory:
            del self._memory[key]
            self._history.append({
                "action": "remove",
                "key": key,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            return True
        return False

    def get_all(self) -> Dict[str, Any]:
        """Get all items as a simple dict."""
        return {key: item.value for key, item in self._memory.items()}

    def get_items(self) -> List[MemoryItem]:
        """Get all memory items with metadata."""
        return list(self._memory.values())

    def clear(self) -> None:
        """Clear all memory."""
        self._memory.clear()
        self._history.append({
            "action": "clear",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    def to_dict(self) -> dict:
        """Serialize memory to dict."""
        return {
            "items": {key: item.to_dict() for key, item in self._memory.items()},
            "history": self._history
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ShortTermMemory":
        """Restore memory from dict."""
        memory = cls()
        for key, item_data in data.get("items", {}).items():
            memory._memory[key] = MemoryItem(**item_data)
        memory._history = data.get("history", [])
        return memory


class LongTermMemory:
    """
    Long-term memory backed by the team's Knowledge Graph.

    This wraps the KnowledgeNode model and provides:
    - Semantic search across team knowledge
    - Retrieval of policies, entities, decisions
    - Storage of new learnings

    Note: We wrap the knowledge graph instead of using EvoAgentX
    LongTermMemory directly. This keeps Evolvian in control.
    """

    def __init__(self, team_id: int, db: Session):
        self.team_id = team_id
        self.db = db

    def _get_knowledge_node_model(self):
        """Lazy import to avoid circular dependencies."""
        from models import KnowledgeNode
        return KnowledgeNode

    def search(
        self,
        query: str,
        node_types: List[str] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search the knowledge graph for relevant nodes.

        Args:
            query: Search query (keywords)
            node_types: Filter by node types (policy, entity, decision, etc.)
            max_results: Maximum number of results

        Returns:
            List of matching knowledge nodes as dicts
        """
        KnowledgeNode = self._get_knowledge_node_model()

        # Build query
        db_query = self.db.query(KnowledgeNode).filter(
            KnowledgeNode.team_id == self.team_id,
            KnowledgeNode.is_deprecated == False
        )

        if node_types:
            db_query = db_query.filter(KnowledgeNode.node_type.in_(node_types))

        nodes = db_query.all()

        # Simple keyword matching with scoring
        query_lower = query.lower()
        query_words = query_lower.split()

        results = []
        for node in nodes:
            score = 0.0
            label_lower = node.label.lower()
            desc_lower = node.description.lower()

            # Exact phrase match in label
            if query_lower in label_lower:
                score += 0.6

            # Exact phrase match in description
            if query_lower in desc_lower:
                score += 0.3

            # Word-level matching
            for word in query_words:
                if len(word) > 2:  # Skip very short words
                    if word in label_lower:
                        score += 0.2
                    if word in desc_lower:
                        score += 0.1

            if score > 0:
                results.append({
                    "id": node.id,
                    "node_type": node.node_type,
                    "label": node.label,
                    "description": node.description,
                    "properties": node.properties or {},
                    "relevance_score": min(score, 1.0),
                    "created_at": node.created_at.isoformat() if node.created_at else None,
                    "created_by": node.created_by
                })

        # Sort by relevance and limit
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:max_results]

    def get_by_type(
        self,
        node_type: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get all nodes of a specific type."""
        KnowledgeNode = self._get_knowledge_node_model()

        nodes = self.db.query(KnowledgeNode).filter(
            KnowledgeNode.team_id == self.team_id,
            KnowledgeNode.node_type == node_type,
            KnowledgeNode.is_deprecated == False
        ).order_by(KnowledgeNode.created_at.desc()).limit(limit).all()

        return [
            {
                "id": node.id,
                "node_type": node.node_type,
                "label": node.label,
                "description": node.description,
                "properties": node.properties or {},
                "created_at": node.created_at.isoformat() if node.created_at else None,
                "created_by": node.created_by
            }
            for node in nodes
        ]

    def get_policies(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get team policies."""
        return self.get_by_type("policy", limit)

    def get_entities(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get key entities."""
        return self.get_by_type("entity", limit)

    def get_decisions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get past decisions."""
        return self.get_by_type("decision", limit)

    def get_risks(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get known risks."""
        return self.get_by_type("risk", limit)

    def get_documents(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get reference documents."""
        return self.get_by_type("document", limit)

    def get_concepts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get domain concepts."""
        return self.get_by_type("concept", limit)

    def store(
        self,
        node_type: str,
        label: str,
        description: str,
        created_by: str = "system",
        properties: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Store a new knowledge node.

        Args:
            node_type: Type of node (policy, entity, decision, etc.)
            label: Short label/title
            description: Full description
            created_by: Who created this (agent name or "system")
            properties: Additional properties as JSON

        Returns:
            The created node as dict
        """
        KnowledgeNode = self._get_knowledge_node_model()

        node = KnowledgeNode(
            team_id=self.team_id,
            node_type=node_type,
            label=label,
            description=description,
            properties=properties or {},
            created_by=created_by
        )

        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)

        return {
            "id": node.id,
            "node_type": node.node_type,
            "label": node.label,
            "description": node.description,
            "properties": node.properties,
            "created_at": node.created_at.isoformat() if node.created_at else None,
            "created_by": node.created_by
        }


class MemoryBridge:
    """
    The main bridge between agents and memory systems.

    Provides a unified interface for:
    - Short-term memory (operation-scoped)
    - Long-term memory (team knowledge graph)
    - Context building for agent prompts

    Usage:
        bridge = MemoryBridge(team_id=1, db=session)

        # Get knowledge context for a task
        context = bridge.get_knowledge_context(
            task_description="Create a marketing campaign",
            include_policies=True,
            include_entities=True
        )

        # Build prompt section
        prompt_addition = context.to_prompt_section()

        # Search for specific knowledge
        results = bridge.search_knowledge("brand guidelines")

        # Store new learning
        bridge.store_learning(
            node_type="decision",
            label="Chose Instagram for campaign",
            description="Based on target audience analysis...",
            created_by="Brand Strategist"
        )
    """

    def __init__(
        self,
        team_id: int,
        db: Session,
        short_term: ShortTermMemory = None
    ):
        self.team_id = team_id
        self.db = db
        self.short_term = short_term or ShortTermMemory()
        self.long_term = LongTermMemory(team_id, db)

    def get_knowledge_context(
        self,
        task_description: str = None,
        include_policies: bool = True,
        include_entities: bool = True,
        include_decisions: bool = True,
        include_risks: bool = False,
        include_documents: bool = False,
        include_concepts: bool = False,
        search_query: str = None,
        max_per_type: int = 5
    ) -> KnowledgeContext:
        """
        Build a knowledge context for an agent.

        This gathers relevant knowledge from the team's graph
        to provide context for the agent's task.

        Args:
            task_description: The task to find relevant knowledge for
            include_policies: Include team policies
            include_entities: Include key entities
            include_decisions: Include past decisions
            include_risks: Include known risks
            include_documents: Include reference documents
            include_concepts: Include domain concepts
            search_query: Optional specific search query
            max_per_type: Maximum items per type

        Returns:
            KnowledgeContext with relevant knowledge
        """
        context = KnowledgeContext()

        # If a search query is provided, do semantic search
        if search_query or task_description:
            query = search_query or task_description
            search_results = self.long_term.search(query, max_results=max_per_type * 3)

            # Distribute results by type
            for result in search_results:
                node_type = result["node_type"]
                item = {
                    "id": result["id"],
                    "label": result["label"],
                    "description": result["description"],
                    "relevance_score": result["relevance_score"]
                }

                if node_type == "policy" and include_policies:
                    if len(context.policies) < max_per_type:
                        context.policies.append(item)
                elif node_type == "entity" and include_entities:
                    if len(context.entities) < max_per_type:
                        context.entities.append(item)
                elif node_type == "decision" and include_decisions:
                    if len(context.decisions) < max_per_type:
                        context.decisions.append(item)
                elif node_type == "risk" and include_risks:
                    if len(context.risks) < max_per_type:
                        context.risks.append(item)
                elif node_type == "document" and include_documents:
                    if len(context.documents) < max_per_type:
                        context.documents.append(item)
                elif node_type == "concept" and include_concepts:
                    if len(context.concepts) < max_per_type:
                        context.concepts.append(item)

        # Fill in with general items if search didn't find enough
        if include_policies and len(context.policies) < max_per_type:
            for policy in self.long_term.get_policies(max_per_type):
                if not any(p["id"] == policy["id"] for p in context.policies):
                    context.policies.append({
                        "id": policy["id"],
                        "label": policy["label"],
                        "description": policy["description"],
                        "relevance_score": 0.5  # Default relevance
                    })
                    if len(context.policies) >= max_per_type:
                        break

        return context

    def search_knowledge(
        self,
        query: str,
        node_types: List[str] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """Search the knowledge graph."""
        return self.long_term.search(query, node_types, max_results)

    def store_learning(
        self,
        node_type: str,
        label: str,
        description: str,
        created_by: str = "system",
        properties: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Store a new learning in the knowledge graph."""
        return self.long_term.store(
            node_type=node_type,
            label=label,
            description=description,
            created_by=created_by,
            properties=properties
        )

    def get_short_term(self, key: str, default: Any = None) -> Any:
        """Get from short-term memory."""
        return self.short_term.get(key, default)

    def set_short_term(self, key: str, value: Any, metadata: Dict[str, Any] = None) -> None:
        """Set in short-term memory."""
        self.short_term.add(key, value, metadata)

    def build_agent_context(
        self,
        agent_name: str,
        agent_role: str,
        task_name: str,
        task_description: str,
        previous_outputs: Dict[str, str] = None
    ) -> str:
        """
        Build a full context string for an agent prompt.

        This combines:
        - Task information
        - Previous agent outputs
        - Relevant knowledge from the graph

        Returns a formatted string to include in the agent's prompt.
        """
        sections = []

        # Task context
        sections.append(f"## Task: {task_name}")
        sections.append(f"{task_description}")

        # Previous work from team
        if previous_outputs:
            sections.append("\n## Previous Work from Team")
            for prev_agent, prev_output in previous_outputs.items():
                # Truncate long outputs
                output_preview = prev_output[:300] + "..." if len(prev_output) > 300 else prev_output
                sections.append(f"### {prev_agent}")
                sections.append(output_preview)

        # Knowledge context
        knowledge = self.get_knowledge_context(
            task_description=task_description,
            include_policies=True,
            include_entities=True,
            include_decisions=True,
            max_per_type=3
        )

        if not knowledge.is_empty():
            sections.append("\n## Team Knowledge")
            sections.append(knowledge.to_prompt_section())

        return "\n\n".join(sections)

    def extract_and_store_learnings(
        self,
        agent_name: str,
        task_name: str,
        output: str,
        auto_extract: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Extract learnings from agent output and store in knowledge graph.

        This is a simple implementation that stores the output as a decision.
        In the future, this could use NLP to extract specific entities,
        decisions, and insights.

        Args:
            agent_name: Name of the agent that produced the output
            task_name: Name of the task
            output: The agent's output
            auto_extract: Whether to automatically extract and store

        Returns:
            List of stored knowledge nodes
        """
        stored = []

        if auto_extract and len(output) > 50:
            # Store as a decision/insight
            # In future: use NLP to extract specific entities
            node = self.store_learning(
                node_type="decision",
                label=f"Insight from {task_name}",
                description=output[:500] + ("..." if len(output) > 500 else ""),
                created_by=agent_name,
                properties={
                    "task_name": task_name,
                    "full_output_length": len(output),
                    "extracted_at": datetime.now(timezone.utc).isoformat()
                }
            )
            stored.append(node)

        return stored
