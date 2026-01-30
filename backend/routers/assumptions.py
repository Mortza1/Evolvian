"""
Assumptions Router

Handles the Assumptions Inbox - where agents ask clarifying questions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from database import get_db
from auth import get_current_user
from schemas import AssumptionCreate, AssumptionAnswer, AssumptionResponse
from models import User, Team, Agent, Assumption, KnowledgeNode

router = APIRouter(prefix="/api/assumptions", tags=["Assumptions"])


@router.get("", response_model=List[AssumptionResponse])
async def get_assumptions(
    team_id: int,
    status_filter: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending assumptions for a team"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    query = db.query(Assumption).filter(Assumption.team_id == team_id)

    if status_filter:
        query = query.filter(Assumption.status == status_filter)

    assumptions = query.order_by(Assumption.created_at.desc()).all()

    # Add agent names
    result = []
    for a in assumptions:
        agent_name = None
        if a.agent_id:
            agent = db.query(Agent).filter(Agent.id == a.agent_id).first()
            if agent:
                agent_name = agent.name

        result.append(AssumptionResponse(
            id=a.id,
            team_id=a.team_id,
            operation_id=a.operation_id,
            agent_id=a.agent_id,
            agent_name=agent_name,
            question=a.question,
            context=a.context,
            options=a.options,
            answer=a.answer,
            answered_at=a.answered_at,
            priority=a.priority,
            status=a.status,
            created_at=a.created_at
        ))

    return result


@router.get("/pending/count")
async def get_pending_assumptions_count(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the count of pending assumptions for badge display"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    count = db.query(Assumption).filter(
        Assumption.team_id == team_id,
        Assumption.status == "pending"
    ).count()

    return {"count": count}


@router.get("/{assumption_id}", response_model=AssumptionResponse)
async def get_assumption(
    assumption_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific assumption"""
    assumption = db.query(Assumption).filter(Assumption.id == assumption_id).first()

    if not assumption:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assumption not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == assumption.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    agent_name = None
    if assumption.agent_id:
        agent = db.query(Agent).filter(Agent.id == assumption.agent_id).first()
        if agent:
            agent_name = agent.name

    return AssumptionResponse(
        id=assumption.id,
        team_id=assumption.team_id,
        operation_id=assumption.operation_id,
        agent_id=assumption.agent_id,
        agent_name=agent_name,
        question=assumption.question,
        context=assumption.context,
        options=assumption.options,
        answer=assumption.answer,
        answered_at=assumption.answered_at,
        priority=assumption.priority,
        status=assumption.status,
        created_at=assumption.created_at
    )


@router.post("", response_model=AssumptionResponse, status_code=status.HTTP_201_CREATED)
async def create_assumption(
    assumption_data: AssumptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new assumption (agent asks a question)"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == assumption_data.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    assumption = Assumption(
        team_id=assumption_data.team_id,
        operation_id=assumption_data.operation_id,
        agent_id=assumption_data.agent_id,
        question=assumption_data.question,
        context=assumption_data.context,
        options=assumption_data.options,
        priority=assumption_data.priority,
        status="pending"
    )

    db.add(assumption)
    db.commit()
    db.refresh(assumption)

    agent_name = None
    if assumption.agent_id:
        agent = db.query(Agent).filter(Agent.id == assumption.agent_id).first()
        if agent:
            agent_name = agent.name

    return AssumptionResponse(
        id=assumption.id,
        team_id=assumption.team_id,
        operation_id=assumption.operation_id,
        agent_id=assumption.agent_id,
        agent_name=agent_name,
        question=assumption.question,
        context=assumption.context,
        options=assumption.options,
        answer=assumption.answer,
        answered_at=assumption.answered_at,
        priority=assumption.priority,
        status=assumption.status,
        created_at=assumption.created_at
    )


@router.post("/{assumption_id}/answer", response_model=AssumptionResponse)
async def answer_assumption(
    assumption_id: int,
    answer_data: AssumptionAnswer,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Answer an assumption"""
    assumption = db.query(Assumption).filter(Assumption.id == assumption_id).first()

    if not assumption:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assumption not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == assumption.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    assumption.answer = answer_data.answer
    assumption.answered_at = datetime.now(timezone.utc)
    assumption.status = "answered"

    # If save_as_policy, create a knowledge node
    if answer_data.save_as_policy:
        policy_node = KnowledgeNode(
            team_id=assumption.team_id,
            node_type="policy",
            label=f"Policy: {assumption.question[:50]}...",
            description=f"Q: {assumption.question}\nA: {answer_data.answer}",
            created_by="user"
        )
        db.add(policy_node)

    db.commit()
    db.refresh(assumption)

    agent_name = None
    if assumption.agent_id:
        agent = db.query(Agent).filter(Agent.id == assumption.agent_id).first()
        if agent:
            agent_name = agent.name

    return AssumptionResponse(
        id=assumption.id,
        team_id=assumption.team_id,
        operation_id=assumption.operation_id,
        agent_id=assumption.agent_id,
        agent_name=agent_name,
        question=assumption.question,
        context=assumption.context,
        options=assumption.options,
        answer=assumption.answer,
        answered_at=assumption.answered_at,
        priority=assumption.priority,
        status=assumption.status,
        created_at=assumption.created_at
    )


@router.post("/{assumption_id}/dismiss")
async def dismiss_assumption(
    assumption_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dismiss an assumption"""
    assumption = db.query(Assumption).filter(Assumption.id == assumption_id).first()

    if not assumption:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assumption not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == assumption.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    assumption.status = "dismissed"
    db.commit()

    return {"success": True, "message": "Assumption dismissed"}
