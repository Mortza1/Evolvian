"""
Agents Router

Handles agent CRUD operations for teams.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from schemas import AgentCreate, AgentUpdate, AgentResponse
from models import User, Team, Agent
from rag_service import rag_service

router = APIRouter(prefix="/api", tags=["Agents"])


@router.post("/agents", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    agent_data: AgentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new agent for a team"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == agent_data.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    new_agent = Agent(
        team_id=agent_data.team_id,
        name=agent_data.name,
        role=agent_data.role,
        specialty=agent_data.specialty,
        level=agent_data.level,
        photo_url=agent_data.photo_url,
        avatar_seed=agent_data.avatar_seed,
        rating=agent_data.rating,
        cost_per_hour=agent_data.cost_per_hour,
        skills=agent_data.skills,
        personality_traits=agent_data.personality_traits,
        # Intelligence
        system_prompt=agent_data.system_prompt,
        model_id=agent_data.model_id,
        seniority_level=agent_data.seniority_level,
        can_delegate=agent_data.can_delegate,
        delegates_to=agent_data.delegates_to,
        can_ask_questions=agent_data.can_ask_questions,
        knowledge_base=[e.dict() if hasattr(e, 'dict') else e for e in (agent_data.knowledge_base or [])],
    )

    db.add(new_agent)

    # Update team stats
    team.stats["totalAgents"] = team.stats.get("totalAgents", 0) + 1

    db.commit()
    db.refresh(new_agent)

    # Index knowledge base in background (non-blocking)
    if new_agent.knowledge_base:
        try:
            rag_service.index_agent_knowledge(new_agent.id, new_agent.knowledge_base)
        except Exception as e:
            print(f"[agents] RAG indexing failed for agent {new_agent.id}: {e}")

    return new_agent


@router.get("/teams/{team_id}/agents", response_model=List[AgentResponse])
async def get_team_agents(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all agents for a specific team"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    agents = db.query(Agent).filter(Agent.team_id == team_id).all()
    return agents


@router.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific agent by ID"""
    agent = db.query(Agent).join(Team).filter(
        Agent.id == agent_id,
        Team.user_id == current_user.id
    ).first()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )

    return agent


@router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    agent_data: AgentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an agent"""
    agent = db.query(Agent).join(Team).filter(
        Agent.id == agent_id,
        Team.user_id == current_user.id
    ).first()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )

    # Update fields if provided
    update_data = agent_data.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(agent, key, value)

    db.commit()
    db.refresh(agent)

    # Re-index knowledge base if it was updated
    if "knowledge_base" in update_data:
        try:
            rag_service.index_agent_knowledge(agent.id, agent.knowledge_base or [])
        except Exception as e:
            print(f"[agents] RAG re-indexing failed for agent {agent.id}: {e}")

    return agent


@router.delete("/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an agent"""
    agent = db.query(Agent).join(Team).filter(
        Agent.id == agent_id,
        Team.user_id == current_user.id
    ).first()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )

    # Update team stats
    team = db.query(Team).filter(Team.id == agent.team_id).first()
    if team:
        team.stats["totalAgents"] = max(0, team.stats.get("totalAgents", 1) - 1)

    db.delete(agent)
    db.commit()

    return None
