"""Evolution stats, suggestions, compare, and agent-performance endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import User, Team
from core.runtime import EvolutionService

router = APIRouter()


@router.get("/evolution/stats/{team_id}")
async def get_evolution_stats(
    team_id: int,
    task_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get evolution statistics for a team.

    Returns workflow performance data grouped by task type.
    Shows best performing workflows, suggestions, and trends.
    """
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    evolution_service = EvolutionService(db=db, team_id=team_id)

    if task_type:
        task_types = [task_type]
    else:
        task_types = evolution_service.get_all_task_types()

    stats_by_type = {}
    for tt in task_types:
        stats = evolution_service.get_workflow_stats(tt)
        stats_by_type[tt] = stats.to_dict()

    return {
        "team_id": team_id,
        "task_types": task_types,
        "stats": stats_by_type,
        "total_task_types": len(task_types),
    }


@router.get("/evolution/suggestions/{team_id}")
async def get_evolution_suggestions(
    team_id: int,
    task_type: str,
    current_workflow_signature: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get improvement suggestions for a workflow.

    Based on historical performance data, suggests:
    - Better performing workflows to use
    - Agents to add or remove
    - Cost optimizations
    """
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    evolution_service = EvolutionService(db=db, team_id=team_id)

    best_workflow = evolution_service.select_best_workflow(task_type)

    suggestions = evolution_service.suggest_improvements(
        current_signature=current_workflow_signature,
        task_type=task_type
    )

    return {
        "team_id": team_id,
        "task_type": task_type,
        "current_signature": current_workflow_signature,
        "best_workflow": best_workflow.to_dict() if best_workflow else None,
        "suggestions": [s.to_dict() for s in suggestions],
    }


@router.get("/evolution/compare/{team_id}")
async def compare_workflows(
    team_id: int,
    task_type: str,
    signature_a: str,
    signature_b: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compare two workflows head-to-head.

    Shows performance metrics and declares a winner.
    """
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    evolution_service = EvolutionService(db=db, team_id=team_id)
    comparison = evolution_service.compare_workflows(signature_a, signature_b, task_type)

    return {
        "team_id": team_id,
        "task_type": task_type,
        **comparison
    }


@router.get("/evolution/agent-performance/{team_id}")
async def get_agent_performance(
    team_id: int,
    agent_name: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get per-agent performance stats aggregated from execution history.

    Returns agents sorted by avg_quality (leaderboard order).
    Optionally filter to a single agent with ?agent_name=...
    """
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    evolution_service = EvolutionService(db=db, team_id=team_id)
    performances = evolution_service.get_agent_performance(agent_name=agent_name)

    return {
        "team_id": team_id,
        "agents": [p.to_dict() for p in performances],
        "total_agents": len(performances),
    }
