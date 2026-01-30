"""
Evolvian Agent Service

High-level service layer for agent operations.
Bridges the core agents with the database models.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from .base import EvolvianAgent, AgentMetadata, AgentCapabilities, AgentStatus
from .registry import AgentRegistry, AgentTemplate, AGENT_REGISTRY


class AgentService:
    """
    Service layer for agent operations.

    This class provides high-level operations for:
    - Creating agents from templates or custom configs
    - Executing agent tasks
    - Managing agent lifecycle
    - Syncing with database models
    """

    def __init__(self, registry: Optional[AgentRegistry] = None):
        """
        Initialize the agent service.

        Args:
            registry: Optional custom registry, uses global if not provided
        """
        self.registry = registry or AGENT_REGISTRY

    # ==================== Creation ====================

    def hire_from_template(
        self,
        template_id: str,
        team_id: int,
        custom_name: Optional[str] = None,
        db_agent_id: Optional[int] = None,
    ) -> Optional[EvolvianAgent]:
        """
        Hire an agent from a marketplace template.

        Args:
            template_id: The template to use
            team_id: Team hiring the agent
            custom_name: Optional custom name
            db_agent_id: Database ID if already created

        Returns:
            The created agent, or None if template not found
        """
        agent = self.registry.create_from_template(
            template_id=template_id,
            team_id=team_id,
            custom_name=custom_name,
            agent_id=db_agent_id,
        )
        return agent

    def create_custom_agent(
        self,
        name: str,
        description: str,
        prompt: str,
        team_id: int,
        role: str = "Custom Agent",
        specialty: str = "General",
        skills: Optional[List[str]] = None,
        db_agent_id: Optional[int] = None,
    ) -> EvolvianAgent:
        """
        Create a custom agent with user-defined config.

        Args:
            name: Agent name
            description: What the agent does
            prompt: Prompt template
            team_id: Team this agent belongs to
            role: Agent role
            specialty: Agent specialty
            skills: Agent skills
            db_agent_id: Database ID if already created

        Returns:
            The created agent
        """
        return self.registry.create_custom(
            name=name,
            description=description,
            prompt=prompt,
            team_id=team_id,
            role=role,
            specialty=specialty,
            skills=skills,
            agent_id=db_agent_id,
        )

    def load_from_db_model(self, db_agent: Any) -> EvolvianAgent:
        """
        Load an EvolvianAgent from a database Agent model.

        This bridges the SQLAlchemy model with the core agent.

        Args:
            db_agent: Database Agent model instance

        Returns:
            EvolvianAgent instance
        """
        # Check if already in registry
        existing = self.registry.get_instance(db_agent.team_id, db_agent.name)
        if existing:
            return existing

        # Build metadata from DB model
        metadata = AgentMetadata(
            agent_id=db_agent.id,
            team_id=db_agent.team_id,
            role=db_agent.role,
            specialty=db_agent.specialty,
            level=db_agent.level,
            photo_url=db_agent.photo_url,
            avatar_seed=db_agent.avatar_seed,
            rating=db_agent.rating,
            tasks_completed=db_agent.tasks_completed,
            accuracy=db_agent.accuracy,
            speed=db_agent.speed,
            cost_per_hour=db_agent.cost_per_hour,
            experience_points=db_agent.experience_points,
            personality_traits=db_agent.personality_traits or [],
            status=AgentStatus(db_agent.status),
            is_online=db_agent.is_online,
            hired_at=db_agent.hired_at,
            last_active_at=db_agent.last_active_at,
            evolution_history=db_agent.evolution_history or [],
        )

        capabilities = AgentCapabilities(
            skills=db_agent.skills or [],
            tools=db_agent.tools_access or [],
        )

        # Try to find template for prompt
        template = None
        if db_agent.avatar_seed:
            template = self.registry.get_template(db_agent.avatar_seed)

        if template:
            prompt = template.prompt
            system_prompt = template.system_prompt
        else:
            # Default prompt for custom agents
            prompt = """You are {name}, a {role} specializing in {specialty}.

Task: {task}

Complete this task using your expertise and skills."""
            system_prompt = None

        agent = EvolvianAgent(
            name=db_agent.name,
            description=f"{db_agent.role} - {db_agent.specialty}",
            prompt=prompt,
            system_prompt=system_prompt,
            metadata=metadata,
            capabilities=capabilities,
        )

        self.registry.register_instance(agent)
        return agent

    # ==================== Execution ====================

    def execute_task(
        self,
        team_id: int,
        agent_name: str,
        task: str,
        use_simple: bool = True,
    ) -> Dict[str, Any]:
        """
        Execute a task with an agent.

        Args:
            team_id: Team ID
            agent_name: Agent name
            task: Task to execute
            use_simple: Use simple execution (recommended)

        Returns:
            Execution result dict
        """
        agent = self.registry.get_instance(team_id, agent_name)
        if not agent:
            return {
                "success": False,
                "error": f"Agent '{agent_name}' not found in team {team_id}",
            }

        if use_simple:
            try:
                result = agent.execute_simple(task=task)
                return {
                    "success": True,
                    "output": result,
                    "agent": agent_name,
                    "tasks_completed": agent.metadata.tasks_completed,
                    "level": agent.metadata.level,
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "agent": agent_name,
                }
        else:
            return agent.execute(task=task)

    # ==================== Queries ====================

    def get_agent(self, team_id: int, agent_name: str) -> Optional[EvolvianAgent]:
        """Get an agent instance"""
        return self.registry.get_instance(team_id, agent_name)

    def list_team_agents(self, team_id: int) -> List[EvolvianAgent]:
        """List all agents for a team"""
        return self.registry.list_instances(team_id)

    def list_templates(
        self,
        category: Optional[str] = None,
        featured_only: bool = False
    ) -> List[Dict[str, Any]]:
        """List marketplace templates"""
        templates = self.registry.list_templates(category, featured_only)
        return [t.to_dict() for t in templates]

    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific template"""
        template = self.registry.get_template(template_id)
        return template.to_dict() if template else None

    # ==================== Lifecycle ====================

    def set_agent_status(
        self,
        team_id: int,
        agent_name: str,
        status: AgentStatus
    ) -> bool:
        """Update agent status"""
        agent = self.registry.get_instance(team_id, agent_name)
        if not agent:
            return False

        agent.metadata.status = status
        agent.metadata.is_online = status != AgentStatus.OFFLINE
        return True

    def add_feedback(
        self,
        team_id: int,
        agent_name: str,
        rating: float,
        feedback: Optional[str] = None
    ) -> bool:
        """Add feedback to an agent"""
        agent = self.registry.get_instance(team_id, agent_name)
        if not agent:
            return False

        agent.add_feedback(rating, feedback)
        return True

    def remove_agent(self, team_id: int, agent_name: str) -> bool:
        """Remove an agent instance"""
        return self.registry.remove_instance(team_id, agent_name)

    # ==================== Sync ====================

    def sync_to_db_model(self, agent: EvolvianAgent, db_agent: Any) -> None:
        """
        Sync EvolvianAgent state back to database model.

        Call this after agent operations to persist changes.

        Args:
            agent: The EvolvianAgent instance
            db_agent: The database Agent model
        """
        db_agent.rating = agent.metadata.rating
        db_agent.tasks_completed = agent.metadata.tasks_completed
        db_agent.accuracy = agent.metadata.accuracy
        db_agent.speed = agent.metadata.speed
        db_agent.experience_points = agent.metadata.experience_points
        db_agent.level = agent.metadata.level
        db_agent.status = agent.metadata.status.value
        db_agent.is_online = agent.metadata.is_online
        db_agent.last_active_at = agent.metadata.last_active_at
        db_agent.evolution_history = agent.metadata.evolution_history

    def get_agent_profile(
        self,
        team_id: int,
        agent_name: str
    ) -> Optional[Dict[str, Any]]:
        """Get detailed agent profile"""
        agent = self.registry.get_instance(team_id, agent_name)
        return agent.get_profile() if agent else None


# Global service singleton
agent_service = AgentService()
