"""
Evolvian Agent Registry

Central registry for agent templates and instances.
This is the foundation for the agent marketplace.
"""

from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
import threading

from .base import EvolvianAgent, AgentMetadata, AgentCapabilities


@dataclass
class AgentTemplate:
    """
    A template for creating agents.
    These are the "blueprints" shown in the marketplace.
    """
    template_id: str
    name: str
    role: str
    specialty: str
    description: str
    prompt: str
    system_prompt: Optional[str] = None

    # Defaults
    level: int = 1
    base_cost_per_hour: float = 12.0
    skills: List[str] = field(default_factory=list)
    personality_traits: List[str] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)

    # Marketplace info
    category: str = "general"
    rating: float = 4.5
    hires_count: int = 0
    is_featured: bool = False
    is_premium: bool = False
    avatar_url: Optional[str] = None

    # Inputs/outputs for the action
    inputs: List[Dict] = field(default_factory=lambda: [
        {"name": "task", "type": "str", "description": "The task to perform"}
    ])
    outputs: List[Dict] = field(default_factory=lambda: [
        {"name": "result", "type": "str", "description": "The result"}
    ])
    parse_mode: str = "str"

    def create_agent(
        self,
        team_id: int,
        custom_name: Optional[str] = None,
        agent_id: Optional[int] = None
    ) -> EvolvianAgent:
        """
        Create an EvolvianAgent instance from this template.

        Args:
            team_id: The team this agent belongs to
            custom_name: Optional custom name override
            agent_id: Optional database ID

        Returns:
            A new EvolvianAgent instance
        """
        metadata = AgentMetadata(
            agent_id=agent_id,
            team_id=team_id,
            role=self.role,
            specialty=self.specialty,
            level=self.level,
            photo_url=self.avatar_url,
            avatar_seed=self.template_id,
            rating=self.rating,
            cost_per_hour=self.base_cost_per_hour,
            personality_traits=self.personality_traits.copy(),
            hired_at=datetime.now(timezone.utc),
        )

        capabilities = AgentCapabilities(
            skills=self.skills.copy(),
            tools=self.tools.copy(),
        )

        return EvolvianAgent(
            name=custom_name or self.name,
            description=self.description,
            prompt=self.prompt,
            system_prompt=self.system_prompt,
            metadata=metadata,
            capabilities=capabilities,
            inputs=self.inputs,
            outputs=self.outputs,
            parse_mode=self.parse_mode,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "id": self.template_id,
            "name": self.name,
            "role": self.role,
            "specialty": self.specialty,
            "description": self.description,
            "level": self.level,
            "base_cost_per_hour": self.base_cost_per_hour,
            "skills": self.skills,
            "personality_traits": self.personality_traits,
            "category": self.category,
            "rating": self.rating,
            "hires_count": self.hires_count,
            "is_featured": self.is_featured,
            "is_premium": self.is_premium,
            "avatar_url": self.avatar_url,
        }


class AgentRegistry:
    """
    Central registry for agent templates and running instances.

    This serves as:
    1. Template store for the marketplace
    2. Instance manager for running agents
    3. Factory for creating new agents
    """

    def __init__(self):
        self._templates: Dict[str, AgentTemplate] = {}
        self._instances: Dict[str, EvolvianAgent] = {}  # key: f"{team_id}:{agent_name}"
        self._lock = threading.Lock()

    # ==================== Template Management ====================

    def register_template(self, template: AgentTemplate) -> None:
        """Register an agent template"""
        with self._lock:
            self._templates[template.template_id] = template

    def get_template(self, template_id: str) -> Optional[AgentTemplate]:
        """Get a template by ID"""
        return self._templates.get(template_id)

    def list_templates(
        self,
        category: Optional[str] = None,
        featured_only: bool = False
    ) -> List[AgentTemplate]:
        """List all templates, optionally filtered"""
        templates = list(self._templates.values())

        if category:
            templates = [t for t in templates if t.category == category]

        if featured_only:
            templates = [t for t in templates if t.is_featured]

        return templates

    def remove_template(self, template_id: str) -> bool:
        """Remove a template"""
        with self._lock:
            if template_id in self._templates:
                del self._templates[template_id]
                return True
            return False

    # ==================== Instance Management ====================

    def _instance_key(self, team_id: int, agent_name: str) -> str:
        """Generate unique key for an agent instance"""
        return f"{team_id}:{agent_name}"

    def register_instance(self, agent: EvolvianAgent) -> None:
        """Register a running agent instance"""
        if not agent.metadata.team_id:
            raise ValueError("Agent must have a team_id to be registered")

        key = self._instance_key(agent.metadata.team_id, agent.name)
        with self._lock:
            self._instances[key] = agent

    def get_instance(self, team_id: int, agent_name: str) -> Optional[EvolvianAgent]:
        """Get a running agent instance"""
        key = self._instance_key(team_id, agent_name)
        return self._instances.get(key)

    def list_instances(self, team_id: Optional[int] = None) -> List[EvolvianAgent]:
        """List running agent instances"""
        if team_id is None:
            return list(self._instances.values())

        return [
            agent for agent in self._instances.values()
            if agent.metadata.team_id == team_id
        ]

    def remove_instance(self, team_id: int, agent_name: str) -> bool:
        """Remove an agent instance"""
        key = self._instance_key(team_id, agent_name)
        with self._lock:
            if key in self._instances:
                del self._instances[key]
                return True
            return False

    # ==================== Factory Methods ====================

    def create_from_template(
        self,
        template_id: str,
        team_id: int,
        custom_name: Optional[str] = None,
        agent_id: Optional[int] = None,
        register: bool = True
    ) -> Optional[EvolvianAgent]:
        """
        Create an agent from a template.

        Args:
            template_id: The template to use
            team_id: Team this agent belongs to
            custom_name: Optional custom name
            agent_id: Optional database ID
            register: Whether to register the instance

        Returns:
            The created agent, or None if template not found
        """
        template = self.get_template(template_id)
        if not template:
            return None

        agent = template.create_agent(
            team_id=team_id,
            custom_name=custom_name,
            agent_id=agent_id
        )

        # Increment hire count
        with self._lock:
            template.hires_count += 1

        if register:
            self.register_instance(agent)

        return agent

    def create_custom(
        self,
        name: str,
        description: str,
        prompt: str,
        team_id: int,
        role: str = "Custom Agent",
        specialty: str = "General",
        system_prompt: Optional[str] = None,
        skills: Optional[List[str]] = None,
        agent_id: Optional[int] = None,
        register: bool = True
    ) -> EvolvianAgent:
        """
        Create a custom agent (not from template).

        Args:
            name: Agent name
            description: What the agent does
            prompt: Prompt template
            team_id: Team this agent belongs to
            role: Agent role
            specialty: Agent specialty
            system_prompt: Optional system prompt
            skills: Optional list of skills
            agent_id: Optional database ID
            register: Whether to register the instance

        Returns:
            The created agent
        """
        metadata = AgentMetadata(
            agent_id=agent_id,
            team_id=team_id,
            role=role,
            specialty=specialty,
            hired_at=datetime.now(timezone.utc),
        )

        capabilities = AgentCapabilities(
            skills=skills or [],
        )

        agent = EvolvianAgent(
            name=name,
            description=description,
            prompt=prompt,
            system_prompt=system_prompt,
            metadata=metadata,
            capabilities=capabilities,
        )

        if register:
            self.register_instance(agent)

        return agent

    # ==================== Stats ====================

    def get_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        return {
            "total_templates": len(self._templates),
            "total_instances": len(self._instances),
            "categories": list(set(t.category for t in self._templates.values())),
            "featured_count": len([t for t in self._templates.values() if t.is_featured]),
        }


# Global registry singleton
AGENT_REGISTRY = AgentRegistry()


# ==================== Built-in Templates ====================

def _register_builtin_templates():
    """Register the built-in agent templates"""

    # Aria Martinez - Senior Brand Lead
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="agent-aria-martinez",
        name="Aria Martinez",
        role="Senior Brand Lead",
        specialty="Personal Branding & Executive Positioning",
        description="Expert in crafting and managing personal brands for executives and thought leaders. Specializes in LinkedIn presence, speaking engagements, and media positioning.",
        prompt="""You are {name}, a {role} specializing in {specialty}.

Task: {task}

Approach this task with your expertise in:
- Brand strategy and positioning
- Content planning and creation
- LinkedIn optimization
- Media relations and thought leadership

Provide actionable, strategic advice that helps build a strong personal brand.""",
        level=10,
        base_cost_per_hour=45.0,
        skills=["brand strategy", "content planning", "LinkedIn optimization", "media relations", "thought leadership"],
        personality_traits=["strategic", "creative", "detail-oriented", "persuasive"],
        category="management",
        rating=4.9,
        hires_count=1250,
        is_featured=True,
    ))

    # Alex Chen - Research Analyst
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="agent-research-analyst",
        name="Alex Chen",
        role="Research Analyst",
        specialty="Market Research & Competitive Analysis",
        description="Skilled at gathering, analyzing, and synthesizing information from multiple sources. Expert in market trends and competitive intelligence.",
        prompt="""You are {name}, a {role} specializing in {specialty}.

Task: {task}

Approach this research task methodically:
1. Identify key information needs
2. Consider multiple data sources
3. Analyze findings critically
4. Synthesize into actionable insights

Provide well-researched, evidence-based analysis.""",
        level=5,
        base_cost_per_hour=25.0,
        skills=["research", "data analysis", "report writing", "competitive analysis", "trend spotting"],
        personality_traits=["analytical", "thorough", "curious", "methodical"],
        category="research",
        rating=4.7,
        hires_count=890,
    ))

    # Maya Johnson - Content Writer
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="agent-content-writer",
        name="Maya Johnson",
        role="Content Writer",
        specialty="Blog Posts, Articles & Social Media",
        description="Creative writer specializing in engaging content across multiple platforms. Expert in SEO-optimized articles and viral social content.",
        prompt="""You are {name}, a {role} specializing in {specialty}.

Task: {task}

Create content that is:
- Engaging and reader-friendly
- Well-structured with clear flow
- Optimized for the target platform
- Action-oriented with clear CTAs

Write with creativity while maintaining brand voice.""",
        level=6,
        base_cost_per_hour=30.0,
        skills=["copywriting", "SEO writing", "social media", "storytelling", "editing"],
        personality_traits=["creative", "adaptable", "deadline-driven", "empathetic"],
        category="creative",
        rating=4.8,
        hires_count=2100,
    ))

    # Sam Park - Data Analyst
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="agent-data-analyst",
        name="Sam Park",
        role="Data Analyst",
        specialty="Data Processing & Visualization",
        description="Expert in transforming raw data into actionable insights. Skilled in Python, SQL, and visualization tools.",
        prompt="""You are {name}, a {role} specializing in {specialty}.

Task: {task}

Approach this data task by:
1. Understanding the data structure
2. Identifying key metrics and patterns
3. Applying appropriate analytical methods
4. Presenting findings clearly

Provide precise, data-driven insights with clear explanations.""",
        level=7,
        base_cost_per_hour=35.0,
        skills=["Python", "SQL", "data visualization", "statistics", "machine learning basics"],
        personality_traits=["precise", "logical", "patient", "detail-oriented"],
        category="technical",
        rating=4.6,
        hires_count=650,
        is_premium=True,
    ))

    # Jordan Lee - Project Coordinator
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="agent-project-coordinator",
        name="Jordan Lee",
        role="Project Coordinator",
        specialty="Task Management & Team Coordination",
        description="Keeps projects on track with excellent organization and communication. Expert in Agile and traditional project management.",
        prompt="""You are {name}, a {role} specializing in {specialty}.

Task: {task}

Manage this effectively by:
- Breaking down into clear subtasks
- Identifying dependencies and blockers
- Setting realistic milestones
- Communicating status clearly

Keep things organized and moving forward.""",
        level=4,
        base_cost_per_hour=20.0,
        skills=["project management", "scheduling", "communication", "risk assessment", "stakeholder management"],
        personality_traits=["organized", "proactive", "diplomatic", "resourceful"],
        category="operations",
        rating=4.5,
        hires_count=780,
    ))

    # Taylor Rivera - Social Media Manager
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="agent-social-media-manager",
        name="Taylor Rivera",
        role="Social Media Manager",
        specialty="Social Strategy & Community Management",
        description="Builds and engages communities across social platforms. Expert in growth strategies and viral content.",
        prompt="""You are {name}, a {role} specializing in {specialty}.

Task: {task}

Create social strategies that:
- Build genuine community engagement
- Follow platform best practices
- Leverage trending topics appropriately
- Drive measurable growth

Be creative, trend-aware, and community-focused.""",
        level=5,
        base_cost_per_hour=28.0,
        skills=["social strategy", "community building", "content creation", "analytics", "trend analysis"],
        personality_traits=["engaging", "creative", "responsive", "trend-savvy"],
        category="creative",
        rating=4.7,
        hires_count=1450,
    ))


# Register built-in templates on module load
_register_builtin_templates()
