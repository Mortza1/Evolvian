"""Get and send execution messages endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from schemas import ExecutionMessageCreate, ExecutionMessageResponse, ExecutionMessagesResponse
from models import User, Team, Operation, ExecutionMessage

router = APIRouter()


@router.get("/{operation_id}/messages", response_model=ExecutionMessagesResponse)
async def get_execution_messages(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all messages for an execution.

    Returns chronological list of all messages in the execution transcript:
    - User messages
    - Agent messages (outputs, questions)
    - Manager reviews and questions
    - System status messages

    Used to populate the execution chat panel in real-time.
    """
    print(f"\n[chat] Get messages for operation {operation_id}")

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

    messages = db.query(ExecutionMessage).filter(
        ExecutionMessage.operation_id == operation_id
    ).order_by(ExecutionMessage.created_at.asc()).all()

    print(f"[chat] Found {len(messages)} messages for operation {operation_id}")

    return ExecutionMessagesResponse(
        messages=messages,
        total_count=len(messages),
        operation_id=operation_id
    )


@router.post("/{operation_id}/messages", response_model=ExecutionMessageResponse)
async def send_execution_message(
    operation_id: int,
    request: ExecutionMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message during execution.

    Allows users to send instructions, questions, or comments to:
    - Current agent (will be injected into next LLM call)
    - Manager (Evo)
    - Specific agent by name

    The message is stored in the execution transcript and can be consumed
    by the execution generator to inject into agent context.
    """
    print(f"\n[chat] User sending message to operation {operation_id}: '{request.content[:50]}...'")

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

    message = ExecutionMessage(
        operation_id=operation_id,
        sender_type="user",
        sender_name=current_user.username,
        sender_id=current_user.id,
        content=request.content,
        message_type=request.message_type,
        context={
            "target": request.target,
            "consumed": False,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    print(f"[chat] Created message {message.id} for operation {operation_id}")

    return message
