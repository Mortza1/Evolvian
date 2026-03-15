"""
Teams Router

Handles team CRUD operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Generator
import json
import time

from database import get_db
from auth import get_current_user
from schemas import TeamCreate, TeamUpdate, TeamResponse
from models import User, Team, Agent, Operation
from core.workflows.execution_state import EXECUTION_REGISTRY

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


def generate_team_events(team_id: int) -> Generator[str, None, None]:
    """
    Generate team-level SSE events for cross-view real-time updates.

    Monitors all operations for this team and emits events when:
    - Assumptions are raised (for badge count updates)
    - Assumptions are answered (for badge count updates)
    - Operations start/complete (for operation count updates)
    """
    from database import SessionLocal

    print(f"[team_events] Starting SSE stream for team {team_id}")

    # Create a dedicated database session for this stream
    db = SessionLocal()

    try:
        # Keep track of last known state to detect changes
        last_operation_ids = set()
        last_pending_count = 0
        last_active_count = 0

        # Initial state broadcast
        operations = db.query(Operation).filter(Operation.team_id == team_id).all()
        operation_ids = {op.id for op in operations}
        last_operation_ids = operation_ids

        # Count pending assumptions
        pending_count = sum(
            1 for op in operations
            if op.status == "waiting_for_input" and EXECUTION_REGISTRY.is_waiting_for_input(op.id)
        )
        last_pending_count = pending_count

        # Count active operations
        active_count = sum(1 for op in operations if op.status == "in_progress")
        last_active_count = active_count

        # Send initial state
        yield f"event: team_state\ndata: {json.dumps({'pending_assumptions': pending_count, 'active_operations': active_count, 'total_operations': len(operations)})}\n\n"

        while True:
            time.sleep(1)  # Poll every second

            # Refresh operations from DB
            db.expire_all()  # Clear SQLAlchemy cache to get fresh data
            operations = db.query(Operation).filter(Operation.team_id == team_id).all()
            current_operation_ids = {op.id for op in operations}

            # Check for new operations
            new_operations = current_operation_ids - last_operation_ids
            if new_operations:
                yield f"event: operation_created\ndata: {json.dumps({'count': len(new_operations)})}\n\n"
                last_operation_ids = current_operation_ids

            # Check for completed operations
            completed_operations = last_operation_ids - current_operation_ids
            if completed_operations:
                last_operation_ids = current_operation_ids

            # Count pending assumptions
            pending_count = 0
            pending_operations = []
            for op in operations:
                if op.status == "waiting_for_input" and EXECUTION_REGISTRY.is_waiting_for_input(op.id):
                    pending_count += 1
                    state = EXECUTION_REGISTRY.get_state(op.id)
                    if state and state.pending_assumption:
                        pending_operations.append({
                            "operation_id": op.id,
                            "operation_title": op.title,
                            "question": state.pending_assumption.get("question"),
                        })

            # Emit assumption_raised event if count increased
            if pending_count > last_pending_count:
                new_assumptions = pending_operations[-(pending_count - last_pending_count):]
                for assumption_data in new_assumptions:
                    yield f"event: assumption_raised\ndata: {json.dumps(assumption_data)}\n\n"
                last_pending_count = pending_count

            # Emit assumption_answered event if count decreased
            elif pending_count < last_pending_count:
                yield f"event: assumption_answered\ndata: {json.dumps({'pending_count': pending_count})}\n\n"
                last_pending_count = pending_count

            # Count active operations
            active_count = sum(1 for op in operations if op.status == "in_progress")

            # Emit active_operations_changed if count changed
            if active_count != last_active_count:
                yield f"event: active_operations_changed\ndata: {json.dumps({'active_count': active_count})}\n\n"
                last_active_count = active_count

    except GeneratorExit:
        print(f"[team_events] SSE stream closed for team {team_id}")
    except Exception as e:
        print(f"[team_events] Error in SSE stream: {e}")
        import traceback
        traceback.print_exc()
        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
    finally:
        try:
            db.close()
        except Exception:
            pass
        print(f"[team_events] Database session closed for team {team_id}")


@router.get("/{team_id}/events")
async def stream_team_events(
    team_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Stream team-level events for real-time cross-view updates.

    Events emitted:
    - team_state: Initial state (pending_assumptions, active_operations, total_operations)
    - assumption_raised: New assumption needs user input
    - assumption_answered: Assumption was answered
    - operation_created: New operation was created
    - active_operations_changed: Number of active operations changed
    """
    from database import SessionLocal

    # Use a short-lived session only for the auth check, then close it
    # immediately before starting the long-running SSE stream so we don't
    # hold a pool connection for the duration of the stream.
    check_db = SessionLocal()
    try:
        team = check_db.query(Team).filter(
            Team.id == team_id,
            Team.user_id == current_user.id
        ).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    finally:
        check_db.close()

    # Generator creates its own session for the long-running stream
    return StreamingResponse(
        generate_team_events(team_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
