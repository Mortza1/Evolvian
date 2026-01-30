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

# Chat Schemas
class ManagerChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    team_id: int
    context: Optional[Dict[str, Any]] = None

class SimpleChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    system_prompt: Optional[str] = None


# Operation/Task Schemas
class WorkflowNode(BaseModel):
    id: str
    agentId: str
    agentName: str
    agentPhoto: str
    agentRole: str
    action: str
    order: int

class OperationCreate(BaseModel):
    team_id: int
    title: str = Field(..., min_length=1, max_length=200)
    description: str
    status: str = "pending"  # pending, active, completed, failed
    progress: int = 0
    cost: float = 0.0
    workflowNodes: List[WorkflowNode]

class OperationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    cost: Optional[float] = None
    current_phase: Optional[str] = None
    output: Optional[str] = None

class OperationResponse(BaseModel):
    id: int
    team_id: int
    title: str
    description: str
    status: str
    workflow_config: Dict[str, Any]
    current_phase: Optional[str]
    assigned_agent_ids: List[Any]
    estimated_cost: float
    actual_cost: float
    estimated_time: int
    actual_time: Optional[int]
    output: Optional[str]
    assumptions: List[Any]
    evolution_events: List[Any]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== EVO SCHEMAS ====================

class EvoChatRequest(BaseModel):
    """Request to chat with Evo"""
    message: str = Field(..., min_length=1)
    team_id: int
    context: Optional[Dict[str, Any]] = None


class EvoChatResponse(BaseModel):
    """Response from Evo chat"""
    success: bool
    response: str
    team_id: int
    timestamp: Optional[str] = None
    error: Optional[str] = None


class EvoTaskAnalysisRequest(BaseModel):
    """Request Evo to analyze a task"""
    task: str = Field(..., min_length=1, description="The task to analyze")
    team_id: int
    context: Optional[str] = None


class EvoSubtask(BaseModel):
    """A subtask identified by Evo"""
    id: str
    title: str
    description: str
    agent_type: Optional[str] = None


class EvoSuggestedAgent(BaseModel):
    """An agent suggested by Evo"""
    role: str
    specialty: str
    reason: str


class EvoTaskAnalysis(BaseModel):
    """Evo's analysis of a task"""
    understanding: str
    subtasks: List[Dict[str, Any]] = []
    suggested_agents: List[Dict[str, Any]] = []
    assumptions: List[str] = []
    questions: List[str] = []
    estimated_complexity: str = "unknown"
    confidence: float = 0.5


class EvoTaskAnalysisResponse(BaseModel):
    """Response from Evo task analysis"""
    success: bool
    analysis: Optional[EvoTaskAnalysis] = None
    raw_response: Optional[str] = None
    team_id: int
    error: Optional[str] = None
    parse_error: Optional[bool] = False


class EvoWorkflowStep(BaseModel):
    """A step in an Evo-suggested workflow"""
    id: str
    name: str
    description: str
    agent_role: Optional[str] = None
    inputs: List[str] = []
    outputs: List[str] = []
    depends_on: List[str] = []


class EvoWorkflowSuggestion(BaseModel):
    """A workflow suggested by Evo"""
    title: str
    description: str
    steps: List[Dict[str, Any]] = []
    estimated_cost: float = 0.0
    estimated_time_minutes: int = 0


class EvoWorkflowRequest(BaseModel):
    """Request Evo to design a workflow"""
    task: str = Field(..., min_length=1)
    team_id: int
    analysis: Optional[Dict[str, Any]] = None


class EvoWorkflowResponse(BaseModel):
    """Response from Evo workflow design"""
    success: bool
    workflow: Optional[EvoWorkflowSuggestion] = None
    raw_response: Optional[str] = None
    error: Optional[str] = None
    parse_error: Optional[bool] = False


# ==================== KNOWLEDGE GRAPH SCHEMAS ====================

class KnowledgeEdge(BaseModel):
    """An edge/relationship between knowledge nodes"""
    target_node_id: int
    relationship_type: str  # e.g., "relates_to", "depends_on", "implements", "contradicts"
    evidence: Optional[str] = None
    strength: float = 1.0  # 0.0 to 1.0


class KnowledgeNodeCreate(BaseModel):
    """Create a new knowledge node"""
    team_id: int
    node_type: str = Field(..., description="entity, policy, risk, agent, document, decision, concept")
    label: str = Field(..., min_length=1, max_length=200)
    description: str
    properties: Dict[str, Any] = {}
    edges: List[KnowledgeEdge] = []
    created_by: str = "user"


class KnowledgeNodeUpdate(BaseModel):
    """Update a knowledge node"""
    label: Optional[str] = None
    description: Optional[str] = None
    node_type: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    is_deprecated: Optional[bool] = None
    deprecation_reason: Optional[str] = None


class KnowledgeNodeResponse(BaseModel):
    """Response for a knowledge node"""
    id: int
    team_id: int
    node_type: str
    label: str
    description: str
    node_metadata: Dict[str, Any]
    properties: Dict[str, Any]
    edges: List[Any]
    evolution_events: List[Any]
    is_deprecated: bool
    deprecation_reason: Optional[str]
    created_at: datetime
    created_by: str

    class Config:
        from_attributes = True


class KnowledgeEdgeCreate(BaseModel):
    """Create an edge between two nodes"""
    source_node_id: int
    target_node_id: int
    relationship_type: str
    evidence: Optional[str] = None
    strength: float = 1.0


class KnowledgeGraphResponse(BaseModel):
    """Full graph response for visualization"""
    nodes: List[KnowledgeNodeResponse]
    edges: List[Dict[str, Any]]


class KnowledgeQueryRequest(BaseModel):
    """RAG query against the knowledge graph"""
    team_id: int
    query: str
    max_results: int = 10


class KnowledgeQueryResult(BaseModel):
    """A single result from knowledge query"""
    node_id: int
    label: str
    description: str
    node_type: str
    relevance_score: float
    related_nodes: List[Dict[str, Any]] = []


class KnowledgeQueryResponse(BaseModel):
    """Response from knowledge graph query"""
    success: bool
    query: str
    results: List[KnowledgeQueryResult] = []
    total_results: int = 0


# ==================== TOOL MARKETPLACE SCHEMAS ====================

class ToolCatalogItem(BaseModel):
    """A tool available in the catalog"""
    id: str  # e.g., "tool-websearch"
    name: str
    description: str
    category: str  # "research", "communication", "data", "dev", "creative"
    icon: str
    pricing_model: str = "per_call"  # "per_call", "monthly", "free"
    price_per_call: float = 0.0
    monthly_price: float = 0.0
    capabilities: List[str] = []
    required_config: List[str] = []  # Config fields needed
    is_premium: bool = False


class ToolInstallRequest(BaseModel):
    """Request to install a tool for a team"""
    team_id: int
    tool_id: str
    configuration: Dict[str, Any] = {}


class ToolConfigureRequest(BaseModel):
    """Request to configure an installed tool"""
    configuration: Dict[str, Any]


class ToolAssignRequest(BaseModel):
    """Request to assign a tool to agents"""
    agent_ids: List[int]


class InstalledToolResponse(BaseModel):
    """Response for an installed tool"""
    id: int
    team_id: int
    tool_id: str
    configuration: Dict[str, Any]
    status: str
    assigned_agent_ids: List[Any]
    usage_policy: Dict[str, Any]
    total_calls: int
    total_cost: float
    last_used_at: Optional[datetime]
    installed_at: datetime

    class Config:
        from_attributes = True


# ==================== AGENT MARKETPLACE SCHEMAS ====================

class MarketplaceAgentTemplate(BaseModel):
    """An agent template available in the marketplace"""
    id: str
    name: str
    role: str
    specialty: str
    description: str
    avatar_url: Optional[str] = None
    level: int = 1
    base_cost_per_hour: float
    skills: List[str] = []
    personality_traits: List[str] = []
    category: str  # "management", "research", "creative", "technical", "operations"
    rating: float = 4.5
    hires_count: int = 0
    is_featured: bool = False
    is_premium: bool = False


class MarketplaceCategoryResponse(BaseModel):
    """A category in the marketplace"""
    id: str
    name: str
    description: str
    icon: str
    agent_count: int


class HireAgentRequest(BaseModel):
    """Request to hire an agent from the marketplace"""
    team_id: int
    template_id: str
    custom_name: Optional[str] = None  # Override default name


# ==================== ASSUMPTIONS INBOX SCHEMAS ====================

class AssumptionCreate(BaseModel):
    """Create a new assumption/question from an agent"""
    team_id: int
    operation_id: Optional[int] = None
    agent_id: Optional[int] = None
    question: str
    context: str = ""
    options: List[str] = []  # Suggested answers
    priority: str = "normal"  # "low", "normal", "high", "critical"


class AssumptionAnswer(BaseModel):
    """Answer to an assumption"""
    answer: str
    save_as_policy: bool = False  # Save this answer as a team policy


class AssumptionResponse(BaseModel):
    """Response for an assumption"""
    id: int
    team_id: int
    operation_id: Optional[int]
    agent_id: Optional[int]
    agent_name: Optional[str]
    question: str
    context: str
    options: List[str]
    answer: Optional[str]
    answered_at: Optional[datetime]
    priority: str
    status: str  # "pending", "answered", "dismissed"
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== USER PREFERENCES SCHEMAS ====================

class UserPreferencesUpdate(BaseModel):
    """Update user preferences"""
    theme: Optional[str] = None  # "light", "dark", "system"
    notifications_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None
    default_team_id: Optional[int] = None
    dashboard_layout: Optional[Dict[str, Any]] = None
    ai_interaction_style: Optional[str] = None  # "concise", "detailed", "conversational"


class UserPreferencesResponse(BaseModel):
    """User preferences response"""
    theme: str = "dark"
    notifications_enabled: bool = True
    email_notifications: bool = True
    default_team_id: Optional[int] = None
    dashboard_layout: Dict[str, Any] = {}
    ai_interaction_style: str = "conversational"


class UserObjectiveCreate(BaseModel):
    """Create a saved objective"""
    title: str
    description: str
    team_id: Optional[int] = None


class UserObjectiveResponse(BaseModel):
    """Response for a saved objective"""
    id: int
    title: str
    description: str
    team_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
