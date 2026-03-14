from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal

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
    """
    Team-level configuration settings.

    Budget & Approval Settings:
    - dailyBudgetCap: Maximum spend per day (optional)
    - requireApprovalThreshold: Cost threshold requiring manual approval (optional)

    Time & Scheduling:
    - timezone: Team's timezone for scheduling (default: America/New_York)
    - workingHours: Operating hours configuration (optional)

    Manager Autonomy Settings (Phase 2.2):
    - manager_review_frequency: How often Evo reviews agent outputs
        * "every_node": Review after every single node (maximum oversight)
        * "every_2_nodes": Review after every 2nd node (default, balanced)
        * "first_and_last": Review only first and last nodes (minimal oversight)
        * "never": Disable manager reviews (agents work autonomously)

    - auto_assumption_threshold: Confidence threshold for raising assumptions (0.0-1.0)
        * Lower values = more cautious, more questions asked
        * Higher values = more autonomous, fewer interruptions
        * Default: 0.7 (raise assumptions when confidence < 70%)
        * Note: This setting is for future use when agents report confidence scores
    """
    dailyBudgetCap: Optional[float] = None
    requireApprovalThreshold: Optional[float] = None
    timezone: str = "America/New_York"
    workingHours: Optional[Dict[str, str]] = None

    # Manager Autonomy Settings (Phase 2.2)
    manager_review_frequency: Literal["every_node", "every_2_nodes", "first_and_last", "never"] = Field(
        default="every_2_nodes",
        description="How often Evo reviews agent outputs"
    )
    auto_assumption_threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Confidence threshold below which agents should raise assumptions (0.0-1.0). Lower = more cautious."
    )

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
    # Intelligence
    system_prompt: Optional[str] = None
    model_id: Optional[str] = None
    seniority_level: str = "practitioner"  # specialist | practitioner | manager
    can_delegate: bool = False
    delegates_to: List[int] = []
    can_ask_questions: bool = False
    knowledge_base: List[Dict[str, Any]] = []

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
    # Intelligence
    system_prompt: Optional[str] = None
    model_id: Optional[str] = None
    seniority_level: Optional[str] = None
    can_delegate: Optional[bool] = None
    delegates_to: Optional[List[int]] = None
    can_ask_questions: Optional[bool] = None
    knowledge_base: Optional[List[Dict[str, Any]]] = None

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
    # Intelligence
    system_prompt: Optional[str] = None
    model_id: Optional[str] = None
    seniority_level: str = "practitioner"
    can_delegate: bool = False
    delegates_to: List[Any] = []
    can_ask_questions: bool = False
    knowledge_base: List[Any] = []

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
    agentId: Optional[str] = None
    agentName: Optional[str] = None
    agentPhoto: Optional[str] = None
    agentRole: str
    action: str
    order: int = 0
    name: Optional[str] = None
    description: Optional[str] = None
    inputs: Optional[List[str]] = []
    outputs: Optional[List[str]] = []
    dependsOn: Optional[List[str]] = []
    status: str = "pending"

class WorkflowConfig(BaseModel):
    """Alternative workflow format from Evo"""
    title: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[Dict[str, Any]]] = []
    estimated_time: Optional[int] = 0
    estimated_cost: Optional[float] = 0.0

class OperationCreate(BaseModel):
    team_id: int
    title: str = Field(..., min_length=1, max_length=200)
    description: str
    status: str = "pending"  # pending, active, completed, failed
    progress: int = 0
    cost: float = 0.0
    workflowNodes: Optional[List[WorkflowNode]] = None  # Old format
    workflow_config: Optional[WorkflowConfig] = None  # New format from Evo

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
    status: str  # pending, in_progress, completed, failed, paused, cancelled
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
    execution_checkpoint: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# ==================== EXECUTION CONTROL SCHEMAS ====================

class ExecutionControlResponse(BaseModel):
    """Response for execution control operations (pause/resume/cancel)"""
    success: bool
    status: str  # pause_requested, cancel_requested, resumed, already_paused, already_cancelled, not_running, etc.
    message: str
    operation_id: int
    checkpoint: Optional[Dict[str, Any]] = None  # Included when paused


class AssumptionResponseRequest(BaseModel):
    """Request to answer a pending assumption during execution"""
    answer: str = Field(..., min_length=1, max_length=2000, description="User's answer to the assumption question")
    assumption_index: Optional[int] = Field(None, ge=0, description="Index of the assumption being answered (optional)")


class AssumptionResponseResponse(BaseModel):
    """Response after submitting an assumption answer"""
    success: bool
    message: str
    operation_id: int
    resumed: bool  # Whether execution resumed or is still waiting


# ==================== QUALITY RATING SCHEMAS ====================

class RatingRequest(BaseModel):
    """Rate a completed operation's output"""
    rating: int = Field(..., ge=1, le=5, description="1-5 star rating")
    feedback: Optional[str] = Field(None, max_length=2000, description="Optional text feedback")


class RatingResponse(BaseModel):
    """Response after submitting a rating"""
    success: bool
    operation_id: int
    rating: int
    quality_score: float  # Updated hybrid score
    message: str


# ==================== VAULT FILE SCHEMAS ====================

class VaultFileCreate(BaseModel):
    """Create a new vault file"""
    team_id: int
    name: str
    file_type: str = "txt"
    folder_path: str = "/"
    content: Optional[str] = None
    content_json: Optional[Dict[str, Any]] = None
    created_by: str = "system"
    source_type: str = "manual"
    operation_id: Optional[int] = None


class VaultFileResponse(BaseModel):
    """Response for a vault file"""
    id: int
    team_id: int
    operation_id: Optional[int]
    name: str
    file_type: str
    folder_path: str
    content: Optional[str]
    content_json: Optional[Dict[str, Any]]
    size_bytes: int
    mime_type: str
    created_by: str
    source_type: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VaultFolderContents(BaseModel):
    """Contents of a vault folder"""
    path: str
    folders: List[str]
    files: List[VaultFileResponse]


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
    evolution_context: Optional[Dict[str, Any]] = None


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
    evolution_context: Optional[Dict[str, Any]] = None


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
    seniority_level: str = "practitioner"
    can_delegate: bool = False
    can_ask_questions: bool = False


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


# ==================== EXECUTION MESSAGE SCHEMAS (Phase 3.1) ====================

class ExecutionMessageCreate(BaseModel):
    """Create a new message in an execution transcript"""
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")
    target: Optional[str] = Field(None, description="Target recipient: 'current_agent', 'manager', or specific agent name")
    message_type: Literal["chat", "instruction", "question"] = Field(
        default="chat",
        description="Type of message being sent"
    )


class ExecutionMessageResponse(BaseModel):
    """Response for an execution message"""
    id: int
    operation_id: int
    sender_type: str  # "user", "manager", "agent", "system"
    sender_name: str
    sender_id: Optional[int]
    content: str
    message_type: str  # "chat", "assumption", "answer", "status", "review"
    context: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class ExecutionMessagesResponse(BaseModel):
    """Response containing list of execution messages"""
    messages: List[ExecutionMessageResponse]
    total_count: int
    operation_id: int


# ==================== Pending Assumptions (Phase 5.1) ====================

class PendingAssumptionResponse(BaseModel):
    """Response for a pending assumption in inbox"""
    operation_id: int
    operation_title: str
    operation_description: str
    node_id: str
    node_name: str
    agent_name: str
    agent_photo: Optional[str]
    question: str
    context: Optional[str]
    options: List[str]
    priority: str
    assumption_index: int
    waiting_since: datetime  # When the assumption was raised
    waiting_duration_seconds: int  # How long it's been waiting

    class Config:
        from_attributes = True


class PendingAssumptionsResponse(BaseModel):
    """Response containing list of pending assumptions"""
    pending_assumptions: List[PendingAssumptionResponse]
    total_count: int
    team_id: int


# ==================== Agent Messages (Phase 5.2) ====================

class AgentMessageGroup(BaseModel):
    """Group of messages for a single operation"""
    operation_id: int
    operation_title: str
    operation_status: str
    messages: List[ExecutionMessageResponse]
    created_at: datetime

    class Config:
        from_attributes = True


class AgentMessagesResponse(BaseModel):
    """Response containing agent messages grouped by operation"""
    message_groups: List[AgentMessageGroup]
    total_messages: int
    agent_name: str
    team_id: int
