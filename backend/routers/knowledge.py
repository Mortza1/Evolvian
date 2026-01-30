"""
Knowledge Graph Router

Handles knowledge nodes, edges, graph retrieval, and RAG queries.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from schemas import (
    KnowledgeNodeCreate, KnowledgeNodeUpdate, KnowledgeNodeResponse,
    KnowledgeEdgeCreate, KnowledgeGraphResponse,
    KnowledgeQueryRequest, KnowledgeQueryResponse, KnowledgeQueryResult
)
from models import User, Team, KnowledgeNode

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Graph"])


@router.post("/nodes", response_model=KnowledgeNodeResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_node(
    node_data: KnowledgeNodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new knowledge node"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == node_data.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Convert edges to JSON-serializable format
    edges_data = [edge.dict() for edge in node_data.edges]

    node = KnowledgeNode(
        team_id=node_data.team_id,
        node_type=node_data.node_type,
        label=node_data.label,
        description=node_data.description,
        properties=node_data.properties,
        edges=edges_data,
        created_by=node_data.created_by
    )

    db.add(node)
    db.commit()
    db.refresh(node)

    return node


@router.get("/nodes", response_model=List[KnowledgeNodeResponse])
async def get_knowledge_nodes(
    team_id: int,
    node_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all knowledge nodes for a team"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    query = db.query(KnowledgeNode).filter(KnowledgeNode.team_id == team_id)

    if node_type:
        query = query.filter(KnowledgeNode.node_type == node_type)

    nodes = query.order_by(KnowledgeNode.created_at.desc()).all()
    return nodes


@router.get("/nodes/{node_id}", response_model=KnowledgeNodeResponse)
async def get_knowledge_node(
    node_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific knowledge node"""
    node = db.query(KnowledgeNode).filter(KnowledgeNode.id == node_id).first()

    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == node.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return node


@router.put("/nodes/{node_id}", response_model=KnowledgeNodeResponse)
async def update_knowledge_node(
    node_id: int,
    node_data: KnowledgeNodeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a knowledge node"""
    node = db.query(KnowledgeNode).filter(KnowledgeNode.id == node_id).first()

    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == node.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Update fields
    update_data = node_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(node, field, value)

    db.commit()
    db.refresh(node)

    return node


@router.delete("/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_node(
    node_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a knowledge node"""
    node = db.query(KnowledgeNode).filter(KnowledgeNode.id == node_id).first()

    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == node.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(node)
    db.commit()

    return None


@router.post("/edges")
async def create_knowledge_edge(
    edge_data: KnowledgeEdgeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create an edge between two knowledge nodes"""
    # Get source node
    source_node = db.query(KnowledgeNode).filter(KnowledgeNode.id == edge_data.source_node_id).first()
    if not source_node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source node not found")

    # Get target node
    target_node = db.query(KnowledgeNode).filter(KnowledgeNode.id == edge_data.target_node_id).first()
    if not target_node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target node not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == source_node.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Add edge to source node
    edges = source_node.edges or []
    new_edge = {
        "target_node_id": edge_data.target_node_id,
        "relationship_type": edge_data.relationship_type,
        "evidence": edge_data.evidence,
        "strength": edge_data.strength
    }
    edges.append(new_edge)
    source_node.edges = edges

    db.commit()

    return {"success": True, "message": "Edge created"}


@router.get("/graph/{team_id}", response_model=KnowledgeGraphResponse)
async def get_knowledge_graph(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the full knowledge graph for a team"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    nodes = db.query(KnowledgeNode).filter(KnowledgeNode.team_id == team_id).all()

    # Build edges list from all nodes
    all_edges = []
    for node in nodes:
        for edge in (node.edges or []):
            all_edges.append({
                "source": node.id,
                "target": edge.get("target_node_id"),
                "type": edge.get("relationship_type"),
                "evidence": edge.get("evidence"),
                "strength": edge.get("strength", 1.0)
            })

    return KnowledgeGraphResponse(nodes=nodes, edges=all_edges)


@router.post("/query", response_model=KnowledgeQueryResponse)
async def query_knowledge_graph(
    query_data: KnowledgeQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """RAG query against the knowledge graph (simple keyword search for now)"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == query_data.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Simple keyword search (can be enhanced with embeddings later)
    query_lower = query_data.query.lower()
    nodes = db.query(KnowledgeNode).filter(KnowledgeNode.team_id == query_data.team_id).all()

    results = []
    for node in nodes:
        # Simple relevance scoring based on keyword match
        score = 0.0
        if query_lower in node.label.lower():
            score += 0.6
        if query_lower in node.description.lower():
            score += 0.4

        if score > 0:
            results.append(KnowledgeQueryResult(
                node_id=node.id,
                label=node.label,
                description=node.description,
                node_type=node.node_type,
                relevance_score=min(score, 1.0),
                related_nodes=[]
            ))

    # Sort by relevance and limit
    results.sort(key=lambda x: x.relevance_score, reverse=True)
    results = results[:query_data.max_results]

    return KnowledgeQueryResponse(
        success=True,
        query=query_data.query,
        results=results,
        total_results=len(results)
    )
