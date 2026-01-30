"""
Teams Router

Handles team CRUD operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
from auth import get_current_user
from schemas import TeamCreate, TeamUpdate, TeamResponse
from models import User, Team, Agent, Operation

router = APIRouter(prefix="/api/teams", tags=["Teams"])


def calculate_team_stats(db: Session, team_id: int) -> dict:
    """Calculate real-time stats for a team from the database"""
    from datetime import datetime, timedelta

    # Count agents
    total_agents = db.query(func.count(Agent.id)).filter(Agent.team_id == team_id).scalar() or 0
    active_agents = db.query(func.count(Agent.id)).filter(
        Agent.team_id == team_id,
        Agent.is_online == True
    ).scalar() or 0

    # Count operations
    total_operations = db.query(func.count(Operation.id)).filter(
        Operation.team_id == team_id
    ).scalar() or 0

    # Operations this week
    week_ago = datetime.utcnow() - timedelta(days=7)
    operations_this_week = db.query(func.count(Operation.id)).filter(
        Operation.team_id == team_id,
        Operation.created_at >= week_ago
    ).scalar() or 0

    # Calculate spend (from operations)
    total_spend = db.query(func.sum(Operation.actual_cost)).filter(
        Operation.team_id == team_id
    ).scalar() or 0.0

    # Spend this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    spend_this_month = db.query(func.sum(Operation.actual_cost)).filter(
        Operation.team_id == team_id,
        Operation.created_at >= month_start
    ).scalar() or 0.0

    # Average operation cost
    avg_cost = total_spend / total_operations if total_operations > 0 else 0.0

    return {
        "totalAgents": total_agents,
        "activeAgents": active_agents,
        "totalOperations": total_operations,
        "operationsThisWeek": operations_this_week,
        "totalSpend": float(total_spend),
        "spendThisMonth": float(spend_this_month),
        "avgOperationCost": float(avg_cost)
    }


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new team for the current user"""
    # Convert settings to dict
    settings_dict = team_data.settings.dict() if team_data.settings else {}

    # Initialize default stats
    stats_dict = {
        "totalAgents": 0,
        "activeAgents": 0,
        "totalOperations": 0,
        "operationsThisWeek": 0,
        "totalSpend": 0.0,
        "spendThisMonth": 0.0,
        "avgOperationCost": 0.0
    }

    new_team = Team(
        user_id=current_user.id,
        name=team_data.name,
        description=team_data.description,
        icon=team_data.icon,
        color=team_data.color,
        settings=settings_dict,
        stats=stats_dict,
        status="active"
    )

    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    return new_team


@router.get("", response_model=List[TeamResponse])
async def get_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all teams for the current user with real-time stats"""
    teams = db.query(Team).filter(Team.user_id == current_user.id).all()

    # Calculate real-time stats for each team
    for team in teams:
        team.stats = calculate_team_stats(db, team.id)

    return teams


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific team by ID with real-time stats"""
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Calculate real-time stats
    team.stats = calculate_team_stats(db, team.id)

    return team


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a team"""
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Update fields if provided
    update_data = team_data.dict(exclude_unset=True)

    # Handle settings separately
    if "settings" in update_data and update_data["settings"]:
        update_data["settings"] = update_data["settings"].dict() if hasattr(update_data["settings"], "dict") else update_data["settings"]

    # Handle stats separately
    if "stats" in update_data and update_data["stats"]:
        update_data["stats"] = update_data["stats"].dict() if hasattr(update_data["stats"], "dict") else update_data["stats"]

    for key, value in update_data.items():
        setattr(team, key, value)

    db.commit()
    db.refresh(team)

    return team


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a team"""
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    db.delete(team)
    db.commit()

    return None
