"""rate_operation endpoint."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from schemas import RatingRequest, RatingResponse
from models import User, Team, Operation, WorkflowExecution
from core.runtime import QualityEvaluator

router = APIRouter()


@router.post("/{operation_id}/rate", response_model=RatingResponse)
async def rate_operation(
    operation_id: int,
    rating_data: RatingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rate a completed operation's output (1-5 stars + optional feedback).

    This is Layer 3 of the hybrid quality scoring system.
    When a user rating is provided, it recalculates the hybrid quality_score
    using: 0.6 * user_normalized + 0.3 * llm_judge + 0.1 * proxy
    """
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

    workflow_exec = db.query(WorkflowExecution).filter(
        WorkflowExecution.operation_id == operation_id
    ).order_by(WorkflowExecution.created_at.desc()).first()

    if not workflow_exec:
        workflow_exec = WorkflowExecution(
            operation_id=operation_id,
            status="completed",
            proxy_score=0.5,
        )
        db.add(workflow_exec)
        db.flush()

    workflow_exec.user_rating = rating_data.rating
    workflow_exec.user_feedback = rating_data.feedback

    new_quality = QualityEvaluator.compute_hybrid_score(
        proxy_score=workflow_exec.proxy_score or 0.5,
        llm_judge_score=workflow_exec.llm_judge_score,
        user_rating=rating_data.rating,
    )
    workflow_exec.quality_score = new_quality

    db.commit()

    print(f"[rate] Operation {operation_id} rated {rating_data.rating}/5 -> quality_score={new_quality:.3f}")

    return RatingResponse(
        success=True,
        operation_id=operation_id,
        rating=rating_data.rating,
        quality_score=new_quality,
        message=f"Rating saved. Quality score updated to {new_quality:.2f}",
    )
