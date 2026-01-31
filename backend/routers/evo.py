"""
Evo Router

Handles Evo AI COO endpoints - chat, analyze, workflow design.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from schemas import (
    EvoChatRequest, EvoChatResponse,
    EvoTaskAnalysisRequest, EvoTaskAnalysisResponse,
    EvoWorkflowRequest, EvoWorkflowResponse
)
from models import User, Team, Agent, ChatMessage
from evo_service import evo_service

router = APIRouter(prefix="/api/evo", tags=["Evo AI"])


@router.post("/chat", response_model=EvoChatResponse)
async def evo_chat(
    request: EvoChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with Evo, the AI Manager.

    Evo is the Chief Operating Officer of your AI workforce.
    She can help with:
    - Understanding and analyzing tasks
    - Suggesting which agents to hire
    - Planning workflows
    - Coordinating your team
    """
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == request.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Get team's agents for context
    agents = db.query(Agent).filter(Agent.team_id == request.team_id).all()
    agent_list = [
        {
            "name": a.name,
            "role": a.role,
            "specialty": a.specialty,
            "level": a.level,
            "skills": a.skills
        }
        for a in agents
    ]

    # Get recent chat history for context
    recent_messages = db.query(ChatMessage).filter(
        ChatMessage.team_id == request.team_id,
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.desc()).limit(10).all()

    history = [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(recent_messages)
    ]

    # Save user message
    user_message = ChatMessage(
        team_id=request.team_id,
        user_id=current_user.id,
        role="user",
        content=request.message,
        context={"source": "evo_chat"}
    )
    db.add(user_message)

    # Get response from Evo
    result = evo_service.chat(
        message=request.message,
        team_id=request.team_id,
        team_name=team.name,
        agents=agent_list,
        history=history,
        context=request.context
    )

    # Save Evo's response
    if result.get("success"):
        evo_message = ChatMessage(
            team_id=request.team_id,
            user_id=current_user.id,
            role="evo",
            content=result.get("response", ""),
            context={"source": "evo_chat"}
        )
        db.add(evo_message)

    db.commit()

    return EvoChatResponse(
        success=result.get("success", False),
        response=result.get("response", ""),
        team_id=request.team_id,
        timestamp=result.get("timestamp"),
        error=result.get("error")
    )


@router.post("/analyze", response_model=EvoTaskAnalysisResponse)
async def evo_analyze_task(
    request: EvoTaskAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ask Evo to analyze a task.

    Evo will:
    - Break down the task into subtasks
    - Suggest which specialist agents are needed
    - Identify assumptions being made
    - Ask clarifying questions
    - Estimate complexity

    This is the first step in creating an operation.
    """
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == request.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Get team's agents for context
    agents = db.query(Agent).filter(Agent.team_id == request.team_id).all()
    agent_list = [
        {
            "name": a.name,
            "role": a.role,
            "specialty": a.specialty,
            "level": a.level,
            "skills": a.skills
        }
        for a in agents
    ]

    # Analyze the task
    result = evo_service.analyze_task(
        task=request.task,
        team_id=request.team_id,
        team_name=team.name,
        agents=agent_list,
        context=request.context or ""
    )

    if result.get("success"):
        return EvoTaskAnalysisResponse(
            success=True,
            analysis=result.get("analysis"),
            raw_response=result.get("raw_response"),
            team_id=request.team_id,
            parse_error=result.get("parse_error", False)
        )
    else:
        return EvoTaskAnalysisResponse(
            success=False,
            team_id=request.team_id,
            error=result.get("error")
        )


@router.post("/workflow", response_model=EvoWorkflowResponse)
async def evo_design_workflow(
    request: EvoWorkflowRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ask Evo to design a workflow for a task.

    Based on a task (and optionally a previous analysis),
    Evo will design an optimal workflow with:
    - Clear steps and dependencies
    - Agent assignments
    - Cost and time estimates

    The workflow can then be used to create an operation.
    """
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == request.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Get team's agents for context
    agents = db.query(Agent).filter(Agent.team_id == request.team_id).all()
    agent_list = [
        {
            "name": a.name,
            "role": a.role,
            "specialty": a.specialty,
            "level": a.level,
            "skills": a.skills
        }
        for a in agents
    ]

    # If no analysis provided, run analysis first
    analysis = request.analysis
    if not analysis:
        analysis_result = evo_service.analyze_task(
            task=request.task,
            team_id=request.team_id,
            team_name=team.name,
            agents=agent_list
        )
        if analysis_result.get("success"):
            analysis = analysis_result.get("analysis", {})
        else:
            return EvoWorkflowResponse(
                success=False,
                error="Failed to analyze task before workflow design"
            )

    # Design the workflow
    result = evo_service.suggest_workflow(
        task=request.task,
        analysis=analysis,
        agents=agent_list
    )

    if result.get("success"):
        return EvoWorkflowResponse(
            success=True,
            workflow=result.get("workflow"),
            raw_response=result.get("raw_response"),
            parse_error=result.get("parse_error", False)
        )
    else:
        return EvoWorkflowResponse(
            success=False,
            error=result.get("error")
        )


@router.post("/quick-task")
async def evo_quick_task(
    request: EvoTaskAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Quick end-to-end task processing with Evo.

    In one call, Evo will:
    1. Analyze the task
    2. Design a workflow
    3. Return everything needed to create an operation

    This is a convenience endpoint for simple task flows.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[quick-task] Starting for task: {request.task[:50]}...")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == request.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Get team's agents
    agents = db.query(Agent).filter(Agent.team_id == request.team_id).all()
    agent_list = [
        {
            "name": a.name,
            "role": a.role,
            "specialty": a.specialty,
            "level": a.level,
            "skills": a.skills
        }
        for a in agents
    ]
    logger.info(f"[quick-task] Found {len(agent_list)} agents for team {team.name}")

    # Step 1: Analyze
    logger.info("[quick-task] Step 1: Analyzing task...")
    analysis_result = evo_service.analyze_task(
        task=request.task,
        team_id=request.team_id,
        team_name=team.name,
        agents=agent_list,
        context=request.context or ""
    )

    if not analysis_result.get("success"):
        logger.error(f"[quick-task] Analysis failed: {analysis_result.get('error')}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Task analysis failed: {analysis_result.get('error')}"
        )

    analysis = analysis_result.get("analysis", {})
    logger.info(f"[quick-task] Analysis complete. Subtasks: {len(analysis.get('subtasks', []))}")

    # Step 2: Design workflow
    logger.info("[quick-task] Step 2: Designing workflow...")
    workflow_result = evo_service.suggest_workflow(
        task=request.task,
        analysis=analysis,
        agents=agent_list
    )
    logger.info(f"[quick-task] Workflow complete. Success: {workflow_result.get('success')}")

    workflow = workflow_result.get("workflow") if workflow_result.get("success") else None
    response = {
        "success": True,
        "task": request.task,
        "team_id": request.team_id,
        "analysis": analysis,
        "workflow": workflow,
        "has_questions": len(analysis.get("questions", [])) > 0,
        "questions": analysis.get("questions", []),
        "assumptions": analysis.get("assumptions", []),
        "suggested_agents": analysis.get("suggested_agents", []),
        "ready_to_execute": len(analysis.get("questions", [])) == 0
    }

    print(f"\n{'='*60}")
    print(f"[quick-task] FINAL RESPONSE:")
    print(f"[quick-task]   - Success: True")
    print(f"[quick-task]   - Analysis subtasks: {len(analysis.get('subtasks', []))}")
    if workflow:
        print(f"[quick-task]   - Workflow title: {workflow.get('title')}")
        print(f"[quick-task]   - Workflow steps: {len(workflow.get('steps', []))}")
    else:
        print(f"[quick-task]   - Workflow: None")
    print(f"{'='*60}\n")

    return response
