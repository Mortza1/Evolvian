"""
Marketplace Router

Handles agent marketplace - browsing, hiring agents from templates.
Uses AGENT_REGISTRY as single source of truth for agent templates.
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
from core.agents.registry import AGENT_REGISTRY

router = APIRouter(prefix="/api/marketplace", tags=["Marketplace"])


def _get_categories_from_registry() -> List[MarketplaceCategoryResponse]:
    """Dynamically build categories from registered templates"""
    templates = AGENT_REGISTRY.list_templates()
    category_counts = {}

    for t in templates:
        category_counts[t.category] = category_counts.get(t.category, 0) + 1

    # Category metadata
    category_meta = {
        "branding": {"name": "Branding", "description": "Personal brand specialists", "icon": "✨"},
        "management": {"name": "Management", "description": "Leaders and coordinators", "icon": "👔"},
        "research": {"name": "Research", "description": "Analysts and investigators", "icon": "🔬"},
        "creative": {"name": "Creative", "description": "Writers, designers, and creators", "icon": "🎨"},
        "technical": {"name": "Technical", "description": "Developers and data experts", "icon": "💻"},
        "operations": {"name": "Operations", "description": "Process and workflow specialists", "icon": "⚙️"},
        "general": {"name": "General", "description": "Multi-purpose agents", "icon": "🤖"},
    }

    categories = []
    for cat_id, count in category_counts.items():
        meta = category_meta.get(cat_id, {"name": cat_id.title(), "description": f"{cat_id.title()} agents", "icon": "🤖"})
        categories.append(MarketplaceCategoryResponse(
            id=cat_id,
            name=meta["name"],
            description=meta["description"],
            icon=meta["icon"],
            agent_count=count
        ))

    return categories


@router.get("/agents", response_model=List[MarketplaceAgentTemplate])
async def browse_marketplace_agents(
    category: str = None,
    featured: bool = None,
    _current_user: User = Depends(get_current_user)
):
    """Browse available agent templates in the marketplace"""
    templates = AGENT_REGISTRY.list_templates(
        category=category,
        featured_only=featured if featured else False
    )

    # Convert to response format
    return [
        MarketplaceAgentTemplate(
            id=t.template_id,
            name=t.name,
            role=t.role,
            specialty=t.specialty,
            description=t.description,
            level=t.level,
            base_cost_per_hour=t.base_cost_per_hour,
            skills=t.skills,
            personality_traits=t.personality_traits,
            category=t.category,
            rating=t.rating,
            hires_count=t.hires_count,
            is_featured=t.is_featured,
            is_premium=t.is_premium,
            avatar_url=t.avatar_url
        )
        for t in templates
    ]


@router.get("/agents/{template_id}", response_model=MarketplaceAgentTemplate)
async def get_marketplace_agent(
    template_id: str,
    _current_user: User = Depends(get_current_user)
):
    """Get a specific agent template from the marketplace"""
    template = AGENT_REGISTRY.get_template(template_id)

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent template not found")

    return MarketplaceAgentTemplate(
        id=template.template_id,
        name=template.name,
        role=template.role,
        specialty=template.specialty,
        description=template.description,
        level=template.level,
        base_cost_per_hour=template.base_cost_per_hour,
        skills=template.skills,
        personality_traits=template.personality_traits,
        category=template.category,
        rating=template.rating,
        hires_count=template.hires_count,
        is_featured=template.is_featured,
        is_premium=template.is_premium,
        avatar_url=template.avatar_url
    )


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

    # Get template from registry
    template = AGENT_REGISTRY.get_template(hire_data.template_id)

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent template not found")

    # Create agent from template (uses registry's create method internally)
    agent = Agent(
        team_id=hire_data.team_id,
        name=hire_data.custom_name or template.name,
        role=template.role,
        specialty=template.specialty,
        level=template.level,
        photo_url=template.avatar_url,
        avatar_seed=template.template_id,
        rating=template.rating,
        cost_per_hour=template.base_cost_per_hour,
        skills=template.skills,
        personality_traits=template.personality_traits
    )

    db.add(agent)

    # Increment hire count in registry
    template.hires_count += 1

    db.commit()
    db.refresh(agent)

    return agent


@router.get("/categories", response_model=List[MarketplaceCategoryResponse])
async def get_marketplace_categories(
    _current_user: User = Depends(get_current_user)
):
    """Get agent marketplace categories (dynamically from registry)"""
    return _get_categories_from_registry()
