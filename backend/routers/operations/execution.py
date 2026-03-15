"""/execute and /execute-hierarchical endpoints."""

import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import User, Team, Operation, Agent

from .engine import generate_execution_events
from .hierarchical import generate_hierarchical_execution_events

router = APIRouter()


@router.post("/{operation_id}/execute")
async def execute_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute an operation with real-time SSE streaming.

    Returns a stream of events:
    - start: Execution started
    - node_start: Node execution started
    - tool_use: Agent using a tool
    - progress: Progress update
    - llm_call: LLM being called
    - node_complete: Node finished
    - agent_xp: Agent gained XP
    - complete: Execution finished
    - error: Error occurred
    """
    print(f"\n[execute] Execute request for operation {operation_id}")

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

    agents = db.query(Agent).filter(Agent.team_id == operation.team_id).all()

    return StreamingResponse(
        generate_execution_events(operation, team, agents, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/{operation_id}/execute-hierarchical")
async def execute_operation_hierarchical(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute an operation using the hierarchical multi-agent engine.

    Automatically builds a Supervisor + specialist worker team from the
    operation's task description, then runs:
      Supervisor decomposes → delegates to workers → reviews → revises → approves

    Returns the same SSE event stream as /execute, plus hierarchy-specific events:
      - hierarchy_decompose: Supervisor breaking down the task
      - hierarchy_delegate: Assigning subtasks to workers
      - hierarchy_worker_start/complete: Worker execution
      - hierarchy_escalate: Worker output escalated to supervisor
      - hierarchy_review: Supervisor reviewing outputs
      - hierarchy_revise: Requesting revisions
      - hierarchy_complete: Final output produced
    """
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operation not found")

    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    agents = db.query(Agent).filter(Agent.team_id == operation.team_id).all()

    return StreamingResponse(
        generate_hierarchical_execution_events(operation, team, agents, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
