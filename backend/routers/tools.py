"""
Tools Router

Handles tool catalog, installation, configuration, and assignment.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from schemas import (
    ToolCatalogItem, ToolInstallRequest, ToolConfigureRequest,
    ToolAssignRequest, InstalledToolResponse
)
from models import User, Team, InstalledTool

router = APIRouter(prefix="/api/tools", tags=["Tools"])

# Static tool catalog (can be moved to database later)
TOOL_CATALOG = [
    ToolCatalogItem(
        id="tool-websearch",
        name="Web Search",
        description="Search the web for information using multiple search engines",
        category="research",
        icon="🔍",
        pricing_model="per_call",
        price_per_call=0.01,
        capabilities=["search", "web", "information retrieval"],
        required_config=[]
    ),
    ToolCatalogItem(
        id="tool-browser",
        name="Web Browser",
        description="Browse and extract content from web pages",
        category="research",
        icon="🌐",
        pricing_model="per_call",
        price_per_call=0.02,
        capabilities=["browse", "scrape", "extract"],
        required_config=[]
    ),
    ToolCatalogItem(
        id="tool-code-executor",
        name="Code Executor",
        description="Execute Python code in a sandboxed environment",
        category="dev",
        icon="💻",
        pricing_model="per_call",
        price_per_call=0.05,
        capabilities=["python", "execute", "compute"],
        required_config=[],
        is_premium=True
    ),
    ToolCatalogItem(
        id="tool-file-manager",
        name="File Manager",
        description="Read, write, and manage files",
        category="data",
        icon="📁",
        pricing_model="free",
        capabilities=["read", "write", "files"],
        required_config=[]
    ),
    ToolCatalogItem(
        id="tool-email",
        name="Email Sender",
        description="Send emails via SMTP or email API",
        category="communication",
        icon="📧",
        pricing_model="per_call",
        price_per_call=0.01,
        capabilities=["email", "send", "notify"],
        required_config=["smtp_host", "smtp_user", "smtp_password"]
    ),
    ToolCatalogItem(
        id="tool-slack",
        name="Slack Integration",
        description="Send messages and interact with Slack channels",
        category="communication",
        icon="💬",
        pricing_model="free",
        capabilities=["slack", "messaging", "notifications"],
        required_config=["slack_webhook_url"]
    ),
    ToolCatalogItem(
        id="tool-image-gen",
        name="Image Generator",
        description="Generate images using AI (DALL-E, Stable Diffusion)",
        category="creative",
        icon="🎨",
        pricing_model="per_call",
        price_per_call=0.10,
        capabilities=["image", "generate", "creative"],
        required_config=[],
        is_premium=True
    ),
    ToolCatalogItem(
        id="tool-database",
        name="Database Query",
        description="Query SQL databases",
        category="data",
        icon="🗄️",
        pricing_model="per_call",
        price_per_call=0.02,
        capabilities=["sql", "database", "query"],
        required_config=["db_connection_string"]
    )
]


@router.get("/catalog", response_model=List[ToolCatalogItem])
async def get_tool_catalog(
    category: str = None,
    _current_user: User = Depends(get_current_user)
):
    """Get the available tools catalog"""
    if category:
        return [t for t in TOOL_CATALOG if t.category == category]
    return TOOL_CATALOG


@router.get("/installed", response_model=List[InstalledToolResponse])
async def get_installed_tools(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get installed tools for a team"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    tools = db.query(InstalledTool).filter(InstalledTool.team_id == team_id).all()
    return tools


@router.post("/install", response_model=InstalledToolResponse, status_code=status.HTTP_201_CREATED)
async def install_tool(
    install_data: ToolInstallRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Install a tool for a team"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == install_data.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Verify tool exists in catalog
    tool_info = next((t for t in TOOL_CATALOG if t.id == install_data.tool_id), None)
    if not tool_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found in catalog")

    # Check if already installed
    existing = db.query(InstalledTool).filter(
        InstalledTool.team_id == install_data.team_id,
        InstalledTool.tool_id == install_data.tool_id
    ).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tool already installed")

    # Check required config
    for req in tool_info.required_config:
        if req not in install_data.configuration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required configuration: {req}"
            )

    installed = InstalledTool(
        team_id=install_data.team_id,
        tool_id=install_data.tool_id,
        configuration=install_data.configuration,
        status="connected"
    )

    db.add(installed)
    db.commit()
    db.refresh(installed)

    return installed


@router.delete("/{tool_id}/uninstall", status_code=status.HTTP_204_NO_CONTENT)
async def uninstall_tool(
    tool_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uninstall a tool"""
    tool = db.query(InstalledTool).filter(InstalledTool.id == tool_id).first()

    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == tool.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(tool)
    db.commit()

    return None


@router.put("/{tool_id}/configure", response_model=InstalledToolResponse)
async def configure_tool(
    tool_id: int,
    config_data: ToolConfigureRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Configure an installed tool"""
    tool = db.query(InstalledTool).filter(InstalledTool.id == tool_id).first()

    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == tool.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    tool.configuration = config_data.configuration
    tool.status = "connected"

    db.commit()
    db.refresh(tool)

    return tool


@router.post("/{tool_id}/assign", response_model=InstalledToolResponse)
async def assign_tool_to_agents(
    tool_id: int,
    assign_data: ToolAssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a tool to specific agents"""
    tool = db.query(InstalledTool).filter(InstalledTool.id == tool_id).first()

    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == tool.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    tool.assigned_agent_ids = assign_data.agent_ids

    db.commit()
    db.refresh(tool)

    return tool
