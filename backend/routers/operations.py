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
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor

from database import get_db
from auth import get_current_user
from schemas import OperationCreate, OperationUpdate, OperationResponse, ExecutionControlResponse, RatingRequest, RatingResponse
from models import User, Team, Operation, Agent, VaultFile, WorkflowExecution, InstalledTool
from llm_service import llm_service, ChatMessage as LLMChatMessage
from core.agents.registry import AGENT_REGISTRY
from core.workflows.execution_state import EXECUTION_REGISTRY, ExecutionSignal
from core.runtime import (
    ExecutionContext, AgentState, ToolState, NodeMetrics, MemoryBridge,
    EvolutionService, WorkflowDNA, QualityEvaluator
)
from core.tools.executor import ToolExecutor, parse_tool_calls_from_response
from core.tools.registry import get_tool_registry

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


def _build_tools_prompt_section(agent_tools: list) -> str:
    """
    Build a prompt section describing available tools for the agent.

    Args:
        agent_tools: List of (EvolvianTool, config) tuples from registry.get_tools_for_agent()

    Returns:
        Prompt text describing tools, or "" if no tools available.
    """
    if not agent_tools:
        return ""

    lines = ["\n## Available Tools\nYou have access to the following tools. To use a tool, include a <tool_call> tag in your response:\n"]
    for tool, _config in agent_tools:
        param_parts = []
        for p in tool.parameters:
            req = " (required)" if p.required else " (optional)"
            param_parts.append(f'    "{p.name}": "<{p.description}>{req}"')
        params_json = ",\n".join(param_parts)
        lines.append(
            f"### {tool.name}\n"
            f"{tool.description}\n"
            f'<tool_call>\n{{"name": "{tool.name}", "arguments": {{\n{params_json}\n}}}}\n</tool_call>\n'
        )

    lines.append("You may call multiple tools. After each tool result, you can call more tools or provide your final answer.\n")
    return "\n".join(lines)


def _strip_tool_calls(text: str) -> str:
    """Strip leftover <tool_call> XML tags from the agent's final response."""
    return re.sub(r'<tool_call>.*?</tool_call>', '', text, flags=re.DOTALL).strip()


def _update_tool_stats(db: Session, installed_tool_by_id: dict, tool_name: str, cost: float) -> None:
    """Update InstalledTool.total_calls and total_cost in the DB."""
    # Map internal tool names back to catalog IDs
    name_to_id = {
        "web_search": "tool-websearch",
        "web_scrape": "tool-browser",
        "code_executor": "tool-code-executor",
        "file_manager": "tool-file-manager",
    }
    catalog_id = name_to_id.get(tool_name)
    if catalog_id and catalog_id in installed_tool_by_id:
        inst = installed_tool_by_id[catalog_id]
        inst.total_calls = (inst.total_calls or 0) + 1
        inst.total_cost = (inst.total_cost or 0.0) + cost
        inst.last_used_at = datetime.now(timezone.utc)
        try:
            db.commit()
        except Exception:
            db.rollback()


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

    # ==================== MEMORY BRIDGE ====================
    # Connect agents to team knowledge graph
    memory_bridge = MemoryBridge(team_id=operation.team_id, db=db)

    # Pre-load relevant knowledge context for this operation
    knowledge_context = memory_bridge.get_knowledge_context(
        task_description=operation.description,
        include_policies=True,
        include_entities=True,
        include_decisions=True,
        max_per_type=3
    )

    # Store knowledge in execution context
    if not knowledge_context.is_empty():
        context.add_knowledge_context(knowledge_context.to_dict().get("policies", []))
        context.add_knowledge_context(knowledge_context.to_dict().get("entities", []))
        context.add_knowledge_context(knowledge_context.to_dict().get("decisions", []))
        print(f"[execute] Loaded knowledge context: {len(knowledge_context.policies)} policies, "
              f"{len(knowledge_context.entities)} entities, {len(knowledge_context.decisions)} decisions")

    # ==================== EVOLUTION SERVICE ====================
    # Check for better workflows based on historical performance
    evolution_service = EvolutionService(db=db, team_id=operation.team_id)
    task_type = _infer_task_type(operation.title, operation.description)
    best_workflow = None

    try:
        best_workflow = evolution_service.select_best_workflow(task_type, optimization_goal="balanced")
        if best_workflow and best_workflow.execution_count >= 2:
            print(f"[execute] Evolution suggests workflow {best_workflow.signature[:8]}... "
                  f"(fitness: {best_workflow.fitness_score:.2f}, executions: {best_workflow.execution_count})")
            if context.workflow_signature and context.workflow_signature != best_workflow.signature:
                suggestions = evolution_service.suggest_improvements(
                    current_signature=context.workflow_signature,
                    task_type=task_type,
                    current_agents=[node.get("agentRole", node.get("agent_role", "")) for node in nodes]
                )
                if suggestions:
                    print(f"[execute] Evolution suggestions: {len(suggestions)}")
                    for s in suggestions[:2]:  # Log first 2
                        print(f"[execute]   - [{s.suggestion_type}] {s.description}")
    except Exception as e:
        print(f"[execute] Evolution check failed (non-fatal): {e}")

    # ==================== TOOL INFRASTRUCTURE ====================
    # Load installed tools for this team so agents can use real tools
    tool_registry = get_tool_registry()
    installed_tools_records = db.query(InstalledTool).filter(
        InstalledTool.team_id == operation.team_id,
        InstalledTool.status == "connected"
    ).all()

    installed_tools_data = []
    installed_tool_by_id: Dict[str, InstalledTool] = {}
    for inst in installed_tools_records:
        tool_dict = {
            "tool_id": inst.tool_id,
            "configuration": inst.configuration or {},
            "assigned_agent_ids": inst.assigned_agent_ids or [],
        }
        # Inject db/team_id into file_manager config so it can access vault
        if inst.tool_id == "tool-file-manager":
            tool_dict["configuration"]["db"] = db
            tool_dict["configuration"]["team_id"] = operation.team_id
        installed_tools_data.append(tool_dict)
        installed_tool_by_id[inst.tool_id] = inst

    tool_executor = ToolExecutor(context, installed_tools_data, tool_registry)
    print(f"[execute] Loaded {len(installed_tools_data)} installed tools for team {operation.team_id}")

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

            # ==================== TOOL RESOLUTION ====================
            # Get real tools available to this agent
            agent_tools = tool_registry.get_tools_for_agent(agent_id, installed_tools_data)
            tools_prompt_section = _build_tools_prompt_section(agent_tools)

            # Progress update
            yield emit("progress", {
                "node_id": node_id,
                "progress": 25,
            })

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
                # ==================== BUILD CONTEXT-AWARE PROMPT ====================
                previous_outputs = context.get_all_agent_outputs()

                # Build knowledge section from pre-loaded context
                knowledge_section = ""
                if not knowledge_context.is_empty():
                    knowledge_section = knowledge_context.to_prompt_section()

                # Build previous work section
                previous_work_section = ""
                if previous_outputs:
                    previous_work_section = "\n## Previous Work from Team\n"
                    for prev_agent, prev_output in previous_outputs.items():
                        prev_preview = prev_output[:200] + "..." if len(prev_output) > 200 else prev_output
                        previous_work_section += f"### {prev_agent}\n{prev_preview}\n\n"

                # Tool usage instruction (only when tools are available)
                tool_instruction = ""
                if agent_tools:
                    tool_instruction = "\nIf a tool would help you complete this task, use it. Otherwise, respond directly."

                # Combine into full prompt
                system_prompt = f"""You are {agent_name}, a {agent_role}.

## Task: {node_name}
{node_desc}

## Overall Goal
{operation.description}
{previous_work_section}
{knowledge_section}
{tools_prompt_section}

## Instructions
Provide a concise professional output for this task. Be specific and actionable.
Consider any team policies and previous work when formulating your response.{tool_instruction}
Keep your response under 200 words."""

                # ==================== EXECUTION PATH ====================
                if not agent_tools:
                    # --- No tools: single LLM call (same as before) ---
                    print(f"[execute] Calling LLM for node {node_id} (no tools, prompt: {len(system_prompt)} chars)...")
                    llm_response = llm_service.simple_chat(system_prompt)
                    tokens_used = len(system_prompt) // 4 + len(llm_response) // 4
                    print(f"[execute] LLM response received: {len(llm_response)} chars")
                else:
                    # --- Tools available: multi-turn conversation loop ---
                    print(f"[execute] Starting tool loop for node {node_id} ({len(agent_tools)} tools available)...")
                    messages = [
                        LLMChatMessage(role="system", content=system_prompt),
                        LLMChatMessage(role="user", content=f"Complete this task: {node_name}\n\n{node_desc}"),
                    ]

                    max_tool_turns = 5
                    for turn in range(max_tool_turns):
                        # Call LLM
                        completion = llm_service.chat_completion(messages)
                        assistant_text = completion.response
                        usage = completion.usage or {}
                        tokens_used += usage.get("total_tokens", len(assistant_text) // 4)

                        # Parse tool calls from response
                        tool_calls = parse_tool_calls_from_response(assistant_text)

                        if not tool_calls:
                            # No tool calls — this is the final response
                            llm_response = assistant_text
                            print(f"[execute] Turn {turn+1}: final response ({len(llm_response)} chars)")
                            break

                        # Execute each tool call
                        print(f"[execute] Turn {turn+1}: {len(tool_calls)} tool call(s)")
                        tool_results_text = ""
                        for tc in tool_calls:
                            tc_name = tc.get("name", "unknown")
                            tc_args = tc.get("arguments", {})

                            # Emit SSE: tool running
                            yield emit("tool_use", {
                                "node_id": node_id,
                                "agent_name": agent_name,
                                "tool": tc_name,
                                "status": "running",
                            })

                            # Execute the tool (async -> sync bridge)
                            try:
                                loop = asyncio.new_event_loop()
                                tool_result = loop.run_until_complete(
                                    tool_executor.execute_function_call(tc, agent_name=agent_name)
                                )
                                loop.close()
                            except RuntimeError:
                                # Fallback: use thread pool if loop issues
                                with ThreadPoolExecutor(max_workers=1) as pool:
                                    future = pool.submit(
                                        asyncio.run,
                                        tool_executor.execute_function_call(tc, agent_name=agent_name)
                                    )
                                    tool_result = future.result(timeout=60)

                            # Update InstalledTool stats
                            _update_tool_stats(db, installed_tool_by_id, tc_name, tool_result.cost)

                            # Emit SSE: tool completed or error
                            if tool_result.success:
                                yield emit("tool_use", {
                                    "node_id": node_id,
                                    "agent_name": agent_name,
                                    "tool": tc_name,
                                    "status": "completed",
                                })
                                result_str = tool_result.to_string()
                                # Truncate very large results to keep context manageable
                                if len(result_str) > 2000:
                                    result_str = result_str[:2000] + "\n... (truncated)"
                                tool_results_text += f"\n[Tool: {tc_name}] Result:\n{result_str}\n"
                            else:
                                yield emit("tool_use", {
                                    "node_id": node_id,
                                    "agent_name": agent_name,
                                    "tool": tc_name,
                                    "status": "error",
                                    "error": tool_result.error,
                                })
                                tool_results_text += f"\n[Tool: {tc_name}] Error: {tool_result.error}\n"

                        # Append assistant message + tool results, loop back
                        messages.append(LLMChatMessage(role="assistant", content=assistant_text))
                        messages.append(LLMChatMessage(role="user", content=f"Tool results:{tool_results_text}\n\nContinue with the task. If you have enough information, provide your final answer without any tool calls."))
                    else:
                        # Exhausted max turns — use last response
                        llm_response = assistant_text
                        print(f"[execute] Tool loop exhausted after {max_tool_turns} turns")

                    # Strip leftover tool_call tags from final response
                    llm_response = _strip_tool_calls(llm_response)

                print(f"[execute] LLM final response: {len(llm_response)} chars, {tokens_used} tokens")

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
            # Layer 1: Proxy metrics score
            total_output_length = sum(
                len(state.output or "") for state in context.agent_states.values()
            )
            tools_used_count = len(context.tool_states) if hasattr(context, 'tool_states') else 0
            proxy_score = QualityEvaluator.compute_proxy_score(
                output_length=total_output_length,
                execution_time_ms=context.metrics.total_latency_ms,
                nodes_completed=context.metrics.nodes_completed,
                nodes_total=context.metrics.nodes_total,
                tools_used=tools_used_count,
                assumptions_answered=len([a for a in context.assumptions if a.get("answered")])
            )
            print(f"[execute] Proxy score: {proxy_score:.3f}")

            # Layer 2: LLM-as-judge evaluation
            llm_judge_score = None
            llm_judge_rationale = None
            try:
                quality_evaluator = QualityEvaluator(llm_service)
                agent_outputs = {
                    name: state.output for name, state in context.agent_states.items()
                    if state.output
                }
                combined_output = "\n\n".join(
                    f"## {name}\n{out}" for name, out in agent_outputs.items()
                )
                judge_result = quality_evaluator.evaluate_output(
                    task_description=operation.description,
                    output=combined_output,
                    agent_outputs=agent_outputs,
                )
                llm_judge_score = judge_result.score
                llm_judge_rationale = judge_result.rationale
                print(f"[execute] LLM judge score: {llm_judge_score:.3f} - {llm_judge_rationale}")
            except Exception as judge_err:
                print(f"[execute] LLM judge failed (non-fatal): {judge_err}")

            # Compute hybrid quality score
            quality_score = QualityEvaluator.compute_hybrid_score(
                proxy_score=proxy_score,
                llm_judge_score=llm_judge_score,
            )
            print(f"[execute] Hybrid quality score: {quality_score:.3f}")

            workflow_execution = WorkflowExecution(
                operation_id=operation.id,
                team_id=operation.team_id,
                workflow_signature=context.workflow_signature,
                task_type=task_type,
                team_composition=[
                    {"agent_id": state.agent_id, "agent_name": name, "role": state.role}
                    for name, state in context.agent_states.items()
                ],
                agents_used=list(context.agent_states.keys()),
                cost=context.metrics.total_cost,
                latency_ms=context.metrics.total_latency_ms,
                tokens_used=context.metrics.total_tokens,
                quality_score=quality_score,
                proxy_score=proxy_score,
                llm_judge_score=llm_judge_score,
                llm_judge_rationale=llm_judge_rationale,
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
            print(f"[execute] Saved WorkflowExecution (ID: {workflow_execution.id}, quality: {quality_score:.3f})")
        except Exception as e:
            print(f"[execute] Error saving WorkflowExecution: {e}")
            # Don't fail the operation if this fails

        # ==================== EXTRACT AND STORE LEARNINGS ====================
        # Auto-extract insights from agent outputs and store in knowledge graph
        try:
            learnings_stored = 0
            for agent_name_key, agent_state in context.agent_states.items():
                if agent_state.output and len(agent_state.output) > 100:
                    # Store significant outputs as learnings
                    stored = memory_bridge.extract_and_store_learnings(
                        agent_name=agent_name_key,
                        task_name=f"{operation.title} - {agent_state.role}",
                        output=agent_state.output,
                        auto_extract=True
                    )
                    learnings_stored += len(stored)

            if learnings_stored > 0:
                print(f"[execute] Stored {learnings_stored} learnings to knowledge graph")
        except Exception as e:
            print(f"[execute] Error storing learnings: {e}")
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
            "total_cost": context.metrics.total_cost,
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


# ==================== EVOLUTION ENDPOINTS ====================

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

    evolution_service = EvolutionService(db=db, team_id=team_id)

    # Get all task types if none specified
    if task_type:
        task_types = [task_type]
    else:
        task_types = evolution_service.get_all_task_types()

    # Build stats for each task type
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

    evolution_service = EvolutionService(db=db, team_id=team_id)

    # Get best workflow for comparison
    best_workflow = evolution_service.select_best_workflow(task_type)

    # Get suggestions
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

    evolution_service = EvolutionService(db=db, team_id=team_id)
    comparison = evolution_service.compare_workflows(signature_a, signature_b, task_type)

    return {
        "team_id": team_id,
        "task_type": task_type,
        **comparison
    }


# ==================== QUALITY RATING ENDPOINTS ====================

@router.post("/{operation_id}/rate", response_model=RatingResponse)
async def rate_operation(
    operation_id: int,
    rating_data: RatingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rate a completed operation's output (1-5 stars + optional feedback).

    This is Layer 3 of the hybrid quality scoring system.
    When a user rating is provided, it recalculates the hybrid quality_score
    using: 0.6 * user_normalized + 0.3 * llm_judge + 0.1 * proxy
    """
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

    # Find the WorkflowExecution for this operation
    workflow_exec = db.query(WorkflowExecution).filter(
        WorkflowExecution.operation_id == operation_id
    ).order_by(WorkflowExecution.created_at.desc()).first()

    if not workflow_exec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No workflow execution found for this operation"
        )

    # Store the user rating
    workflow_exec.user_rating = rating_data.rating
    workflow_exec.user_feedback = rating_data.feedback

    # Recalculate hybrid quality score with user rating
    new_quality = QualityEvaluator.compute_hybrid_score(
        proxy_score=workflow_exec.proxy_score or 0.5,
        llm_judge_score=workflow_exec.llm_judge_score,
        user_rating=rating_data.rating,
    )
    workflow_exec.quality_score = new_quality

    db.commit()

    print(f"[rate] Operation {operation_id} rated {rating_data.rating}/5 -> quality_score={new_quality:.3f}")

    return RatingResponse(
        success=True,
        operation_id=operation_id,
        rating=rating_data.rating,
        quality_score=new_quality,
        message=f"Rating saved. Quality score updated to {new_quality:.2f}",
    )
