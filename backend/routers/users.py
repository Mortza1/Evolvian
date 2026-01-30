"""
Users Router

Handles user preferences and objectives.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from schemas import (
    UserPreferencesUpdate, UserPreferencesResponse,
    UserObjectiveCreate, UserObjectiveResponse
)
from models import User, Team, UserPreference, UserObjective

router = APIRouter(prefix="/api/user", tags=["User"])


@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user preferences"""
    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()

    if not prefs:
        # Return defaults
        return UserPreferencesResponse()

    return UserPreferencesResponse(
        theme=prefs.theme,
        notifications_enabled=prefs.notifications_enabled,
        email_notifications=prefs.email_notifications,
        default_team_id=prefs.default_team_id,
        dashboard_layout=prefs.dashboard_layout,
        ai_interaction_style=prefs.ai_interaction_style
    )


@router.put("/preferences", response_model=UserPreferencesResponse)
async def update_user_preferences(
    prefs_data: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user preferences"""
    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()

    if not prefs:
        # Create new preferences
        prefs = UserPreference(user_id=current_user.id)
        db.add(prefs)

    # Update fields
    update_data = prefs_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)

    db.commit()
    db.refresh(prefs)

    return UserPreferencesResponse(
        theme=prefs.theme,
        notifications_enabled=prefs.notifications_enabled,
        email_notifications=prefs.email_notifications,
        default_team_id=prefs.default_team_id,
        dashboard_layout=prefs.dashboard_layout,
        ai_interaction_style=prefs.ai_interaction_style
    )


@router.get("/objectives", response_model=List[UserObjectiveResponse])
async def get_user_objectives(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's saved objectives"""
    objectives = db.query(UserObjective).filter(
        UserObjective.user_id == current_user.id
    ).order_by(UserObjective.created_at.desc()).all()

    return objectives


@router.post("/objectives", response_model=UserObjectiveResponse, status_code=status.HTTP_201_CREATED)
async def create_user_objective(
    objective_data: UserObjectiveCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a new objective"""
    # Verify team if provided
    if objective_data.team_id:
        team = db.query(Team).filter(
            Team.id == objective_data.team_id,
            Team.user_id == current_user.id
        ).first()

        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    objective = UserObjective(
        user_id=current_user.id,
        team_id=objective_data.team_id,
        title=objective_data.title,
        description=objective_data.description
    )

    db.add(objective)
    db.commit()
    db.refresh(objective)

    return objective
