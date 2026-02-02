"""
Operations Router

Handles operation/task CRUD, execution, and real-time updates.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Any, Generator
import json
import time
import asyncio

from database import get_db
from auth import get_current_user
from schemas import OperationCreate, OperationUpdate, OperationResponse, ExecutionControlResponse
from models import User, Team, Operation, Agent, VaultFile, WorkflowExecution
from llm_service import llm_service
from core.agents.registry import AGENT_REGISTRY
from core.workflows.execution_state import EXECUTION_REGISTRY, ExecutionSignal
from core.runtime import ExecutionContext, AgentState, ToolState, NodeMetrics

router = APIRouter(prefix="/api/operations", tags=["Operations"])


@router.post("", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
async def create_operation(
    operation_data: OperationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new operation/task"""
    print(f"\n[operations] Creating operation: {operation_data.title}")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation_data.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Handle both old format (workflowNodes) and new format (workflow_config)
    agent_ids = []
    workflow_config = {}
    estimated_cost = operation_data.cost

    if operation_data.workflowNodes:
        # Old format: workflowNodes with assigned agents
        print(f"[operations] Using workflowNodes format: {len(operation_data.workflowNodes)} nodes")
        agent_ids = [node.agentId for node in operation_data.workflowNodes if node.agentId]
        workflow_config = {
            "nodes": [node.dict() for node in operation_data.workflowNodes]
        }
    elif operation_data.workflow_config:
        # New format: workflow_config from Evo (roles, not assigned agents)
        print(f"[operations] Using workflow_config format")
        wc = operation_data.workflow_config
        workflow_config = {
            "title": wc.title,
            "description": wc.description,
            "nodes": wc.nodes or [],
            "estimated_time": wc.estimated_time,
            "estimated_cost": wc.estimated_cost
        }
        estimated_cost = wc.estimated_cost or operation_data.cost
        print(f"[operations]   - Title: {wc.title}")
        print(f"[operations]   - Nodes: {len(wc.nodes or [])}")
    else:
        # No workflow - empty operation
        print(f"[operations] No workflow data provided")
        workflow_config = {"nodes": []}

    # Create operation
    operation = Operation(
        team_id=operation_data.team_id,
        title=operation_data.title,
        description=operation_data.description,
        status=operation_data.status,
        workflow_config=workflow_config,
        assigned_agent_ids=agent_ids,
        estimated_cost=estimated_cost,
        actual_cost=operation_data.cost,
        started_at=datetime.now(timezone.utc) if operation_data.status == "active" else None
    )

    db.add(operation)
    db.commit()
    db.refresh(operation)

    print(f"[operations] Created operation ID: {operation.id}")
    return operation


@router.get("", response_model=List[OperationResponse])
async def get_operations(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all operations for a team"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Get operations
    operations = db.query(Operation).filter(
        Operation.team_id == team_id
    ).order_by(Operation.created_at.desc()).all()

    return operations


@router.get("/{operation_id}", response_model=OperationResponse)
async def get_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific operation"""
    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return operation


@router.patch("/{operation_id}", response_model=OperationResponse)
async def update_operation(
    operation_id: int,
    operation_data: OperationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an operation's status, progress, etc."""
    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Update fields
    update_data = operation_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(operation, field, value)

    # Set completed_at if status changed to completed
    if operation_data.status == "completed" and not operation.completed_at:
        operation.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(operation)

    return operation


@router.delete("/{operation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an operation"""
    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    db.delete(operation)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ==================== EXECUTION ENDPOINTS ====================

def _infer_task_type(title: str, description: str) -> str:
    """
    Infer the task type from title and description.
    Used for grouping similar workflows for evolution comparison.
    """
    text = (title + " " + description).lower()

    if any(w in text for w in ["brand", "branding", "logo", "identity"]):
        return "branding"
    elif any(w in text for w in ["content", "blog", "article", "write", "writing"]):
        return "content_creation"
    elif any(w in text for w in ["social", "instagram", "twitter", "linkedin", "post"]):
        return "social_media"
    elif any(w in text for w in ["market", "research", "analysis", "analyze"]):
        return "research"
    elif any(w in text for w in ["design", "visual", "graphic", "ui", "ux"]):
        return "design"
    elif any(w in text for w in ["campaign", "marketing", "ads", "advertising"]):
        return "marketing"
    elif any(w in text for w in ["strategy", "plan", "planning"]):
        return "strategy"
    else:
        return "general"


def generate_execution_events(
    operation: Operation,
    team: Team,
    agents: List[Agent],
    db: Session,
    start_index: int = 0,
    is_resume: bool = False,
    existing_context: ExecutionContext = None
) -> Generator[str, None, None]:
    """
    Generate SSE events for operation execution.

    Now uses ExecutionContext for stateful execution tracking.
    The context holds memory, agent states, tool states, and metrics.
    """

    def emit(event_type: str, data: Dict[str, Any]) -> str:
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"

    print(f"\n[execute] Starting execution for operation {operation.id} (resume={is_resume}, start_index={start_index})")

    # Get workflow nodes
    workflow_config = operation.workflow_config or {}
    nodes = workflow_config.get("nodes", [])

    if not nodes:
        yield emit("error", {"message": "No workflow nodes defined"})
        return

    # ==================== EXECUTION CONTEXT ====================
    # Create or restore ExecutionContext - this is the stateful environment
    if existing_context:
        context = existing_context
        context.resume()
        print(f"[execute] Restored context from checkpoint")
    else:
        context = ExecutionContext(
            operation_id=operation.id,
            team_id=operation.team_id
        )
        # Store initial memory
        context.add_to_memory("task_goal", operation.title)
        context.add_to_memory("task_description", operation.description)
        context.add_to_memory("team_name", team.name)

        # Compute workflow signature for evolution tracking
        agent_roles = [node.get("agentRole", node.get("agent_role", "")) for node in nodes]
        context.compute_workflow_signature(agents=agent_roles)
        print(f"[execute] Created new context with signature: {context.workflow_signature}")

    context.start(total_nodes=len(nodes))
    context.current_node_index = start_index

    # Register execution in the registry
    EXECUTION_REGISTRY.register(operation.id)

    try:
        if is_resume:
            yield emit("resumed", {
                "operation_id": operation.id,
                "from_node": start_index,
                "total_nodes": len(nodes),
                "context_signature": context.workflow_signature,
            })
        else:
            yield emit("start", {
                "operation_id": operation.id,
                "title": operation.title,
                "total_nodes": len(nodes),
                "context_signature": context.workflow_signature,
            })

        # Update operation status
        operation.status = "active"
        if not is_resume:
            operation.started_at = datetime.now(timezone.utc)
        operation.execution_checkpoint = None  # Clear any existing checkpoint
        db.commit()

        # Create agent lookup by role
        agent_by_role = {}
        for agent in agents:
            role_lower = agent.role.lower()
            agent_by_role[role_lower] = agent
            # Also add by specialty
            if agent.specialty:
                agent_by_role[agent.specialty.lower()] = agent

        # Execute each node (starting from start_index for resume)
        for idx, node in enumerate(nodes[start_index:], start=start_index):
            node_id = node.get("id", f"step-{idx+1}")
            node_name = node.get("name", f"Step {idx+1}")
            node_desc = node.get("description", "")
            agent_role = node.get("agentRole", node.get("agent_role", "General Agent"))

            # CHECK SIGNAL before each node
            state = EXECUTION_REGISTRY.get(operation.id)
            if state:
                if state.signal == ExecutionSignal.CANCEL_REQUESTED:
                    print(f"[execute] Cancel requested at node {idx}")
                    context.status = "cancelled"
                    # Save context checkpoint
                    operation.workflow_config = workflow_config
                    operation.status = "cancelled"
                    operation.execution_checkpoint = context.to_checkpoint()
                    db.commit()
                    EXECUTION_REGISTRY.confirm_cancelled(operation.id)
                    yield emit("cancelled", {
                        "operation_id": operation.id,
                        "at_node": idx,
                        "node_name": node_name,
                        "total_cost": context.metrics.total_cost,
                        "context_summary": context.get_summary(),
                    })
                    return

                if state.signal == ExecutionSignal.PAUSE_REQUESTED:
                    print(f"[execute] Pause requested at node {idx}")
                    context.pause()
                    # Save full context checkpoint for resume
                    operation.execution_checkpoint = context.to_checkpoint()
                    operation.workflow_config = workflow_config
                    operation.status = "paused"
                    db.commit()
                    EXECUTION_REGISTRY.confirm_paused(operation.id)
                    yield emit("paused", {
                        "operation_id": operation.id,
                        "at_node": idx,
                        "node_name": node_name,
                        "total_cost": context.metrics.total_cost,
                        "context_summary": context.get_summary(),
                    })
                    return

            print(f"[execute] Node {idx+1}/{len(nodes)}: {node_name}")

            # Find best matching agent
            assigned_agent = None
            role_lower = agent_role.lower()
            for key in agent_by_role:
                if key in role_lower or role_lower in key:
                    assigned_agent = agent_by_role[key]
                    break
            if not assigned_agent and agents:
                assigned_agent = agents[0]

            agent_name = assigned_agent.name if assigned_agent else "System Agent"
            agent_photo = assigned_agent.photo_url if assigned_agent else None
            agent_id = assigned_agent.id if assigned_agent else 0

            # ==================== NODE START ====================
            # Track in context
            context.start_node(node_id, agent_name)
            context.current_node_index = idx

            # Emit node start
            yield emit("node_start", {
                "node_id": node_id,
                "node_index": idx,
                "name": node_name,
                "description": node_desc,
                "agent_name": agent_name,
                "agent_photo": agent_photo,
                "agent_role": agent_role,
            })

            time.sleep(0.5)

            # ==================== TOOL USAGE ====================
            # Tool usage simulation based on agent specialty
            tools_used = []
            if "brand" in agent_role.lower() or "strategist" in agent_role.lower():
                tools_used = ["Market Research", "Competitive Analysis", "Brand Audit"]
            elif "content" in agent_role.lower() or "creator" in agent_role.lower():
                tools_used = ["Content Generator", "SEO Analyzer", "Tone Checker"]
            elif "visual" in agent_role.lower() or "design" in agent_role.lower():
                tools_used = ["Color Palette Generator", "Typography Selector", "Brand Kit Builder"]
            elif "social" in agent_role.lower():
                tools_used = ["Platform Analytics", "Trend Analyzer", "Engagement Optimizer"]
            else:
                tools_used = ["Research Tool", "Analysis Engine"]

            for tool in tools_used:
                yield emit("tool_use", {
                    "node_id": node_id,
                    "agent_name": agent_name,
                    "tool": tool,
                    "status": "running",
                })
                tool_start = time.time()
                time.sleep(0.3)

                # Track tool execution in context
                tool_state = ToolState(
                    tool_id=f"tool-{tool.lower().replace(' ', '-')}",
                    tool_name=tool,
                    input_data={"node_id": node_id, "task": node_name},
                    output_data={"status": "simulated"},
                    executed_at=datetime.now(timezone.utc).isoformat(),
                    latency_ms=int((time.time() - tool_start) * 1000),
                    cost=0.0,
                    success=True
                )
                context.add_tool_execution(tool_state)

                yield emit("tool_use", {
                    "node_id": node_id,
                    "agent_name": agent_name,
                    "tool": tool,
                    "status": "completed",
                })

            # Progress updates
            for progress in [25, 50, 75]:
                yield emit("progress", {
                    "node_id": node_id,
                    "progress": progress,
                })
                time.sleep(0.3)

            # ==================== LLM CALL ====================
            yield emit("llm_call", {
                "node_id": node_id,
                "agent_name": agent_name,
                "status": "calling",
                "message": f"Executing: {node_name}",
            })

            llm_response = ""
            tokens_used = 0
            node_cost = 0.0
            node_success = False

            try:
                # Build task prompt with context from previous agents
                previous_outputs = context.get_all_agent_outputs()
                context_section = ""
                if previous_outputs:
                    context_section = "\n\nPrevious work from team:\n"
                    for prev_agent, prev_output in previous_outputs.items():
                        context_section += f"- {prev_agent}: {prev_output[:100]}...\n"

                task_prompt = f"""You are {agent_name}, a {agent_role}.

Task: {node_name}
Description: {node_desc}

Context: {operation.description}
{context_section}
Provide a concise professional output for this task. Be specific and actionable.
Keep your response under 200 words."""

                print(f"[execute] Calling LLM for node {node_id}...")
                llm_response = llm_service.simple_chat(task_prompt)
                print(f"[execute] LLM response received: {len(llm_response)} chars")

                # Estimate tokens (rough: 4 chars per token)
                tokens_used = len(task_prompt) // 4 + len(llm_response) // 4

                yield emit("llm_call", {
                    "node_id": node_id,
                    "agent_name": agent_name,
                    "status": "completed",
                    "output_preview": llm_response[:200] + "..." if len(llm_response) > 200 else llm_response,
                })

                # Store result in workflow config
                node["result"] = llm_response
                node["status"] = "completed"
                node_success = True

            except Exception as e:
                print(f"[execute] LLM error: {e}")
                yield emit("llm_call", {
                    "node_id": node_id,
                    "agent_name": agent_name,
                    "status": "error",
                    "error": str(e),
                })
                node["status"] = "failed"
                node["error"] = str(e)

            # Calculate cost (simple estimate)
            if assigned_agent:
                node_cost = assigned_agent.cost_per_hour * 0.1  # 6 min per node

            # ==================== UPDATE CONTEXT ====================
            # Record agent state in context
            agent_state = AgentState(
                agent_id=agent_id,
                agent_name=agent_name,
                role=agent_role,
                output=llm_response,
                started_at=context.node_metrics.get(node_id, NodeMetrics(node_id, agent_name)).started_at,
                completed_at=datetime.now(timezone.utc).isoformat(),
                tokens_used=tokens_used,
                cost=node_cost,
                xp_earned=25 if node_success else 0
            )
            context.set_agent_state(agent_name, agent_state)

            # Complete node in context
            context.complete_node(
                node_id,
                success=node_success,
                cost=node_cost,
                tokens_used=tokens_used,
                error=node.get("error")
            )

            yield emit("progress", {
                "node_id": node_id,
                "progress": 100,
            })

            # Node complete
            yield emit("node_complete", {
                "node_id": node_id,
                "node_index": idx,
                "status": node.get("status", "completed"),
                "agent_name": agent_name,
                "context_metrics": {
                    "total_cost": context.metrics.total_cost,
                    "total_tokens": context.metrics.total_tokens,
                    "nodes_completed": context.metrics.nodes_completed,
                }
            })

            # Update agent stats in DB
            if assigned_agent:
                assigned_agent.tasks_completed += 1
                assigned_agent.experience_points += 25
                db.commit()

                yield emit("agent_xp", {
                    "agent_id": assigned_agent.id,
                    "agent_name": agent_name,
                    "xp_gained": 25,
                    "new_total": assigned_agent.experience_points,
                })

            # Update execution registry progress
            EXECUTION_REGISTRY.update_progress(operation.id, idx + 1, {"id": node_id, "status": "completed"})
            context.advance_node()

            time.sleep(0.2)

        # ==================== EXECUTION COMPLETE ====================
        context.complete(success=True)

        # Update operation
        operation.workflow_config = workflow_config
        operation.status = "completed"
        operation.actual_cost = context.metrics.total_cost
        operation.completed_at = datetime.now(timezone.utc)
        operation.execution_checkpoint = None  # Clear checkpoint on completion
        db.commit()

        # ==================== SAVE WORKFLOW EXECUTION (for evolution) ====================
        try:
            workflow_execution = WorkflowExecution(
                operation_id=operation.id,
                team_id=operation.team_id,
                workflow_signature=context.workflow_signature,
                task_type=_infer_task_type(operation.title, operation.description),
                team_composition=[
                    {"agent_id": state.agent_id, "agent_name": name, "role": state.role}
                    for name, state in context.agent_states.items()
                ],
                agents_used=list(context.agent_states.keys()),
                cost=context.metrics.total_cost,
                latency_ms=context.metrics.total_latency_ms,
                tokens_used=context.metrics.total_tokens,
                nodes_total=context.metrics.nodes_total,
                nodes_completed=context.metrics.nodes_completed,
                nodes_failed=context.metrics.nodes_failed,
                node_metrics={
                    node_id: metrics.to_dict()
                    for node_id, metrics in context.node_metrics.items()
                },
                assumptions_raised=len(context.assumptions),
                assumptions_answered=len([a for a in context.assumptions if a.get("answered")]),
                status="completed",
                context_snapshot=context.to_checkpoint(),
                started_at=operation.started_at,
                completed_at=operation.completed_at,
            )
            db.add(workflow_execution)
            db.commit()
            print(f"[execute] Saved WorkflowExecution record (ID: {workflow_execution.id})")
        except Exception as e:
            print(f"[execute] Error saving WorkflowExecution: {e}")
            # Don't fail the operation if this fails

        # Save results to vault
        try:
            # Build results document
            results_content = f"# {operation.title}\n\n"
            results_content += f"**Description:** {operation.description}\n\n"
            results_content += f"**Completed:** {operation.completed_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            results_content += f"**Total Cost:** ${context.metrics.total_cost:.2f}\n\n"
            results_content += f"**Workflow Signature:** {context.workflow_signature}\n\n"
            results_content += "---\n\n"

            for node in nodes:
                node_name = node.get("name", "Untitled Step")
                node_result = node.get("result", "No output generated")
                agent_role = node.get("agentRole", node.get("agent_role", "Agent"))
                results_content += f"## {node_name}\n"
                results_content += f"**Agent:** {agent_role}\n\n"
                results_content += f"{node_result}\n\n"
                results_content += "---\n\n"

            # Create vault file
            vault_file = VaultFile(
                team_id=operation.team_id,
                operation_id=operation.id,
                name=f"{operation.title} - Results.md",
                file_type="md",
                folder_path="/Workflow Outputs",
                content=results_content,
                content_json=workflow_config,
                size_bytes=len(results_content.encode('utf-8')),
                mime_type="text/markdown",
                created_by="system",
                source_type="operation",
            )
            db.add(vault_file)
            db.commit()
            db.refresh(vault_file)

            print(f"[execute] Saved results to vault: {vault_file.name} (ID: {vault_file.id})")

            yield emit("file_saved", {
                "file_id": vault_file.id,
                "file_name": vault_file.name,
                "folder_path": vault_file.folder_path,
            })

        except Exception as e:
            print(f"[execute] Error saving to vault: {e}")
            # Don't fail the operation if vault save fails

        yield emit("complete", {
            "operation_id": operation.id,
            "status": "completed",
            "total_cost": total_cost,
            "duration_seconds": (operation.completed_at - operation.started_at).total_seconds(),
        })

        print(f"[execute] Operation {operation.id} completed!")

    finally:
        # Always unregister execution when done
        EXECUTION_REGISTRY.unregister(operation.id)


@router.post("/{operation_id}/execute")
async def execute_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute an operation with real-time SSE streaming.

    Returns a stream of events:
    - start: Execution started
    - node_start: Node execution started
    - tool_use: Agent using a tool
    - progress: Progress update
    - llm_call: LLM being called
    - node_complete: Node finished
    - agent_xp: Agent gained XP
    - complete: Execution finished
    - error: Error occurred
    """
    print(f"\n[execute] Execute request for operation {operation_id}")

    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Get team agents
    agents = db.query(Agent).filter(Agent.team_id == operation.team_id).all()

    return StreamingResponse(
        generate_execution_events(operation, team, agents, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/{operation_id}/status")
async def get_operation_status(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed execution status of an operation"""
    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    workflow_config = operation.workflow_config or {}
    nodes = workflow_config.get("nodes", [])

    completed_nodes = sum(1 for n in nodes if n.get("status") == "completed")
    failed_nodes = sum(1 for n in nodes if n.get("status") == "failed")
    progress = (completed_nodes / len(nodes) * 100) if nodes else 0

    return {
        "operation_id": operation.id,
        "status": operation.status,
        "progress": progress,
        "nodes_total": len(nodes),
        "nodes_completed": completed_nodes,
        "nodes_failed": failed_nodes,
        "workflow_config": workflow_config,
        "started_at": operation.started_at.isoformat() if operation.started_at else None,
        "completed_at": operation.completed_at.isoformat() if operation.completed_at else None,
        "actual_cost": operation.actual_cost,
        "execution_checkpoint": operation.execution_checkpoint,
        "is_running": EXECUTION_REGISTRY.is_registered(operation.id),
    }


# ==================== EXECUTION CONTROL ENDPOINTS ====================

@router.post("/{operation_id}/pause", response_model=ExecutionControlResponse)
async def pause_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Request pause at next node boundary.
    The execution will complete the current node, then pause.
    """
    print(f"\n[control] Pause request for operation {operation_id}")

    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Check if already paused
    if operation.status == "paused":
        return ExecutionControlResponse(
            success=True,
            status="already_paused",
            message="Operation is already paused",
            operation_id=operation_id,
            checkpoint=operation.execution_checkpoint
        )

    # Check if execution is running
    if not EXECUTION_REGISTRY.is_registered(operation_id):
        return ExecutionControlResponse(
            success=False,
            status="not_running",
            message="Operation is not currently running",
            operation_id=operation_id
        )

    # Request pause
    if EXECUTION_REGISTRY.request_pause(operation_id):
        return ExecutionControlResponse(
            success=True,
            status="pause_requested",
            message="Pause requested. Will pause after current node completes.",
            operation_id=operation_id
        )
    else:
        return ExecutionControlResponse(
            success=False,
            status="pause_failed",
            message="Could not pause operation. It may have already completed or been cancelled.",
            operation_id=operation_id
        )


@router.post("/{operation_id}/cancel", response_model=ExecutionControlResponse)
async def cancel_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a running or paused operation.
    If running, will cancel at next node boundary.
    If paused, will immediately mark as cancelled.
    """
    print(f"\n[control] Cancel request for operation {operation_id}")

    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Check if already cancelled
    if operation.status == "cancelled":
        return ExecutionControlResponse(
            success=True,
            status="already_cancelled",
            message="Operation is already cancelled",
            operation_id=operation_id
        )

    # If paused, directly cancel
    if operation.status == "paused":
        operation.status = "cancelled"
        db.commit()
        return ExecutionControlResponse(
            success=True,
            status="cancelled",
            message="Paused operation has been cancelled",
            operation_id=operation_id,
            checkpoint=operation.execution_checkpoint
        )

    # If running, request cancel
    if EXECUTION_REGISTRY.is_registered(operation_id):
        if EXECUTION_REGISTRY.request_cancel(operation_id):
            return ExecutionControlResponse(
                success=True,
                status="cancel_requested",
                message="Cancel requested. Will cancel after current node completes.",
                operation_id=operation_id
            )
        else:
            return ExecutionControlResponse(
                success=False,
                status="cancel_failed",
                message="Could not cancel operation",
                operation_id=operation_id
            )

    # Not running and not paused - check if it's already completed/failed
    if operation.status in ("completed", "failed"):
        return ExecutionControlResponse(
            success=False,
            status="already_finished",
            message=f"Operation has already {operation.status}",
            operation_id=operation_id
        )

    # Pending operation - just mark as cancelled
    operation.status = "cancelled"
    db.commit()
    return ExecutionControlResponse(
        success=True,
        status="cancelled",
        message="Pending operation has been cancelled",
        operation_id=operation_id
    )


@router.post("/{operation_id}/resume")
async def resume_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resume a paused operation.
    Returns an SSE stream starting from the checkpoint position.
    """
    print(f"\n[control] Resume request for operation {operation_id}")

    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Check if operation is paused
    if operation.status != "paused":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume: operation status is '{operation.status}', not 'paused'"
        )

    # Get checkpoint
    checkpoint = operation.execution_checkpoint
    if not checkpoint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No checkpoint found for paused operation"
        )

    # Restore ExecutionContext from checkpoint
    existing_context = None
    try:
        existing_context = ExecutionContext.from_checkpoint(checkpoint)
        print(f"[control] Restored ExecutionContext from checkpoint")
    except Exception as e:
        print(f"[control] Could not restore context: {e}, will create new one")

    start_index = checkpoint.get("current_node_index", 0)

    # Get team agents
    agents = db.query(Agent).filter(Agent.team_id == operation.team_id).all()

    print(f"[control] Resuming from node index {start_index}")

    return StreamingResponse(
        generate_execution_events(
            operation, team, agents, db,
            start_index=start_index,
            is_resume=True,
            existing_context=existing_context
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
