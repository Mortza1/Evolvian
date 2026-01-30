"""
Chat Router

Handles chat endpoints for LLM interactions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from schemas import ManagerChatRequest, SimpleChatRequest
from models import User, Team, Agent, ChatMessage
from llm_service import llm_service, ChatCompletionRequest

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/completion")
async def chat_completion(
    request: ChatCompletionRequest,
    _current_user: User = Depends(get_current_user)
):
    """
    Send a chat completion request to the LLM

    This endpoint allows authenticated users to have conversations with the AI.
    Supports multi-turn conversations by sending message history.
    """
    try:
        result = llm_service.chat_completion(
            messages=request.messages,
            model=request.model,
            temperature=request.temperature or 0.7,
            max_tokens=request.max_tokens,
            stream=request.stream or False
        )

        return {
            "success": True,
            "response": result.response,
            "model": result.model,
            "usage": result.usage
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM API error: {str(e)}"
        )


@router.post("/simple")
async def simple_chat(
    request: SimpleChatRequest,
    _current_user: User = Depends(get_current_user)
):
    """
    Simple single-turn chat endpoint

    Send a single message and get a response.
    Optionally include a system prompt to set context.
    """
    try:
        response = llm_service.simple_chat(
            user_message=request.message,
            system_prompt=request.system_prompt
        )

        return {
            "success": True,
            "response": response
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM API error: {str(e)}"
        )


@router.post("/manager")
async def manager_chat(
    request: ManagerChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with the AI Manager for a specific team

    This endpoint provides context-aware chat for team management,
    including information about agents, operations, and team stats.
    """
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == request.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Save user message to database (skip if it's an initial message)
    is_initial = request.context and request.context.get("isInitial", False)
    if not is_initial:
        user_message = ChatMessage(
            team_id=request.team_id,
            user_id=current_user.id,
            role="user",
            content=request.message,
            context=request.context or {}
        )
        db.add(user_message)
        db.commit()

    # Get team context
    agents = db.query(Agent).filter(Agent.team_id == request.team_id).all()
    agent_count = len(agents)

    # Check if a custom system prompt is provided in context (for Aria, etc.)
    if request.context and "systemPrompt" in request.context:
        system_prompt = request.context["systemPrompt"]
    else:
        # Build default system prompt with team context
        system_prompt = f"""You are an AI Manager assistant for the Evolvian platform.
You're helping manage a team called "{team.name}".

Team Information:
- Team: {team.name}
- Description: {team.description or 'No description'}
- Total Agents: {agent_count}
- Team Status: {team.status}

Your role is to:
1. Help with team management and operations
2. Provide insights about agent performance
3. Suggest optimizations for workflows
4. Answer questions about the platform
5. Assist with hiring and managing AI agents

Be helpful, professional, and concise. Focus on actionable insights."""

    try:
        response = llm_service.simple_chat(
            user_message=request.message,
            system_prompt=system_prompt
        )

        # Save assistant response to database with context
        assistant_message = ChatMessage(
            team_id=request.team_id,
            user_id=current_user.id,
            role="manager",
            content=response,
            context=request.context or {}
        )
        db.add(assistant_message)
        db.commit()

        return {
            "success": True,
            "response": response,
            "team_id": request.team_id,
            "team_name": team.name
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM API error: {str(e)}"
        )


@router.get("/history/{team_id}")
async def get_chat_history(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """
    Get chat message history for a specific team

    Returns the most recent messages (default: 50)
    """
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

    # Get chat messages for this team
    messages = db.query(ChatMessage).filter(
        ChatMessage.team_id == team_id,
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.asc()).limit(limit).all()

    return {
        "success": True,
        "team_id": team_id,
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "context": msg.context
            }
            for msg in messages
        ]
    }
