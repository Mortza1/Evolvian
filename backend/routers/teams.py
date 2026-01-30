"""
Teams Router

Handles team CRUD operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from schemas import TeamCreate, TeamUpdate, TeamResponse
from models import User, Team

router = APIRouter(prefix="/api/teams", tags=["Teams"])


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
    """Get all teams for the current user"""
    teams = db.query(Team).filter(Team.user_id == current_user.id).all()
    return teams


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific team by ID"""
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

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
