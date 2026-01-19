from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from auth import (
    authenticate_user,
    create_user,
    create_access_token,
    get_current_user,
    get_user_by_email,
    get_user_by_username,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    TeamCreate, TeamUpdate, TeamResponse,
    AgentCreate, AgentUpdate, AgentResponse,
    ManagerChatRequest, SimpleChatRequest
)
from llm_service import llm_service, ChatMessage as LLMChatMessage, ChatCompletionRequest
from database import get_db, engine, Base
from models import User, Team, Agent, Operation, KnowledgeNode, InstalledTool, ChatMessage
from typing import List

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Evolvian API", version="1.0.0")

# CORS middleware - allows frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Set-Cookie"],
    max_age=3600,
)

@app.get("/")
def read_root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Evolvian API is running"}

@app.post("/api/auth/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, response: Response, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if email already exists
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    existing_username = get_user_by_username(db, user_data.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user
    user = create_user(
        db=db,
        email=user_data.email,
        username=user_data.username,
        password=user_data.password
    )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    # Set cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )

    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    """Login and get access token"""
    user = authenticate_user(db, credentials.email, credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    # Set cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )

    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/logout")
async def logout(response: Response):
    """Logout by clearing the auth cookie"""
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@app.get("/api/auth/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    """Verify if token is valid"""
    return {"valid": True, "user": {"email": current_user.email, "username": current_user.username}}


# ==================== TEAM ENDPOINTS ====================

@app.post("/api/teams", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new team for the current user"""
    # Convert settings to dict
    settings_dict = team_data.settings.dict() if team_data.settings else {}

    # Initialize default stats
    stats_dict = {
        "totalAgents": 0,
        "activeAgents": 0,
        "totalOperations": 0,
        "operationsThisWeek": 0,
        "totalSpend": 0.0,
        "spendThisMonth": 0.0,
        "avgOperationCost": 0.0
    }

    new_team = Team(
        user_id=current_user.id,
        name=team_data.name,
        description=team_data.description,
        icon=team_data.icon,
        color=team_data.color,
        settings=settings_dict,
        stats=stats_dict,
        status="active"
    )

    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    return new_team


@app.get("/api/teams", response_model=List[TeamResponse])
async def get_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all teams for the current user"""
    teams = db.query(Team).filter(Team.user_id == current_user.id).all()
    return teams


@app.get("/api/teams/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific team by ID"""
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    return team


@app.put("/api/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a team"""
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Update fields if provided
    update_data = team_data.dict(exclude_unset=True)

    # Handle settings separately
    if "settings" in update_data and update_data["settings"]:
        update_data["settings"] = update_data["settings"].dict() if hasattr(update_data["settings"], "dict") else update_data["settings"]

    # Handle stats separately
    if "stats" in update_data and update_data["stats"]:
        update_data["stats"] = update_data["stats"].dict() if hasattr(update_data["stats"], "dict") else update_data["stats"]

    for key, value in update_data.items():
        setattr(team, key, value)

    db.commit()
    db.refresh(team)

    return team


@app.delete("/api/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a team"""
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    db.delete(team)
    db.commit()

    return None


# ==================== AGENT ENDPOINTS ====================

@app.post("/api/agents", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
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
        personality_traits=agent_data.personality_traits
    )

    db.add(new_agent)

    # Update team stats
    team.stats["totalAgents"] = team.stats.get("totalAgents", 0) + 1

    db.commit()
    db.refresh(new_agent)

    return new_agent


@app.get("/api/teams/{team_id}/agents", response_model=List[AgentResponse])
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


@app.get("/api/agents/{agent_id}", response_model=AgentResponse)
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


@app.put("/api/agents/{agent_id}", response_model=AgentResponse)
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

    return agent


@app.delete("/api/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
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


# ==================== CHAT ENDPOINTS ====================

@app.post("/api/chat/completion")
async def chat_completion(
    request: ChatCompletionRequest,
    current_user: User = Depends(get_current_user)
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


@app.post("/api/chat/simple")
async def simple_chat(
    request: SimpleChatRequest,
    current_user: User = Depends(get_current_user)
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


@app.post("/api/chat/manager")
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


@app.get("/api/chat/history/{team_id}")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
