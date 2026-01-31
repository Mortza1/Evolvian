from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    teams = relationship("Team", back_populates="owner")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String, default="🏢")
    color = Column(String, default="#6366F1")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Settings stored as JSON
    settings = Column(JSON, default={})

    # Stats stored as JSON
    stats = Column(JSON, default={
        "totalAgents": 0,
        "activeAgents": 0,
        "totalOperations": 0,
        "operationsThisWeek": 0,
        "totalSpend": 0.0,
        "spendThisMonth": 0.0,
        "avgOperationCost": 0.0
    })

    status = Column(String, default="active")  # active, archived

    # Relationships
    owner = relationship("User", back_populates="teams")
    agents = relationship("Agent", back_populates="team", cascade="all, delete-orphan")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))

    # Agent Identity
    name = Column(String, index=True)
    role = Column(String)
    specialty = Column(String)
    level = Column(Integer, default=1)

    # Visual
    photo_url = Column(String, nullable=True)
    avatar_seed = Column(String, nullable=True)  # For consistent random avatars

    # Performance Metrics
    rating = Column(Float, default=4.0)
    tasks_completed = Column(Integer, default=0)
    accuracy = Column(Float, default=85.0)
    speed = Column(Float, default=3.5)  # tasks per hour

    # Pricing
    cost_per_hour = Column(Float, default=12.0)

    # Status
    status = Column(String, default="available")  # available, busy, offline
    is_online = Column(Boolean, default=False)

    # Capabilities & Skills stored as JSON
    skills = Column(JSON, default=[])
    personality_traits = Column(JSON, default=[])
    tools_access = Column(JSON, default=[])  # List of tool IDs this agent can use

    # Evolution tracking
    experience_points = Column(Integer, default=0)
    evolution_history = Column(JSON, default=[])  # Track how the agent evolved

    # Timestamps
    hired_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, nullable=True)

    # Relationships
    team = relationship("Team", back_populates="agents")


class Operation(Base):
    __tablename__ = "operations"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))

    # Operation Details
    title = Column(String)
    description = Column(Text)
    status = Column(String, default="pending")  # pending, in_progress, completed, failed, paused, cancelled

    # Workflow
    workflow_config = Column(JSON, default={})  # Stores the workflow DAG
    current_phase = Column(String, nullable=True)

    # Execution checkpoint for pause/resume
    execution_checkpoint = Column(JSON, nullable=True)  # Stores resume state: {current_node_index, completed_nodes, context}

    # Assigned Agents (stored as JSON array of agent IDs)
    assigned_agent_ids = Column(JSON, default=[])

    # Cost & Time Tracking
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    estimated_time = Column(Integer, default=0)  # in minutes
    actual_time = Column(Integer, nullable=True)  # in minutes

    # Results
    output = Column(Text, nullable=True)
    assumptions = Column(JSON, default=[])
    evolution_events = Column(JSON, default=[])  # What agents learned

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    team = relationship("Team")


class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))

    # Node Identity
    node_type = Column(String)  # entity, policy, risk, agent, document, decision, concept
    label = Column(String, index=True)
    description = Column(Text)

    # Metadata stored as JSON (using 'node_metadata' to avoid reserved name 'metadata')
    node_metadata = Column(JSON, default={})
    properties = Column(JSON, default={})

    # Relationships (stored as JSON for flexibility)
    edges = Column(JSON, default=[])  # [{targetNodeId, relationshipType, evidence}]

    # Evolution
    evolution_events = Column(JSON, default=[])
    is_deprecated = Column(Boolean, default=False)
    deprecation_reason = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String)  # Agent name or user

    # Relationships
    team = relationship("Team")


class InstalledTool(Base):
    __tablename__ = "installed_tools"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))

    # Tool Identity (references the catalog)
    tool_id = Column(String, index=True)  # e.g., "tool-websearch"

    # Configuration
    configuration = Column(JSON, default={})
    status = Column(String, default="connected")  # connected, disconnected, error

    # Assignment
    assigned_agent_ids = Column(JSON, default=[])  # Which agents can use this tool

    # Usage Policy
    usage_policy = Column(JSON, default={})

    # Usage Stats
    total_calls = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)
    last_used_at = Column(DateTime, nullable=True)

    # Timestamps
    installed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    team = relationship("Team")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    # Message Details
    role = Column(String)  # 'user' or 'manager' (assistant)
    content = Column(Text)

    # Optional context for the message
    context = Column(JSON, default={}, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    team = relationship("Team")
    user = relationship("User")


class Assumption(Base):
    """
    Assumptions Inbox - agents ask clarifying questions instead of hallucinating.
    """
    __tablename__ = "assumptions"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    operation_id = Column(Integer, ForeignKey("operations.id"), nullable=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)

    # Question Details
    question = Column(Text)
    context = Column(Text, default="")
    options = Column(JSON, default=[])  # Suggested answers

    # Answer
    answer = Column(Text, nullable=True)
    answered_at = Column(DateTime, nullable=True)

    # Priority and Status
    priority = Column(String, default="normal")  # low, normal, high, critical
    status = Column(String, default="pending")  # pending, answered, dismissed

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    team = relationship("Team")
    operation = relationship("Operation")
    agent = relationship("Agent")


class UserPreference(Base):
    """
    User preferences and settings.
    """
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)

    # Appearance
    theme = Column(String, default="dark")  # light, dark, system

    # Notifications
    notifications_enabled = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)

    # Defaults
    default_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)

    # Layout preferences (stored as JSON)
    dashboard_layout = Column(JSON, default={})

    # AI Interaction
    ai_interaction_style = Column(String, default="conversational")  # concise, detailed, conversational

    # Timestamps
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")


class UserObjective(Base):
    """
    Saved user objectives/goals for quick access.
    """
    __tablename__ = "user_objectives"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)

    # Objective Details
    title = Column(String)
    description = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    team = relationship("Team")


class VaultFile(Base):
    """
    File storage for the Neural Vault - stores operation outputs and documents.
    """
    __tablename__ = "vault_files"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    operation_id = Column(Integer, ForeignKey("operations.id"), nullable=True)

    # File Identity
    name = Column(String, index=True)
    file_type = Column(String)  # pdf, docx, txt, json, etc.
    folder_path = Column(String, default="/")  # Virtual folder path like "/Workflow Outputs"

    # Content - stored as text/JSON for now (could move to file storage later)
    content = Column(Text)  # For text-based content
    content_json = Column(JSON, nullable=True)  # For structured data

    # Metadata
    size_bytes = Column(Integer, default=0)
    mime_type = Column(String, default="application/octet-stream")

    # Source tracking
    created_by = Column(String)  # Agent name or "system"
    source_type = Column(String, default="operation")  # operation, upload, agent

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team = relationship("Team")
    operation = relationship("Operation")
