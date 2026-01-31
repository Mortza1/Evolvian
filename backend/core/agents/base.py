"""
Evolvian Agent Base

Wraps EvoAgentX's Agent/CustomizeAgent with Evolvian-specific
identity, metadata, and capabilities.

This is the core primitive - all Evolvian agents inherit from this.
"""

import sys
import os
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum

# Add evoAgentX to path for imports
EVOAGENTX_PATH = Path(__file__).parent.parent.parent.parent / "evoAgentX"
if str(EVOAGENTX_PATH) not in sys.path:
    sys.path.insert(0, str(EVOAGENTX_PATH))

# Import from EvoAgentX (lazy to avoid import errors if deps missing)
# Note: EvoAgentX requires additional deps (loguru, etc). We use llm_service instead for now.
_evo_agent_available = False
try:
    from evoagentx.agents import Agent as EvoAgent
    from evoagentx.agents import CustomizeAgent as EvoCustomizeAgent
    from evoagentx.models.model_configs import LiteLLMConfig
    _evo_agent_available = True
except ImportError:
    # Silently fall back - we use llm_service instead
    EvoAgent = None
    EvoCustomizeAgent = None
    LiteLLMConfig = None


class AgentStatus(str, Enum):
    """Agent availability status"""
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    ERROR = "error"


@dataclass
class AgentCapabilities:
    """What an agent can do"""
    skills: List[str] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)  # Tool IDs this agent can use
    actions: List[str] = field(default_factory=list)  # Action names
    max_concurrent_tasks: int = 1
    supports_streaming: bool = False


@dataclass
class AgentMetadata:
    """
    Evolvian-specific agent identity and metadata.
    This is what makes an EvoAgentX agent into an Evolvian agent.
    """
    # Identity
    agent_id: Optional[int] = None  # DB ID
    team_id: Optional[int] = None

    # Role & Specialty
    role: str = "Agent"
    specialty: str = "General"
    level: int = 1

    # Visuals
    photo_url: Optional[str] = None
    avatar_seed: Optional[str] = None

    # Performance
    rating: float = 4.0
    tasks_completed: int = 0
    accuracy: float = 85.0
    speed: float = 3.5  # tasks per hour

    # Economics
    cost_per_hour: float = 12.0
    experience_points: int = 0

    # Personality
    personality_traits: List[str] = field(default_factory=list)

    # Status
    status: AgentStatus = AgentStatus.AVAILABLE
    is_online: bool = False

    # Timestamps
    hired_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None

    # Evolution tracking
    evolution_history: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "agent_id": self.agent_id,
            "team_id": self.team_id,
            "role": self.role,
            "specialty": self.specialty,
            "level": self.level,
            "photo_url": self.photo_url,
            "avatar_seed": self.avatar_seed,
            "rating": self.rating,
            "tasks_completed": self.tasks_completed,
            "accuracy": self.accuracy,
            "speed": self.speed,
            "cost_per_hour": self.cost_per_hour,
            "experience_points": self.experience_points,
            "personality_traits": self.personality_traits,
            "status": self.status.value,
            "is_online": self.is_online,
            "hired_at": self.hired_at.isoformat() if self.hired_at else None,
            "last_active_at": self.last_active_at.isoformat() if self.last_active_at else None,
            "evolution_history": self.evolution_history,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentMetadata":
        """Create from dictionary"""
        return cls(
            agent_id=data.get("agent_id"),
            team_id=data.get("team_id"),
            role=data.get("role", "Agent"),
            specialty=data.get("specialty", "General"),
            level=data.get("level", 1),
            photo_url=data.get("photo_url"),
            avatar_seed=data.get("avatar_seed"),
            rating=data.get("rating", 4.0),
            tasks_completed=data.get("tasks_completed", 0),
            accuracy=data.get("accuracy", 85.0),
            speed=data.get("speed", 3.5),
            cost_per_hour=data.get("cost_per_hour", 12.0),
            experience_points=data.get("experience_points", 0),
            personality_traits=data.get("personality_traits", []),
            status=AgentStatus(data.get("status", "available")),
            is_online=data.get("is_online", False),
            hired_at=datetime.fromisoformat(data["hired_at"]) if data.get("hired_at") else None,
            last_active_at=datetime.fromisoformat(data["last_active_at"]) if data.get("last_active_at") else None,
            evolution_history=data.get("evolution_history", []),
        )


class EvolvianAgent:
    """
    Evolvian Agent - wraps EvoAgentX Agent with Evolvian identity.

    This is the core agent class for Evolvian. It:
    1. Wraps EvoAgentX's CustomizeAgent for LLM execution
    2. Adds Evolvian metadata (role, specialty, level, etc.)
    3. Provides a clean interface for the Evolvian platform

    Usage:
        agent = EvolvianAgent(
            name="Aria Martinez",
            description="Senior Brand Lead specializing in personal branding",
            prompt="You are {name}, a {role}. Help with: {task}",
            metadata=AgentMetadata(
                role="Senior Brand Lead",
                specialty="Personal Branding",
                level=10
            )
        )

        # Execute an action
        result = agent.execute(task="Create a LinkedIn content strategy")
    """

    def __init__(
        self,
        name: str,
        description: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        metadata: Optional[AgentMetadata] = None,
        capabilities: Optional[AgentCapabilities] = None,
        llm_config: Optional[Dict[str, Any]] = None,
        inputs: Optional[List[Dict]] = None,
        outputs: Optional[List[Dict]] = None,
        parse_mode: str = "str",
    ):
        """
        Initialize an Evolvian Agent.

        Args:
            name: Unique name for the agent
            description: What this agent does
            prompt: Prompt template with {placeholders}
            system_prompt: Optional system prompt override
            metadata: Evolvian-specific metadata
            capabilities: What the agent can do
            llm_config: LLM configuration dict (optional, uses default if not provided)
            inputs: Input specifications for the action
            outputs: Output specifications for the action
            parse_mode: How to parse LLM output ("str", "json", "title")
        """
        self.name = name
        self.description = description
        self.prompt = prompt
        self.system_prompt = system_prompt or self._default_system_prompt()

        # Evolvian-specific
        self.metadata = metadata or AgentMetadata()
        self.capabilities = capabilities or AgentCapabilities()

        # LLM config
        self._llm_config = llm_config

        # Action specs
        self._inputs = inputs or [{"name": "task", "type": "str", "description": "The task to perform"}]
        self._outputs = outputs or [{"name": "result", "type": "str", "description": "The result"}]
        self._parse_mode = parse_mode

        # Underlying EvoAgentX agent (lazy init)
        self._evo_agent: Optional[Any] = None

    def _default_system_prompt(self) -> str:
        """Generate default system prompt based on metadata"""
        return f"""You are {self.name}, a Level {self.metadata.level} {self.metadata.role} specializing in {self.metadata.specialty}.

Your personality traits: {', '.join(self.metadata.personality_traits) if self.metadata.personality_traits else 'Professional, helpful, efficient'}

You work for Evolvian, a next-generation digital labor platform. You are part of an AI workforce that helps users accomplish their goals.

Be helpful, professional, and focused on delivering quality results."""

    def _get_llm_config(self) -> Any:
        """Get LLM config, using OpenRouter by default"""
        if self._llm_config:
            if _evo_agent_available and LiteLLMConfig:
                return LiteLLMConfig(**self._llm_config)
            return self._llm_config

        # Default to OpenRouter with DeepSeek
        api_key = os.getenv("OPENROUTER_API_KEY")
        model = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-r1-0528:free")

        if _evo_agent_available and LiteLLMConfig:
            return LiteLLMConfig(
                llm_type="LiteLLM",
                model=f"openrouter/{model}",
                openrouter_key=api_key,
                temperature=0.7,
            )
        return {"model": model, "api_key": api_key}

    def _init_evo_agent(self):
        """Lazily initialize the underlying EvoAgentX agent"""
        if self._evo_agent is not None:
            return

        if not _evo_agent_available or EvoCustomizeAgent is None:
            raise RuntimeError("EvoAgentX is not available. Install dependencies.")

        self._evo_agent = EvoCustomizeAgent(
            name=self.name,
            description=self.description,
            prompt=self.prompt,
            system_prompt=self.system_prompt,
            llm_config=self._get_llm_config(),
            inputs=self._inputs,
            outputs=self._outputs,
            parse_mode=self._parse_mode,
        )

    def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute the agent's primary action.

        Args:
            **kwargs: Input data matching the agent's input specs

        Returns:
            Dict with the agent's output
        """
        self._init_evo_agent()

        # Update status
        self.metadata.status = AgentStatus.BUSY
        self.metadata.last_active_at = datetime.now(timezone.utc)

        try:
            # Call the EvoAgentX agent
            result = self._evo_agent(inputs=kwargs)

            # Update metrics
            self.metadata.tasks_completed += 1
            self.metadata.experience_points += 10

            # Check for level up
            self._check_level_up()

            return {
                "success": True,
                "output": result.content if hasattr(result, 'content') else result,
                "agent": self.name,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "agent": self.name,
            }
        finally:
            self.metadata.status = AgentStatus.AVAILABLE

    def execute_simple(self, task: str) -> str:
        """
        Simple execution - just pass a task string.

        This is a convenience method that doesn't require EvoAgentX.
        Uses the backend's llm_service directly.
        """
        from llm_service import llm_service

        # Update status
        self.metadata.status = AgentStatus.BUSY
        self.metadata.last_active_at = datetime.now(timezone.utc)

        try:
            # Format prompt
            formatted_prompt = self.prompt.format(
                name=self.name,
                role=self.metadata.role,
                specialty=self.metadata.specialty,
                task=task,
            )

            # Call LLM
            result = llm_service.simple_chat(
                user_message=formatted_prompt,
                system_prompt=self.system_prompt
            )

            # Update metrics
            self.metadata.tasks_completed += 1
            self.metadata.experience_points += 10
            self._check_level_up()

            return result
        finally:
            self.metadata.status = AgentStatus.AVAILABLE

    def _check_level_up(self):
        """Check if agent should level up based on XP"""
        xp_per_level = 100
        new_level = (self.metadata.experience_points // xp_per_level) + 1

        if new_level > self.metadata.level:
            old_level = self.metadata.level
            self.metadata.level = new_level

            # Record evolution event
            self.metadata.evolution_history.append({
                "type": "level_up",
                "from_level": old_level,
                "to_level": new_level,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "trigger": "xp_threshold",
            })

    def add_feedback(self, rating: float, feedback: Optional[str] = None):
        """
        Add user feedback to the agent.

        This contributes to the agent's evolution.
        """
        # Update rolling average rating
        total_ratings = self.metadata.tasks_completed
        current_total = self.metadata.rating * max(1, total_ratings - 1)
        self.metadata.rating = (current_total + rating) / total_ratings

        # Bonus XP for good feedback
        if rating >= 4.5:
            self.metadata.experience_points += 5

        # Record evolution event
        self.metadata.evolution_history.append({
            "type": "feedback",
            "rating": rating,
            "feedback": feedback,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        self._check_level_up()

    def get_profile(self) -> Dict[str, Any]:
        """Get agent profile for display"""
        return {
            "name": self.name,
            "description": self.description,
            **self.metadata.to_dict(),
            "capabilities": {
                "skills": self.capabilities.skills,
                "tools": self.capabilities.tools,
                "max_concurrent_tasks": self.capabilities.max_concurrent_tasks,
            }
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serialize agent to dictionary"""
        return {
            "name": self.name,
            "description": self.description,
            "prompt": self.prompt,
            "system_prompt": self.system_prompt,
            "metadata": self.metadata.to_dict(),
            "capabilities": {
                "skills": self.capabilities.skills,
                "tools": self.capabilities.tools,
                "actions": self.capabilities.actions,
                "max_concurrent_tasks": self.capabilities.max_concurrent_tasks,
                "supports_streaming": self.capabilities.supports_streaming,
            },
            "inputs": self._inputs,
            "outputs": self._outputs,
            "parse_mode": self._parse_mode,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EvolvianAgent":
        """Create agent from dictionary"""
        metadata = AgentMetadata.from_dict(data.get("metadata", {}))

        caps_data = data.get("capabilities", {})
        capabilities = AgentCapabilities(
            skills=caps_data.get("skills", []),
            tools=caps_data.get("tools", []),
            actions=caps_data.get("actions", []),
            max_concurrent_tasks=caps_data.get("max_concurrent_tasks", 1),
            supports_streaming=caps_data.get("supports_streaming", False),
        )

        return cls(
            name=data["name"],
            description=data["description"],
            prompt=data["prompt"],
            system_prompt=data.get("system_prompt"),
            metadata=metadata,
            capabilities=capabilities,
            inputs=data.get("inputs"),
            outputs=data.get("outputs"),
            parse_mode=data.get("parse_mode", "str"),
        )

    def __repr__(self):
        return f"EvolvianAgent(name='{self.name}', role='{self.metadata.role}', level={self.metadata.level})"
