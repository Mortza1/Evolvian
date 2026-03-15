"""CRUD endpoints: create, get, list, update, delete operations."""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from database import get_db
from auth import get_current_user
from schemas import OperationCreate, OperationUpdate, OperationResponse, PendingAssumptionResponse, PendingAssumptionsResponse, AgentMessageGroup, AgentMessagesResponse
from models import User, Team, Operation, ExecutionMessage
from core.workflows.execution_state import EXECUTION_REGISTRY, ExecutionSignal

router = APIRouter()


@router.post("/", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
async def create_operation(
    operation_data: OperationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new operation/task"""
    print(f"\n[operations] Creating operation: {operation_data.title}")

    team = db.query(Team).filter(
        Team.id == operation_data.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    agent_ids = []
    workflow_config = {}
    estimated_cost = operation_data.cost

    if operation_data.workflowNodes:
        print(f"[operations] Using workflowNodes format: {len(operation_data.workflowNodes)} nodes")
        agent_ids = [node.agentId for node in operation_data.workflowNodes if node.agentId]
        workflow_config = {
            "nodes": [node.dict() for node in operation_data.workflowNodes]
        }
    elif operation_data.workflow_config:
        print(f"[operations] Using workflow_config format")
        wc = operation_data.workflow_config
        workflow_config = {
            "title": wc.title,
            "description": wc.description,
            "nodes": wc.nodes or [],
            "estimated_time": wc.estimated_time,
            "estimated_cost": wc.estimated_cost
        }
        estimated_cost = wc.estimated_cost or operation_data.cost
        print(f"[operations]   - Title: {wc.title}")
        print(f"[operations]   - Nodes: {len(wc.nodes or [])}")
    else:
        print(f"[operations] No workflow data provided")
        workflow_config = {"nodes": []}

    operation = Operation(
        team_id=operation_data.team_id,
        title=operation_data.title,
        description=operation_data.description,
        status=operation_data.status,
        workflow_config=workflow_config,
        assigned_agent_ids=agent_ids,
        estimated_cost=estimated_cost,
        actual_cost=operation_data.cost,
        started_at=datetime.now(timezone.utc) if operation_data.status == "active" else None
    )

    db.add(operation)
    db.commit()
    db.refresh(operation)

    print(f"[operations] Created operation ID: {operation.id}")
    return operation


@router.get("/", response_model=List[OperationResponse])
async def get_operations(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all operations for a team"""
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    operations = db.query(Operation).filter(
        Operation.team_id == team_id
    ).order_by(Operation.created_at.desc()).all()

    return operations


@router.get("/pending-assumptions", response_model=PendingAssumptionsResponse)
async def get_pending_assumptions(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all operations with pending assumptions (waiting_for_input status).

    Returns operations that are currently paused waiting for user input,
    sorted by waiting time (oldest first = most urgent).

    Used by the Inbox to show pending questions that need attention.
    """
    print(f"\n[pending-assumptions] Getting pending assumptions for team {team_id}")

    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    waiting_operations = db.query(Operation).filter(
        Operation.team_id == team_id,
        Operation.status == "waiting_for_input"
    ).all()

    print(f"[pending-assumptions] Found {len(waiting_operations)} operations waiting for input")

    pending_assumptions = []

    for operation in waiting_operations:
        state = EXECUTION_REGISTRY.get_state(operation.id)

        if state and state.signal == ExecutionSignal.WAITING_FOR_INPUT and state.pending_assumption:
            assumption_data = state.pending_assumption

            agent_name = assumption_data.get("agent_name", "Agent")
            agent_photo = assumption_data.get("agent_photo")

            waiting_since = operation.updated_at or operation.created_at
            waiting_duration = (datetime.now(timezone.utc) - waiting_since.replace(tzinfo=timezone.utc)).total_seconds()

            pending_assumptions.append(PendingAssumptionResponse(
                operation_id=operation.id,
                operation_title=operation.title,
                operation_description=operation.description,
                node_id=assumption_data.get("node_id", ""),
                node_name=assumption_data.get("node_name", ""),
                agent_name=agent_name,
                agent_photo=agent_photo,
                question=assumption_data.get("question", ""),
                context=assumption_data.get("context"),
                options=assumption_data.get("options", []),
                priority=assumption_data.get("priority", "normal"),
                assumption_index=assumption_data.get("assumption_index", 0),
                waiting_since=waiting_since,
                waiting_duration_seconds=int(waiting_duration)
            ))

    pending_assumptions.sort(key=lambda x: x.waiting_since)

    print(f"[pending-assumptions] Returning {len(pending_assumptions)} pending assumptions")

    return PendingAssumptionsResponse(
        pending_assumptions=pending_assumptions,
        total_count=len(pending_assumptions),
        team_id=team_id
    )


@router.get("/agent-messages", response_model=AgentMessagesResponse)
async def get_agent_messages(
    team_id: int,
    agent_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all execution messages for a specific agent across all operations.

    Returns messages grouped by operation, showing the agent's questions,
    outputs, and user interactions. Used by the Inbox specialist chat.
    """
    print(f"\n[agent-messages] Getting messages for agent '{agent_name}' in team {team_id}")

    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    operations = db.query(Operation).filter(
        Operation.team_id == team_id
    ).order_by(Operation.created_at.desc()).all()

    message_groups = []
    total_messages = 0

    for operation in operations:
        messages = db.query(ExecutionMessage).filter(
            ExecutionMessage.operation_id == operation.id
        ).filter(
            (ExecutionMessage.sender_name == agent_name) |
            (ExecutionMessage.sender_type == "user")
        ).order_by(ExecutionMessage.created_at).all()

        if messages:
            message_groups.append(AgentMessageGroup(
                operation_id=operation.id,
                operation_title=operation.title,
                operation_status=operation.status,
                messages=messages,
                created_at=operation.created_at
            ))
            total_messages += len(messages)

    print(f"[agent-messages] Found {len(message_groups)} operations with {total_messages} messages")

    return AgentMessagesResponse(
        message_groups=message_groups,
        total_messages=total_messages,
        agent_name=agent_name,
        team_id=team_id
    )


@router.get("/{operation_id}", response_model=OperationResponse)
async def get_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific operation"""
    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return operation


@router.patch("/{operation_id}", response_model=OperationResponse)
async def update_operation(
    operation_id: int,
    operation_data: OperationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an operation's status, progress, etc."""
    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    update_data = operation_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(operation, field, value)

    if operation_data.status == "completed" and not operation.completed_at:
        operation.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(operation)

    return operation


@router.delete("/{operation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an operation"""
    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    db.delete(operation)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
