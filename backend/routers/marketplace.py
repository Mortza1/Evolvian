"""
Marketplace Router

Handles agent marketplace - browsing, hiring agents from templates.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from schemas import (
    MarketplaceAgentTemplate, MarketplaceCategoryResponse,
    HireAgentRequest, AgentResponse
)
from models import User, Team, Agent

router = APIRouter(prefix="/api/marketplace", tags=["Marketplace"])

# Static agent templates catalog
AGENT_TEMPLATES = [
    MarketplaceAgentTemplate(
        id="agent-aria-martinez",
        name="Aria Martinez",
        role="Senior Brand Lead",
        specialty="Personal Branding & Executive Positioning",
        description="Expert in crafting and managing personal brands for executives and thought leaders. Specializes in LinkedIn presence, speaking engagements, and media positioning.",
        level=10,
        base_cost_per_hour=45.0,
        skills=["brand strategy", "content planning", "LinkedIn optimization", "media relations", "thought leadership"],
        personality_traits=["strategic", "creative", "detail-oriented", "persuasive"],
        category="management",
        rating=4.9,
        hires_count=1250,
        is_featured=True
    ),
    MarketplaceAgentTemplate(
        id="agent-research-analyst",
        name="Alex Chen",
        role="Research Analyst",
        specialty="Market Research & Competitive Analysis",
        description="Skilled at gathering, analyzing, and synthesizing information from multiple sources. Expert in market trends and competitive intelligence.",
        level=5,
        base_cost_per_hour=25.0,
        skills=["research", "data analysis", "report writing", "competitive analysis", "trend spotting"],
        personality_traits=["analytical", "thorough", "curious", "methodical"],
        category="research",
        rating=4.7,
        hires_count=890
    ),
    MarketplaceAgentTemplate(
        id="agent-content-writer",
        name="Maya Johnson",
        role="Content Writer",
        specialty="Blog Posts, Articles & Social Media",
        description="Creative writer specializing in engaging content across multiple platforms. Expert in SEO-optimized articles and viral social content.",
        level=6,
        base_cost_per_hour=30.0,
        skills=["copywriting", "SEO writing", "social media", "storytelling", "editing"],
        personality_traits=["creative", "adaptable", "deadline-driven", "empathetic"],
        category="creative",
        rating=4.8,
        hires_count=2100
    ),
    MarketplaceAgentTemplate(
        id="agent-data-analyst",
        name="Sam Park",
        role="Data Analyst",
        specialty="Data Processing & Visualization",
        description="Expert in transforming raw data into actionable insights. Skilled in Python, SQL, and visualization tools.",
        level=7,
        base_cost_per_hour=35.0,
        skills=["Python", "SQL", "data visualization", "statistics", "machine learning basics"],
        personality_traits=["precise", "logical", "patient", "detail-oriented"],
        category="technical",
        rating=4.6,
        hires_count=650,
        is_premium=True
    ),
    MarketplaceAgentTemplate(
        id="agent-project-coordinator",
        name="Jordan Lee",
        role="Project Coordinator",
        specialty="Task Management & Team Coordination",
        description="Keeps projects on track with excellent organization and communication. Expert in Agile and traditional project management.",
        level=4,
        base_cost_per_hour=20.0,
        skills=["project management", "scheduling", "communication", "risk assessment", "stakeholder management"],
        personality_traits=["organized", "proactive", "diplomatic", "resourceful"],
        category="operations",
        rating=4.5,
        hires_count=780
    ),
    MarketplaceAgentTemplate(
        id="agent-social-media-manager",
        name="Taylor Rivera",
        role="Social Media Manager",
        specialty="Social Strategy & Community Management",
        description="Builds and engages communities across social platforms. Expert in growth strategies and viral content.",
        level=5,
        base_cost_per_hour=28.0,
        skills=["social strategy", "community building", "content creation", "analytics", "trend analysis"],
        personality_traits=["engaging", "creative", "responsive", "trend-savvy"],
        category="creative",
        rating=4.7,
        hires_count=1450
    )
]

MARKETPLACE_CATEGORIES = [
    MarketplaceCategoryResponse(id="management", name="Management", description="Leaders and coordinators", icon="👔", agent_count=2),
    MarketplaceCategoryResponse(id="research", name="Research", description="Analysts and investigators", icon="🔬", agent_count=3),
    MarketplaceCategoryResponse(id="creative", name="Creative", description="Writers, designers, and creators", icon="🎨", agent_count=4),
    MarketplaceCategoryResponse(id="technical", name="Technical", description="Developers and data experts", icon="💻", agent_count=2),
    MarketplaceCategoryResponse(id="operations", name="Operations", description="Process and workflow specialists", icon="⚙️", agent_count=2),
]


@router.get("/agents", response_model=List[MarketplaceAgentTemplate])
async def browse_marketplace_agents(
    category: str = None,
    featured: bool = None,
    _current_user: User = Depends(get_current_user)
):
    """Browse available agent templates in the marketplace"""
    agents = AGENT_TEMPLATES

    if category:
        agents = [a for a in agents if a.category == category]

    if featured is not None:
        agents = [a for a in agents if a.is_featured == featured]

    return agents


@router.get("/agents/{template_id}", response_model=MarketplaceAgentTemplate)
async def get_marketplace_agent(
    template_id: str,
    _current_user: User = Depends(get_current_user)
):
    """Get a specific agent template from the marketplace"""
    template = next((a for a in AGENT_TEMPLATES if a.id == template_id), None)

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent template not found")

    return template


@router.post("/agents/hire", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def hire_marketplace_agent(
    hire_data: HireAgentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Hire an agent from the marketplace to a team"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == hire_data.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Get template
    template = next((a for a in AGENT_TEMPLATES if a.id == hire_data.template_id), None)

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent template not found")

    # Create agent from template
    agent = Agent(
        team_id=hire_data.team_id,
        name=hire_data.custom_name or template.name,
        role=template.role,
        specialty=template.specialty,
        level=template.level,
        photo_url=template.avatar_url,
        avatar_seed=template.id,
        rating=template.rating,
        cost_per_hour=template.base_cost_per_hour,
        skills=template.skills,
        personality_traits=template.personality_traits
    )

    db.add(agent)

    # Update team stats
    team.stats["totalAgents"] = team.stats.get("totalAgents", 0) + 1

    db.commit()
    db.refresh(agent)

    return agent


@router.get("/categories", response_model=List[MarketplaceCategoryResponse])
async def get_marketplace_categories(
    _current_user: User = Depends(get_current_user)
):
    """Get agent marketplace categories"""
    return MARKETPLACE_CATEGORIES
