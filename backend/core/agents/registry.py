"""
Evolvian Agent Registry

Central registry for agent templates and instances.
Single source of truth for the agent marketplace.
"""

from typing import Dict, List, Optional, Any
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

    # Inputs/outputs for EvoAgentX compatibility
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
        """Create an EvolvianAgent instance from this template."""
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
    """

    def __init__(self):
        self._templates: Dict[str, AgentTemplate] = {}
        self._instances: Dict[str, EvolvianAgent] = {}
        self._lock = threading.Lock()

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

    def create_from_template(
        self,
        template_id: str,
        team_id: int = 0,
        custom_name: Optional[str] = None,
        agent_id: Optional[int] = None,
        register: bool = False
    ) -> Optional[EvolvianAgent]:
        """Create an agent from a template."""
        template = self.get_template(template_id)
        if not template:
            return None

        agent = template.create_agent(
            team_id=team_id,
            custom_name=custom_name,
            agent_id=agent_id
        )

        with self._lock:
            template.hires_count += 1

        if register and team_id:
            self.register_instance(agent)

        return agent

    def get_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        return {
            "total_templates": len(self._templates),
            "total_instances": len(self._instances),
            "categories": list(set(t.category for t in self._templates.values())),
        }


# Global registry singleton
AGENT_REGISTRY = AgentRegistry()


# ==================== Built-in Agent Templates ====================
# These are the 4 core agents for personal branding

def _register_builtin_templates():
    """Register the built-in agent templates"""

    # Brand Strategist
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="brand-strategist",
        name="Brand Strategist",
        role="Brand Strategist",
        specialty="Value Proposition & Brand Voice",
        description="Defines your unique value proposition, target audience, and brand voice. Creates mission statements, audience analysis, and tone guidelines.",
        system_prompt="""You are a Brand Strategist specializing in personal branding and positioning.

Your expertise includes:
- Defining unique value propositions
- Identifying and analyzing target audiences
- Crafting authentic brand voice and tone
- Creating mission and vision statements
- Developing brand positioning strategies

Always provide strategic, actionable guidance that helps build a distinctive and authentic personal brand.""",
        prompt="""Task: {task}

As a Brand Strategist, analyze this request and provide:
1. Strategic insights based on brand positioning principles
2. Clear, actionable recommendations
3. Considerations for target audience and market positioning

Focus on authenticity, differentiation, and sustainable brand building.""",
        level=5,
        base_cost_per_hour=35.0,
        skills=["brand positioning", "value proposition", "audience analysis", "tone guidelines", "mission statements"],
        personality_traits=["strategic", "analytical", "creative", "authentic"],
        category="branding",
        rating=4.8,
        is_featured=True,
    ))

    # Content Creator
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="content-creator",
        name="Content Creator",
        role="Content Creator",
        specialty="Written & Visual Content",
        description="Develops written and visual content including blogs, social posts, and newsletters. Expert in copywriting, storytelling, and content planning.",
        system_prompt="""You are a Content Creator specializing in personal brand content.

Your expertise includes:
- Blog posts and long-form articles
- Social media content and captions
- Newsletter writing and email sequences
- Storytelling and narrative development
- Content calendars and planning

Always create engaging, authentic content that resonates with the target audience while maintaining brand voice consistency.""",
        prompt="""Task: {task}

As a Content Creator, approach this by:
1. Understanding the content goals and audience
2. Applying storytelling principles
3. Maintaining brand voice consistency
4. Optimizing for the target platform

Deliver content that engages, informs, and drives action.""",
        level=4,
        base_cost_per_hour=28.0,
        skills=["copywriting", "storytelling", "content planning", "social media", "newsletters"],
        personality_traits=["creative", "adaptable", "engaging", "detail-oriented"],
        category="branding",
        rating=4.7,
    ))

    # Visual Designer
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="visual-designer",
        name="Visual Designer",
        role="Visual Designer",
        specialty="Logos, Graphics & Brand Assets",
        description="Creates logos, graphics, and visual assets aligned with your brand. Handles design templates, brand kits, and visual identity systems.",
        system_prompt="""You are a Visual Designer specializing in brand identity and visual assets.

Your expertise includes:
- Logo design and brand marks
- Color palette development
- Typography selection and pairing
- Social media graphics and templates
- Brand kit creation and guidelines
- Visual identity systems

Always create designs that are visually cohesive, memorable, and aligned with brand strategy.""",
        prompt="""Task: {task}

As a Visual Designer, consider:
1. Brand personality and visual direction
2. Target audience preferences
3. Platform requirements and specifications
4. Consistency with existing brand elements

Provide design guidance, concepts, or specifications that elevate the visual brand.""",
        level=4,
        base_cost_per_hour=32.0,
        skills=["logo design", "graphics", "brand kits", "templates", "visual identity"],
        personality_traits=["creative", "detail-oriented", "aesthetic", "consistent"],
        category="branding",
        rating=4.6,
    ))

    # Social Media Manager
    AGENT_REGISTRY.register_template(AgentTemplate(
        template_id="social-media-manager",
        name="Social Media Manager",
        role="Social Media Manager",
        specialty="Platform Strategy & Engagement",
        description="Plans platform-specific content and engagement strategies. Handles post scheduling, analytics interpretation, and community interaction.",
        system_prompt="""You are a Social Media Manager specializing in personal brand growth.

Your expertise includes:
- Platform-specific strategies (LinkedIn, Twitter/X, Instagram, etc.)
- Content scheduling and optimal timing
- Engagement tactics and community building
- Analytics and performance tracking
- Trend identification and leverage

Always focus on authentic engagement, sustainable growth, and platform best practices.""",
        prompt="""Task: {task}

As a Social Media Manager, provide:
1. Platform-specific recommendations
2. Engagement and growth strategies
3. Content timing and scheduling guidance
4. Community building tactics

Focus on building genuine connections and sustainable audience growth.""",
        level=4,
        base_cost_per_hour=25.0,
        skills=["social strategy", "content scheduling", "analytics", "community management", "engagement"],
        personality_traits=["responsive", "trend-aware", "community-focused", "analytical"],
        category="branding",
        rating=4.7,
    ))


# Register built-in templates on module load
_register_builtin_templates()
