"""Pause, cancel, resume, status, and respond-to-assumption endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from schemas import ExecutionControlResponse, AssumptionResponseRequest, AssumptionResponseResponse
from models import User, Team, Operation, Agent
from core.workflows.execution_state import EXECUTION_REGISTRY
from core.runtime import ExecutionContext

from .engine import generate_execution_events

router = APIRouter()


@router.get("/{operation_id}/status")
async def get_operation_status(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed execution status of an operation"""
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

    workflow_config = operation.workflow_config or {}
    nodes = workflow_config.get("nodes", [])

    completed_nodes = sum(1 for n in nodes if n.get("status") == "completed")
    failed_nodes = sum(1 for n in nodes if n.get("status") == "failed")
    progress = (completed_nodes / len(nodes) * 100) if nodes else 0

    return {
        "operation_id": operation.id,
        "status": operation.status,
        "progress": progress,
        "nodes_total": len(nodes),
        "nodes_completed": completed_nodes,
        "nodes_failed": failed_nodes,
        "workflow_config": workflow_config,
        "started_at": operation.started_at.isoformat() if operation.started_at else None,
        "completed_at": operation.completed_at.isoformat() if operation.completed_at else None,
        "actual_cost": operation.actual_cost,
        "execution_checkpoint": operation.execution_checkpoint,
        "is_running": EXECUTION_REGISTRY.is_registered(operation.id),
    }


@router.post("/{operation_id}/pause", response_model=ExecutionControlResponse)
async def pause_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Request pause at next node boundary.
    The execution will complete the current node, then pause.
    """
    print(f"\n[control] Pause request for operation {operation_id}")

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

    if operation.status == "paused":
        return ExecutionControlResponse(
            success=True,
            status="already_paused",
            message="Operation is already paused",
            operation_id=operation_id,
            checkpoint=operation.execution_checkpoint
        )

    if not EXECUTION_REGISTRY.is_registered(operation_id):
        return ExecutionControlResponse(
            success=False,
            status="not_running",
            message="Operation is not currently running",
            operation_id=operation_id
        )

    if EXECUTION_REGISTRY.request_pause(operation_id):
        return ExecutionControlResponse(
            success=True,
            status="pause_requested",
            message="Pause requested. Will pause after current node completes.",
            operation_id=operation_id
        )
    else:
        return ExecutionControlResponse(
            success=False,
            status="pause_failed",
            message="Could not pause operation. It may have already completed or been cancelled.",
            operation_id=operation_id
        )


@router.post("/{operation_id}/cancel", response_model=ExecutionControlResponse)
async def cancel_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a running or paused operation.
    If running, will cancel at next node boundary.
    If paused, will immediately mark as cancelled.
    """
    print(f"\n[control] Cancel request for operation {operation_id}")

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

    if operation.status == "cancelled":
        return ExecutionControlResponse(
            success=True,
            status="already_cancelled",
            message="Operation is already cancelled",
            operation_id=operation_id
        )

    if operation.status == "paused":
        operation.status = "cancelled"
        db.commit()
        return ExecutionControlResponse(
            success=True,
            status="cancelled",
            message="Paused operation has been cancelled",
            operation_id=operation_id,
            checkpoint=operation.execution_checkpoint
        )

    if EXECUTION_REGISTRY.is_registered(operation_id):
        if EXECUTION_REGISTRY.request_cancel(operation_id):
            return ExecutionControlResponse(
                success=True,
                status="cancel_requested",
                message="Cancel requested. Will cancel after current node completes.",
                operation_id=operation_id
            )
        else:
            return ExecutionControlResponse(
                success=False,
                status="cancel_failed",
                message="Could not cancel operation",
                operation_id=operation_id
            )

    if operation.status in ("completed", "failed"):
        return ExecutionControlResponse(
            success=False,
            status="already_finished",
            message=f"Operation has already {operation.status}",
            operation_id=operation_id
        )

    operation.status = "cancelled"
    db.commit()
    return ExecutionControlResponse(
        success=True,
        status="cancelled",
        message="Pending operation has been cancelled",
        operation_id=operation_id
    )


@router.post("/{operation_id}/assumption/respond", response_model=AssumptionResponseResponse)
async def respond_to_assumption(
    operation_id: int,
    request: AssumptionResponseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Provide an answer to a pending assumption during execution.

    The execution generator is waiting for this answer and will resume
    automatically once the answer is provided.
    """
    print(f"\n[control] Assumption response for operation {operation_id}: '{request.answer}'")

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

    if operation.status != "waiting_for_input":
        return AssumptionResponseResponse(
            success=False,
            message=f"Operation is not waiting for input (current status: {operation.status})",
            operation_id=operation_id,
            resumed=False
        )

    if not EXECUTION_REGISTRY.is_waiting_for_input(operation_id):
        return AssumptionResponseResponse(
            success=False,
            message="Operation is not waiting for assumption response in execution registry",
            operation_id=operation_id,
            resumed=False
        )

    if EXECUTION_REGISTRY.provide_input(operation_id, request.answer):
        return AssumptionResponseResponse(
            success=True,
            message="Answer provided. Execution will resume.",
            operation_id=operation_id,
            resumed=True
        )
    else:
        return AssumptionResponseResponse(
            success=False,
            message="Failed to provide answer. Execution state may have changed.",
            operation_id=operation_id,
            resumed=False
        )


@router.post("/{operation_id}/resume")
async def resume_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resume a paused operation.
    Returns an SSE stream starting from the checkpoint position.
    """
    print(f"\n[control] Resume request for operation {operation_id}")

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

    if operation.status != "paused":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume: operation status is '{operation.status}', not 'paused'"
        )

    checkpoint = operation.execution_checkpoint
    if not checkpoint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No checkpoint found for paused operation"
        )

    existing_context = None
    try:
        existing_context = ExecutionContext.from_checkpoint(checkpoint)
        print(f"[control] Restored ExecutionContext from checkpoint")
    except Exception as e:
        print(f"[control] Could not restore context: {e}, will create new one")

    start_index = checkpoint.get("current_node_index", 0)

    agents = db.query(Agent).filter(Agent.team_id == operation.team_id).all()

    print(f"[control] Resuming from node index {start_index}")

    return StreamingResponse(
        generate_execution_events(
            operation, team, agents, db,
            start_index=start_index,
            is_resume=True,
            existing_context=existing_context
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
