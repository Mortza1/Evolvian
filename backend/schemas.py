from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None


# Team Schemas
class TeamSettings(BaseModel):
    dailyBudgetCap: Optional[float] = None
    requireApprovalThreshold: Optional[float] = None
    timezone: str = "America/New_York"
    workingHours: Optional[Dict[str, str]] = None

class TeamStats(BaseModel):
    totalAgents: int = 0
    activeAgents: int = 0
    totalOperations: int = 0
    operationsThisWeek: int = 0
    totalSpend: float = 0.0
    spendThisMonth: float = 0.0
    avgOperationCost: float = 0.0

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: str = "🏢"
    color: str = "#6366F1"
    settings: Optional[TeamSettings] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    settings: Optional[TeamSettings] = None
    stats: Optional[TeamStats] = None
    status: Optional[str] = None

class TeamResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon: str
    color: str
    created_at: datetime
    settings: Dict[str, Any]
    stats: Dict[str, Any]
    status: str

    class Config:
        from_attributes = True


# Agent Schemas
class AgentCreate(BaseModel):
    team_id: int
    name: str = Field(..., min_length=1, max_length=100)
    role: str
    specialty: str
    level: int = 1
    photo_url: Optional[str] = None
    avatar_seed: Optional[str] = None
    rating: float = 4.0
    cost_per_hour: float = 12.0
    skills: List[str] = []
    personality_traits: List[str] = []

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    specialty: Optional[str] = None
    level: Optional[int] = None
    photo_url: Optional[str] = None
    rating: Optional[float] = None
    tasks_completed: Optional[int] = None
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    cost_per_hour: Optional[float] = None
    status: Optional[str] = None
    is_online: Optional[bool] = None
    skills: Optional[List[str]] = None
    personality_traits: Optional[List[str]] = None
    tools_access: Optional[List[str]] = None
    experience_points: Optional[int] = None

class AgentResponse(BaseModel):
    id: int
    team_id: int
    name: str
    role: str
    specialty: str
    level: int
    photo_url: Optional[str]
    avatar_seed: Optional[str]
    rating: float
    tasks_completed: int
    accuracy: float
    speed: float
    cost_per_hour: float
    status: str
    is_online: bool
    skills: List[Any]
    personality_traits: List[Any]
    tools_access: List[Any]
    experience_points: int
    evolution_history: List[Any]
    hired_at: datetime
    last_active_at: Optional[datetime]

    class Config:
        from_attributes = True
