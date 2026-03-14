"""
Operations Router

Handles operation/task CRUD, execution, and real-time updates.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Any, Generator, Optional
import json
import time
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor

from database import get_db
from auth import get_current_user
from schemas import OperationCreate, OperationUpdate, OperationResponse, ExecutionControlResponse, RatingRequest, RatingResponse, AssumptionResponseRequest, AssumptionResponseResponse, ExecutionMessageCreate, ExecutionMessageResponse, ExecutionMessagesResponse, PendingAssumptionResponse, PendingAssumptionsResponse, AgentMessageGroup, AgentMessagesResponse
from models import User, Team, Operation, Agent, VaultFile, WorkflowExecution, InstalledTool, ExecutionMessage
from llm_service import llm_service, ChatMessage as LLMChatMessage
from core.agents.registry import AGENT_REGISTRY
from core.workflows.execution_state import EXECUTION_REGISTRY, ExecutionSignal
from core.runtime import (
    ExecutionContext, AgentState, ToolState, NodeMetrics, MemoryBridge,
    EvolutionService, WorkflowDNA, QualityEvaluator
)
from core.tools.executor import ToolExecutor, parse_tool_calls_from_response, parse_assumptions_from_response
from core.tools.registry import get_tool_registry
from rag_service import rag_service
from core.utils import infer_task_type as _infer_task_type

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


@router.get("/pending-assumptions", response_model=PendingAssumptionsResponse)
async def get_pending_assumptions(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all operations with pending assumptions (waiting_for_input status).

    Returns operations that are currently paused waiting for user input,
    sorted by waiting time (oldest first = most urgent).

    Used by the Inbox to show pending questions that need attention.
    """
    print(f"\n[pending-assumptions] Getting pending assumptions for team {team_id}")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Get all operations in waiting_for_input status for this team
    waiting_operations = db.query(Operation).filter(
        Operation.team_id == team_id,
        Operation.status == "waiting_for_input"
    ).all()

    print(f"[pending-assumptions] Found {len(waiting_operations)} operations waiting for input")

    pending_assumptions = []

    for operation in waiting_operations:
        # Check if execution is registered and has pending assumption
        state = EXECUTION_REGISTRY.get_state(operation.id)

        if state and state.signal == ExecutionSignal.WAITING_FOR_INPUT and state.pending_assumption:
            assumption_data = state.pending_assumption

            # Get agent info
            agent_name = assumption_data.get("agent_name", "Agent")
            agent_photo = assumption_data.get("agent_photo")

            # Calculate waiting duration
            waiting_since = operation.updated_at or operation.created_at
            waiting_duration = (datetime.now(timezone.utc) - waiting_since.replace(tzinfo=timezone.utc)).total_seconds()

            pending_assumptions.append(PendingAssumptionResponse(
                operation_id=operation.id,
                operation_title=operation.title,
                operation_description=operation.description,
                node_id=assumption_data.get("node_id", ""),
                node_name=assumption_data.get("node_name", ""),
                agent_name=agent_name,
                agent_photo=agent_photo,
                question=assumption_data.get("question", ""),
                context=assumption_data.get("context"),
                options=assumption_data.get("options", []),
                priority=assumption_data.get("priority", "normal"),
                assumption_index=assumption_data.get("assumption_index", 0),
                waiting_since=waiting_since,
                waiting_duration_seconds=int(waiting_duration)
            ))

    # Sort by waiting time (oldest first = most urgent)
    pending_assumptions.sort(key=lambda x: x.waiting_since)

    print(f"[pending-assumptions] Returning {len(pending_assumptions)} pending assumptions")

    return PendingAssumptionsResponse(
        pending_assumptions=pending_assumptions,
        total_count=len(pending_assumptions),
        team_id=team_id
    )


@router.get("/agent-messages", response_model=AgentMessagesResponse)
async def get_agent_messages(
    team_id: int,
    agent_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all execution messages for a specific agent across all operations.

    Returns messages grouped by operation, showing the agent's questions,
    outputs, and user interactions. Used by the Inbox specialist chat.
    """
    print(f"\n[agent-messages] Getting messages for agent '{agent_name}' in team {team_id}")

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Get all operations for this team
    operations = db.query(Operation).filter(
        Operation.team_id == team_id
    ).order_by(Operation.created_at.desc()).all()

    message_groups = []
    total_messages = 0

    for operation in operations:
        messages = db.query(ExecutionMessage).filter(
            ExecutionMessage.operation_id == operation.id
        ).filter(
            (ExecutionMessage.sender_name == agent_name) |
            (ExecutionMessage.sender_type == "user")
        ).order_by(ExecutionMessage.created_at).all()

        if messages:
            message_groups.append(AgentMessageGroup(
                operation_id=operation.id,
                operation_title=operation.title,
                operation_status=operation.status,
                messages=messages,
                created_at=operation.created_at
            ))
            total_messages += len(messages)

    print(f"[agent-messages] Found {len(message_groups)} operations with {total_messages} messages")

    return AgentMessagesResponse(
        message_groups=message_groups,
        total_messages=total_messages,
        agent_name=agent_name,
        team_id=team_id
    )


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

# _infer_task_type is now imported from core.utils


def _wait_for_assumption_answer(operation_id: int, timeout: int = 300) -> Optional[str]:
    """
    Wait for user to answer an assumption by polling ExecutionRegistry.

    Args:
        operation_id: The operation ID waiting for input
        timeout: Maximum seconds to wait (default 300 = 5 minutes)

    Returns:
        The user's answer string, or None if timeout/cancelled
    """
    import time

    start_time = time.time()
    poll_interval = 1.0  # Check every second

    while time.time() - start_time < timeout:
        state = EXECUTION_REGISTRY.get(operation_id)

        if not state:
            # Execution was unregistered (cancelled)
            print(f"[wait_assumption] Execution {operation_id} unregistered")
            return None

        if state.signal == ExecutionSignal.CANCEL_REQUESTED:
            # User cancelled
            print(f"[wait_assumption] Cancel requested")
            return None

        if state.assumption_answer is not None:
            # Got the answer!
            answer = state.assumption_answer
            print(f"[wait_assumption] Received answer: {answer[:50]}...")
            return answer

        # Still waiting
        time.sleep(poll_interval)

    # Timeout
    print(f"[wait_assumption] Timeout after {timeout}s")
    return None


def should_evo_review(context, node_output: str, node_index: int, total_nodes: int, review_frequency: str = "every_2_nodes") -> bool:
    """
    Determine if Evo should review the current node's output.

    Args:
        context: ExecutionContext with metrics and history
        node_output: The agent's output for the just-completed node
        node_index: 0-indexed position of the node that just completed
        total_nodes: Total number of nodes in workflow
        review_frequency: "every_node", "every_2_nodes", "first_and_last", "never"

    Returns:
        True if Evo should review this node's output
    """
    # Never review if disabled
    if review_frequency == "never":
        return False

    # Always review the first node (to catch early misunderstandings)
    if node_index == 0:
        return True

    # Review frequency logic
    if review_frequency == "every_node":
        return True
    elif review_frequency == "every_2_nodes":
        # Review every 2nd node (1st is already covered above)
        return (node_index + 1) % 2 == 0
    elif review_frequency == "first_and_last":
        # First already handled, check if this is the last node
        return node_index == total_nodes - 1

    # Skip review if output seems high quality (simple heuristics)
    if len(node_output) < 50:
        # Very short output might be low quality
        return True

    # Skip if output has confidence markers (looks like agent is certain)
    confidence_markers = ["I have completed", "Successfully", "Confirmed", "Verified"]
    if any(marker.lower() in node_output.lower() for marker in confidence_markers):
        return False

    # Default: review every 2 nodes
    return (node_index + 1) % 2 == 0


def run_evo_review(
    llm_service,
    task_description: str,
    node_name: str,
    node_output: str,
    context,
    remaining_nodes: list
) -> dict:
    """
    Run Evo's review of an agent's output to detect if clarification is needed.

    Args:
        llm_service: LLMService instance
        task_description: Original task description
        node_name: Name of the node that just completed
        node_output: The agent's output
        context: ExecutionContext with execution history
        remaining_nodes: List of nodes still to be executed

    Returns:
        {
            "needs_clarification": bool,
            "question": str (if needs_clarification),
            "context": str (if needs_clarification),
            "options": list[str] (optional),
            "reason": str (why review triggered)
        }
    """
    print(f"[evo_review] Reviewing node: {node_name}")

    # Build review prompt
    remaining_work = "\n".join([f"- {n.get('name', 'Unnamed')}" for n in remaining_nodes[:3]])  # Show next 3
    if len(remaining_nodes) > 3:
        remaining_work += f"\n- ... and {len(remaining_nodes) - 3} more tasks"

    review_prompt = f"""You are Evo, the AI manager overseeing this workflow execution.

**Original Task**: {task_description}

**Just Completed**: {node_name}

**Agent's Output**:
{node_output[:1000]}  # Limit to first 1000 chars

**Remaining Work**:
{remaining_work if remaining_nodes else "(This was the final task)"}

**Your Job**: Review this output and determine if anything is unclear, ambiguous, or potentially incorrect based on the original task. Consider:
1. Does the output make sense for the task?
2. Is any critical information missing or vague?
3. Are there assumptions that could lead to problems in remaining work?
4. Does this align with the user's original intent?

If everything looks good, respond with exactly: PROCEED

If you need clarification from the user, respond in this JSON format:
{{
    "needs_clarification": true,
    "question": "Your specific question to the user",
    "context": "Why you're asking (what you noticed that's unclear)",
    "options": ["Option 1", "Option 2", "Option 3"]  // Optional: provide choices if applicable
}}

Be selective - only ask if truly critical. Minor issues can be addressed by agents themselves."""

    try:
        # Call LLM as Evo
        evo_response = llm_service.simple_chat(review_prompt, model="gpt-4o-mini")  # Use cheaper model for reviews
        print(f"[evo_review] Evo response: {evo_response[:200]}...")

        # Check for PROCEED
        if "PROCEED" in evo_response.upper() and "needs_clarification" not in evo_response.lower():
            print("[evo_review] Evo approved - no clarification needed")
            return {"needs_clarification": False, "reason": "output_approved"}

        # Try to parse JSON response
        import json
        import re

        # Try to find JSON in the response
        json_match = re.search(r'\{.*\}', evo_response, re.DOTALL)
        if json_match:
            review_data = json.loads(json_match.group(0))
            if review_data.get("needs_clarification"):
                print(f"[evo_review] Clarification needed: {review_data.get('question', 'N/A')}")
                return {
                    "needs_clarification": True,
                    "question": review_data.get("question", "Could you provide more details?"),
                    "context": review_data.get("context", f"Manager review of: {node_name}"),
                    "options": review_data.get("options", []),
                    "reason": "manager_review"
                }

        # Fallback: if response is long and doesn't say PROCEED, treat as concern
        if len(evo_response) > 100:
            print("[evo_review] Ambiguous response, treating as no clarification needed")

        return {"needs_clarification": False, "reason": "ambiguous_response"}

    except Exception as e:
        print(f"[evo_review] Error during review: {e}")
        # On error, don't block execution
        return {"needs_clarification": False, "reason": f"error: {str(e)}"}


def _get_and_consume_user_messages(operation_id: int, db: Session, current_node_id: str = None) -> str:
    """
    Retrieve unread user messages for this operation and mark them as consumed.

    This enables real-time collaboration: users can send instructions or questions
    during execution, and they'll be injected into the agent's context at the next
    LLM call.

    Args:
        operation_id: The operation ID
        db: Database session
        current_node_id: Optional node ID to filter messages targeted at current node

    Returns:
        Formatted string with user messages, or empty string if no unread messages
    """
    from sqlalchemy import and_, cast, String
    from sqlalchemy.dialects.postgresql import JSONB

    # Query for unread user messages
    # Note: SQLite doesn't support JSON path queries the same way as PostgreSQL
    # We'll fetch all user messages and filter in Python
    messages = db.query(ExecutionMessage).filter(
        ExecutionMessage.operation_id == operation_id,
        ExecutionMessage.sender_type == "user",
    ).order_by(ExecutionMessage.created_at.asc()).all()

    # Filter for unconsumed messages
    unread_messages = []
    for msg in messages:
        context = msg.context or {}
        if not context.get("consumed", False):
            # Check if message is targeted at current node or is general
            target = context.get("target")
            if target in [None, "current_agent", current_node_id]:
                unread_messages.append(msg)

    if not unread_messages:
        return ""

    print(f"[messages] Found {len(unread_messages)} unread user messages for operation {operation_id}")

    # Format messages for injection into prompt
    message_lines = []
    for msg in unread_messages:
        msg_type = msg.message_type
        type_label = {
            "instruction": "INSTRUCTION",
            "question": "QUESTION",
            "chat": "MESSAGE"
        }.get(msg_type, "MESSAGE")

        message_lines.append(f"[User {type_label}]: {msg.content}")

    # Mark messages as consumed
    for msg in unread_messages:
        if msg.context is None:
            msg.context = {}
        msg.context["consumed"] = True
        msg.context["consumed_at"] = datetime.now(timezone.utc).isoformat()

    try:
        db.commit()
        print(f"[messages] Marked {len(unread_messages)} messages as consumed")
    except Exception as e:
        print(f"[messages] Error marking messages as consumed: {e}")
        db.rollback()

    # Return formatted string
    additional_context = "\n".join(message_lines)
    return f"\n\n## User Messages\nThe user has sent you the following messages during execution:\n{additional_context}\n\nPlease take these into account as you continue your work.\n"


def _record_execution_event_as_message(
    db: Session,
    operation_id: int,
    sender_type: str,
    sender_name: str,
    content: str,
    message_type: str,
    sender_id: int = None,
    context: dict = None
) -> None:
    """
    Record an execution event as an ExecutionMessage for transcript.

    This creates a permanent record of all execution activity, forming
    a complete transcript that can be viewed during and after execution.

    Args:
        db: Database session
        operation_id: The operation ID
        sender_type: "user", "manager", "agent", "system"
        sender_name: Display name
        content: Message content
        message_type: "status", "chat", "assumption", "answer", "review"
        sender_id: Optional FK to user.id or agent.id
        context: Optional metadata dict
    """
    try:
        message = ExecutionMessage(
            operation_id=operation_id,
            sender_type=sender_type,
            sender_name=sender_name,
            sender_id=sender_id,
            content=content,
            message_type=message_type,
            context=context or {}
        )
        db.add(message)
        db.commit()
    except Exception as e:
        print(f"[transcript] Error recording execution message: {e}")
        db.rollback()


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

            # Record in transcript (Phase 3.4)
            _record_execution_event_as_message(
                db=db,
                operation_id=operation.id,
                sender_type="agent",
                sender_name=agent_name,
                sender_id=assigned_agent.id if assigned_agent else None,
                content=f"Starting work on: {node_name}",
                message_type="status",
                context={"node_id": node_id, "node_index": idx, "action": "node_start"}
            )

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

                # Assumption instruction
                assumption_instruction = """

**IMPORTANT - If Uncertain**: If you are uncertain about something critical that would impact your work quality, output an assumption block before your response:
<assumption>
<question>Your specific question here</question>
<context>Why you need to know this</context>
<options>Option1|Option2|Option3</options>
<priority>high</priority>
</assumption>

Only raise assumptions for truly critical uncertainties. Most tasks can proceed with reasonable assumptions."""

                # ── Agent intelligence sections ──────────────────────────
                # 1. Custom system prompt (overrides generic intro if set)
                agent_custom_prompt = getattr(assigned_agent, 'system_prompt', None) or ""
                agent_specialty = getattr(assigned_agent, 'specialty', None) or ""
                agent_traits = getattr(assigned_agent, 'personality_traits', None) or []
                agent_seniority = getattr(assigned_agent, 'seniority_level', None) or "practitioner"
                agent_kb = getattr(assigned_agent, 'knowledge_base', None) or []

                # Identity block
                if agent_custom_prompt:
                    identity_block = agent_custom_prompt
                else:
                    trait_str = ", ".join(agent_traits) if agent_traits else ""
                    identity_block = f"You are {agent_name}, a {agent_role}."
                    if agent_specialty:
                        identity_block += f" Your specialty is {agent_specialty}."
                    if trait_str:
                        identity_block += f" You are {trait_str}."

                # Seniority context
                seniority_note = ""
                if agent_seniority == "specialist":
                    seniority_note = "\nYou are a deep specialist. Provide authoritative, precise answers within your domain. Do not speculate outside it."
                elif agent_seniority == "manager":
                    seniority_note = "\nYou are a manager-level agent. Your job is to think strategically, coordinate outputs, and ensure quality across the team's work."

                # Knowledge base — semantic retrieval (RAG)
                # Query = node name + description + overall goal for maximum relevance
                kb_section = ""
                if agent_kb and assigned_agent:
                    rag_query = f"{node_name}: {node_desc}\nOverall goal: {operation.description}"
                    try:
                        relevant_chunks = rag_service.retrieve(
                            agent_id=assigned_agent.id,
                            query=rag_query,
                            top_k=5,
                        )
                        if relevant_chunks:
                            kb_section = "\n## Relevant Knowledge\n"
                            for chunk in relevant_chunks:
                                kb_section += f"### {chunk['entry_title']}\n{chunk['chunk_text']}\n\n"
                    except Exception as _rag_err:
                        # Fallback: inject all entries as plain text if RAG fails
                        print(f"[execute] RAG retrieval failed, falling back to full injection: {_rag_err}")
                        kb_section = "\n## Your Knowledge Base\n"
                        for entry in agent_kb:
                            title = entry.get("title", "Reference")
                            content = entry.get("content", "")
                            if content:
                                kb_section += f"### {title}\n{content}\n\n"

                # Combine into full prompt
                system_prompt = f"""{identity_block}{seniority_note}

## Task: {node_name}
{node_desc}

## Overall Goal
{operation.description}
{previous_work_section}
{kb_section}
{knowledge_section}
{tools_prompt_section}

## Instructions
Provide a concise professional output for this task. Be specific and actionable.
Consider any team policies and previous work when formulating your response.{tool_instruction}
Keep your response under 200 words.{assumption_instruction}"""

                # ==================== EXECUTION PATH ====================
                if not agent_tools:
                    # --- No tools: single LLM call ---
                    # Check for user messages before LLM call (Phase 3.3)
                    user_messages_context = _get_and_consume_user_messages(operation.id, db, node_id)
                    effective_prompt = system_prompt + user_messages_context

                    print(f"[execute] Calling LLM for node {node_id} (no tools, prompt: {len(effective_prompt)} chars)...")
                    llm_response = llm_service.simple_chat(effective_prompt)
                    tokens_used = len(effective_prompt) // 4 + len(llm_response) // 4
                    print(f"[execute] LLM response received: {len(llm_response)} chars")

                    # Check for assumptions in no-tools path
                    assumptions = parse_assumptions_from_response(llm_response)
                    if assumptions:
                        assumption = assumptions[0]
                        print(f"[execute] Assumption raised (no-tools path): {assumption['question'][:50]}...")

                        context.raise_assumption(
                            question=assumption["question"],
                            context=assumption["context"],
                            options=assumption.get("options", []),
                            priority=assumption.get("priority", "normal")
                        )

                        yield emit("assumption_raised", {
                            "operation_id": operation.id,
                            "node_id": node_id,
                            "node_name": node_name,
                            "agent_name": agent_name,
                            "agent_photo": assigned_agent.photo_url if assigned_agent else None,
                            "assumption_index": len(context.assumptions) - 1,
                            "question": assumption["question"],
                            "context": assumption["context"],
                            "options": assumption.get("options", []),
                            "priority": assumption.get("priority", "normal"),
                        })

                        # Record in transcript (Phase 3.4)
                        _record_execution_event_as_message(
                            db=db,
                            operation_id=operation.id,
                            sender_type="agent",
                            sender_name=agent_name,
                            sender_id=assigned_agent.id if assigned_agent else None,
                            content=f"Question: {assumption['question']}",
                            message_type="assumption",
                            context={
                                "node_id": node_id,
                                "assumption_index": len(context.assumptions) - 1,
                                "assumption_context": assumption["context"],
                                "options": assumption.get("options", []),
                                "priority": assumption.get("priority", "normal")
                            }
                        )

                        EXECUTION_REGISTRY.request_input(operation.id, assumption)
                        operation.execution_checkpoint = context.to_checkpoint()
                        operation.status = "waiting_for_input"
                        db.commit()

                        answer = _wait_for_assumption_answer(operation.id, timeout=300)

                        if answer is None:
                            yield emit("assumption_timeout", {
                                "operation_id": operation.id,
                                "node_id": node_id,
                                "message": "No response received. Execution cannot continue."
                            })
                            context.status = "failed"
                            operation.status = "failed"
                            db.commit()
                            return

                        context.answer_assumption(len(context.assumptions) - 1, answer)
                        yield emit("assumption_answered", {
                            "assumption_index": len(context.assumptions) - 1,
                            "answer": answer,
                        })

                        # Record in transcript (Phase 3.4)
                        _record_execution_event_as_message(
                            db=db,
                            operation_id=operation.id,
                            sender_type="user",
                            sender_name="User",
                            sender_id=None,
                            content=f"Answer to '{assumption['question'][:50]}...': {answer}",
                            message_type="answer",
                            context={"node_id": node_id, "assumption_index": len(context.assumptions) - 1}
                        )

                        # Re-call LLM with answer
                        # Check for any new user messages (Phase 3.3)
                        user_messages_context = _get_and_consume_user_messages(operation.id, db, node_id)
                        follow_up_prompt = f"{system_prompt}\n\n## User's Answer to Your Question\n\nQ: {assumption['question']}\nA: {answer}\n\nNow please complete the task with this information.{user_messages_context}"
                        llm_response = llm_service.simple_chat(follow_up_prompt)
                        tokens_used += len(follow_up_prompt) // 4 + len(llm_response) // 4
                        print(f"[execute] LLM response after assumption answered: {len(llm_response)} chars")
                else:
                    # --- Tools available: multi-turn conversation loop ---
                    print(f"[execute] Starting tool loop for node {node_id} ({len(agent_tools)} tools available)...")
                    messages = [
                        LLMChatMessage(role="system", content=system_prompt),
                        LLMChatMessage(role="user", content=f"Complete this task: {node_name}\n\n{node_desc}"),
                    ]

                    max_tool_turns = 5
                    for turn in range(max_tool_turns):
                        # Check for user messages before each LLM call (Phase 3.3)
                        user_messages_context = _get_and_consume_user_messages(operation.id, db, node_id)
                        if user_messages_context:
                            # Inject as a user message in the conversation
                            messages.append(LLMChatMessage(
                                role="user",
                                content=f"[REAL-TIME UPDATE FROM USER]{user_messages_context}"
                            ))

                        # Call LLM
                        completion = llm_service.chat_completion(messages)
                        assistant_text = completion.response
                        usage = completion.usage or {}
                        tokens_used += usage.get("total_tokens", len(assistant_text) // 4)

                        # ==================== CHECK FOR ASSUMPTIONS FIRST ====================
                        assumptions = parse_assumptions_from_response(assistant_text)
                        if assumptions:
                            # Agent raised assumption(s) - handle the first one
                            assumption = assumptions[0]
                            print(f"[execute] Assumption raised: {assumption['question'][:50]}...")

                            # Record in context
                            context.raise_assumption(
                                question=assumption["question"],
                                context=assumption["context"],
                                options=assumption.get("options", []),
                                priority=assumption.get("priority", "normal")
                            )

                            # Emit SSE event
                            yield emit("assumption_raised", {
                                "operation_id": operation.id,
                                "node_id": node_id,
                                "node_name": node_name,
                                "agent_name": agent_name,
                                "agent_photo": assigned_agent.photo_url if assigned_agent else None,
                                "assumption_index": len(context.assumptions) - 1,
                                "question": assumption["question"],
                                "context": assumption["context"],
                                "options": assumption.get("options", []),
                                "priority": assumption.get("priority", "normal"),
                            })

                            # Record in transcript (Phase 3.4)
                            _record_execution_event_as_message(
                                db=db,
                                operation_id=operation.id,
                                sender_type="agent",
                                sender_name=agent_name,
                                sender_id=assigned_agent.id if assigned_agent else None,
                                content=f"Question: {assumption['question']}",
                                message_type="assumption",
                                context={
                                    "node_id": node_id,
                                    "assumption_index": len(context.assumptions) - 1,
                                    "assumption_context": assumption["context"],
                                    "options": assumption.get("options", []),
                                    "priority": assumption.get("priority", "normal")
                                }
                            )

                            # Request input via registry
                            EXECUTION_REGISTRY.request_input(operation.id, assumption)

                            # Save checkpoint
                            operation.execution_checkpoint = context.to_checkpoint()
                            operation.status = "waiting_for_input"
                            db.commit()

                            # Wait for user answer (blocking poll)
                            answer = _wait_for_assumption_answer(operation.id, timeout=300)

                            if answer is None:
                                # Timeout or cancelled
                                yield emit("assumption_timeout", {
                                    "operation_id": operation.id,
                                    "node_id": node_id,
                                    "message": "No response received for assumption. Execution cannot continue."
                                })
                                context.status = "failed"
                                operation.status = "failed"
                                db.commit()
                                return

                            # Got answer - record it
                            context.answer_assumption(len(context.assumptions) - 1, answer)
                            yield emit("assumption_answered", {
                                "assumption_index": len(context.assumptions) - 1,
                                "answer": answer,
                            })

                            # Record in transcript (Phase 3.4)
                            _record_execution_event_as_message(
                                db=db,
                                operation_id=operation.id,
                                sender_type="user",
                                sender_name="User",
                                sender_id=None,
                                content=f"Answer to '{assumption['question'][:50]}...': {answer}",
                                message_type="answer",
                                context={"node_id": node_id, "assumption_index": len(context.assumptions) - 1}
                            )

                            # Re-inject answer and continue
                            messages.append(LLMChatMessage(role="assistant", content=assistant_text))
                            messages.append(LLMChatMessage(
                                role="user",
                                content=f"Thank you. The user answered your question:\n\nQ: {assumption['question']}\nA: {answer}\n\nNow please continue with your task, incorporating this information."
                            ))
                            # Loop back to get new LLM response
                            continue

                        # ==================== CHECK FOR TOOL CALLS ====================
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
                                # Record in transcript (Phase 3.4)
                                result_str = tool_result.to_string()
                                result_preview = result_str[:200] + "..." if len(result_str) > 200 else result_str
                                _record_execution_event_as_message(
                                    db=db,
                                    operation_id=operation.id,
                                    sender_type="agent",
                                    sender_name=agent_name,
                                    sender_id=assigned_agent.id if assigned_agent else None,
                                    content=f"Used tool: {tc_name}\nResult: {result_preview}",
                                    message_type="status",
                                    context={"node_id": node_id, "tool": tc_name, "status": "completed"}
                                )
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
                                # Record in transcript (Phase 3.4)
                                _record_execution_event_as_message(
                                    db=db,
                                    operation_id=operation.id,
                                    sender_type="agent",
                                    sender_name=agent_name,
                                    sender_id=assigned_agent.id if assigned_agent else None,
                                    content=f"Tool error: {tc_name}\nError: {tool_result.error}",
                                    message_type="status",
                                    context={"node_id": node_id, "tool": tc_name, "status": "error"}
                                )
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

                # Record agent output in transcript (Phase 3.4)
                output_preview = llm_response[:500] + "..." if len(llm_response) > 500 else llm_response
                _record_execution_event_as_message(
                    db=db,
                    operation_id=operation.id,
                    sender_type="agent",
                    sender_name=agent_name,
                    sender_id=assigned_agent.id if assigned_agent else None,
                    content=output_preview,
                    message_type="chat",
                    context={"node_id": node_id, "node_name": node_name, "full_length": len(llm_response)}
                )

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

            # ==================== EVO MANAGER REVIEW ====================
            # After node completion, optionally have Evo review the output for quality/clarity
            remaining_nodes = nodes[idx + 1:]  # Nodes still to be executed
            team_settings = team.settings or {}
            review_frequency = team_settings.get("manager_review_frequency", "every_2_nodes")

            if should_evo_review(context, llm_response, idx, len(nodes), review_frequency):
                print(f"[execute] Evo reviewing node {idx}: {node_name}")
                yield emit("manager_reviewing", {
                    "operation_id": operation.id,
                    "node_id": node_id,
                    "node_name": node_name,
                })

                evo_review = run_evo_review(
                    llm_service=llm_service,
                    task_description=operation.description,
                    node_name=node_name,
                    node_output=llm_response,
                    context=context,
                    remaining_nodes=remaining_nodes
                )

                if evo_review.get("needs_clarification"):
                    # Manager has a question - same flow as agent assumptions
                    print(f"[execute] Manager needs clarification: {evo_review['question']}")

                    # Raise assumption from manager
                    context.raise_assumption(
                        question=evo_review["question"],
                        context=evo_review["context"],
                        options=evo_review.get("options", []),
                        priority="high"  # Manager questions are always high priority
                    )

                    # Emit manager_question event
                    yield emit("manager_question", {
                        "operation_id": operation.id,
                        "node_id": node_id,
                        "node_name": node_name,
                        "assumption_index": len(context.assumptions) - 1,
                        "question": evo_review["question"],
                        "context": evo_review["context"],
                        "options": evo_review.get("options", []),
                        "priority": "high",
                        "reason": evo_review.get("reason", "manager_review"),
                    })

                    # Record in transcript (Phase 3.4)
                    _record_execution_event_as_message(
                        db=db,
                        operation_id=operation.id,
                        sender_type="manager",
                        sender_name="Evo",
                        sender_id=None,
                        content=f"Question: {evo_review['question']}",
                        message_type="review",
                        context={
                            "node_id": node_id,
                            "assumption_index": len(context.assumptions) - 1,
                            "review_context": evo_review["context"],
                            "options": evo_review.get("options", []),
                            "reason": evo_review.get("reason", "manager_review")
                        }
                    )

                    # Request input and wait for answer
                    EXECUTION_REGISTRY.request_input(operation.id, evo_review)
                    operation.execution_checkpoint = context.to_checkpoint()
                    operation.status = "waiting_for_input"
                    db.commit()

                    answer = _wait_for_assumption_answer(operation.id, timeout=300)

                    if answer is None:
                        # Timeout or cancelled
                        yield emit("assumption_timeout", {
                            "operation_id": operation.id,
                            "node_id": node_id,
                            "message": "No response received for manager's question. Execution cannot continue."
                        })
                        context.status = "failed"
                        operation.status = "failed"
                        db.commit()
                        return

                    # Record answer
                    context.answer_assumption(len(context.assumptions) - 1, answer)
                    yield emit("assumption_answered", {
                        "assumption_index": len(context.assumptions) - 1,
                        "answer": answer,
                        "answered_by": "user",
                        "question_from": "manager",
                    })

                    # Record in transcript (Phase 3.4)
                    _record_execution_event_as_message(
                        db=db,
                        operation_id=operation.id,
                        sender_type="user",
                        sender_name="User",
                        sender_id=None,
                        content=f"Answer to manager's question: {answer}",
                        message_type="answer",
                        context={"node_id": node_id, "assumption_index": len(context.assumptions) - 1, "question_from": "manager"}
                    )

                    # Continue execution with the clarification
                    # (No need to re-run the node - the clarification will inform future nodes)
                    print(f"[execute] Manager clarification received: {answer[:100]}...")

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

        # ==================== UPDATE AGENT PERFORMANCE STATS ====================
        # Update Agent.rating and Agent.accuracy from real execution data
        try:
            for agent in agents:
                perf_list = evolution_service.get_agent_performance(agent_name=agent.name)
                if perf_list:
                    perf = perf_list[0]
                    # Map avg_quality (0-1) to rating (1.0-5.0)
                    agent.rating = round(1.0 + perf.avg_quality * 4.0, 2)
                    # Map success_rate to accuracy (0-100)
                    agent.accuracy = round(perf.success_rate * 100, 1)
                    # Append to evolution_history (cap at 50 entries)
                    history = agent.evolution_history or []
                    history.append({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "quality_score": quality_score,
                        "operation_id": operation.id,
                        "trend": perf.trend,
                    })
                    agent.evolution_history = history[-50:]
            db.commit()
            print(f"[execute] Updated agent performance stats for {len(agents)} agents")
        except Exception as e:
            print(f"[execute] Error updating agent stats (non-fatal): {e}")
            try:
                db.rollback()
            except Exception:
                pass

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


@router.post("/{operation_id}/execute-hierarchical")
async def execute_operation_hierarchical(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute an operation using the hierarchical multi-agent engine.

    Automatically builds a Supervisor + specialist worker team from the
    operation's task description, then runs:
      Supervisor decomposes → delegates to workers → reviews → revises → approves

    Returns the same SSE event stream as /execute, plus hierarchy-specific events:
      - hierarchy_decompose: Supervisor breaking down the task
      - hierarchy_delegate: Assigning subtasks to workers
      - hierarchy_worker_start/complete: Worker execution
      - hierarchy_escalate: Worker output escalated to supervisor
      - hierarchy_review: Supervisor reviewing outputs
      - hierarchy_revise: Requesting revisions
      - hierarchy_complete: Final output produced
    """
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))

    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operation not found")

    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    agents = db.query(Agent).filter(Agent.team_id == operation.team_id).all()

    return StreamingResponse(
        generate_hierarchical_execution_events(operation, team, agents, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


def generate_hierarchical_execution_events(
    operation: Operation,
    team: Team,
    agents: List[Agent],
    db,
) -> Generator[str, None, None]:
    """
    SSE generator for hierarchical execution.

    Uses auto_build to create a team from the task description,
    then runs HierarchicalWorkFlow with SSE emit wired in.
    All hierarchy events are forwarded to the client alongside
    the standard start/complete/error events.
    """
    import asyncio
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))

    def emit(event_type: str, data: Dict[str, Any]) -> str:
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"

    task = operation.description or operation.title
    print(f"\n[hierarchy] Starting hierarchical execution for op {operation.id}: {task[:80]}")

    # Update operation status
    operation.status = "active"
    operation.started_at = datetime.now(timezone.utc)
    wc = operation.workflow_config or {}
    wc["hierarchy_mode"] = True
    operation.workflow_config = wc
    db.commit()

    yield emit("start", {
        "operation_id": operation.id,
        "message": "Hierarchical execution starting...",
        "mode": "hierarchical",
    })

    try:
        # ── 1. Auto-build the team from the task ──────────────────────────
        yield emit("hierarchy_decompose", {
            "team_id": "auto_team",
            "supervisor": "Evo",
            "message": "Designing specialist team for your task...",
        })

        from dissertation.hierarchy.auto_build import build_hierarchy_from_task_with_llm_service
        from dissertation.hierarchy.auto_build import build_hierarchy_from_task
        from dissertation.config import get_llm_config
        from dissertation.hierarchy.execution import HierarchicalWorkFlow
        from evoagentx.models.openrouter_model import OpenRouterLLM

        llm_config = get_llm_config(temperature=0.1, max_tokens=2048)
        graph, agent_manager, team_spec = build_hierarchy_from_task(task, llm_config=llm_config)

        supervisor_name = team_spec["supervisor"]["name"]
        worker_names = [w["name"] for w in team_spec["workers"]]

        yield emit("hierarchy_decompose", {
            "team_id": "auto_team",
            "supervisor": supervisor_name,
            "workers": worker_names,
            "team_name": team_spec.get("team_name", "Auto Team"),
            "reasoning": team_spec.get("reasoning", ""),
            "message": f"Team ready: {supervisor_name} + {', '.join(worker_names)}",
        })

        # ── 2. Collected SSE events from hierarchy engine ─────────────────
        sse_queue: List[str] = []

        def sse_emit_callback(event_type: str, data: Dict[str, Any]):
            sse_queue.append(emit(event_type, data))

        # ── 3. Run the hierarchical workflow ──────────────────────────────
        llm = OpenRouterLLM(config=llm_config)
        workflow = HierarchicalWorkFlow(
            graph=graph,
            agent_manager=agent_manager,
            llm=llm,
        )

        # Run in a thread executor so we can yield SSE from sync generator
        loop = asyncio.new_event_loop()

        async def _run():
            return await workflow.async_execute(
                inputs={"task": task},
                sse_emit=sse_emit_callback,
            )

        # Poll the queue while the async task runs
        import threading

        result_holder: List = [None, None]  # [output, error]

        def _thread_target():
            try:
                result_holder[0] = loop.run_until_complete(_run())
            except Exception as e:
                result_holder[1] = str(e)
            finally:
                loop.close()

        thread = threading.Thread(target=_thread_target, daemon=True)
        thread.start()

        while thread.is_alive():
            # Flush any queued SSE events
            while sse_queue:
                yield sse_queue.pop(0)
            time.sleep(0.2)

        # Final flush after thread completes
        while sse_queue:
            yield sse_queue.pop(0)

        thread.join()

        if result_holder[1]:
            raise RuntimeError(result_holder[1])

        final_output = result_holder[0] or ""

        # ── 4. Save result ────────────────────────────────────────────────
        operation.status = "completed"
        operation.completed_at = datetime.now(timezone.utc)
        operation.workflow_config = operation.workflow_config or {}
        operation.workflow_config["hierarchy_result"] = final_output[:5000]
        operation.workflow_config["hierarchy_team"] = team_spec
        operation.workflow_config["hierarchy_trace"] = workflow.trace.summary()
        db.commit()

        trace = workflow.trace.summary()
        yield emit("complete", {
            "operation_id": operation.id,
            "output": final_output,
            "output_length": len(final_output),
            "hierarchy_metrics": {
                "review_loops": trace.get("event_counts", {}).get("review", 0),
                "escalations": trace.get("event_counts", {}).get("escalation", 0),
                "revisions": trace.get("event_counts", {}).get("revision", 0),
                "total_events": trace.get("total_events", 0),
                "elapsed_s": trace.get("total_elapsed_s", 0),
            },
            "message": "Hierarchical execution complete",
        })

    except Exception as e:
        print(f"[hierarchy] ERROR: {e}")
        operation.status = "failed"
        db.commit()
        yield emit("error", {
            "operation_id": operation.id,
            "message": f"Hierarchical execution failed: {str(e)}",
        })


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


@router.post("/{operation_id}/assumption/respond", response_model=AssumptionResponseResponse)
async def respond_to_assumption(
    operation_id: int,
    request: AssumptionResponseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Provide an answer to a pending assumption during execution.

    The execution generator is waiting for this answer and will resume
    automatically once the answer is provided.
    """
    print(f"\n[control] Assumption response for operation {operation_id}: '{request.answer}'")

    # Get operation
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

    # Check if operation is waiting for input
    if operation.status != "waiting_for_input":
        return AssumptionResponseResponse(
            success=False,
            message=f"Operation is not waiting for input (current status: {operation.status})",
            operation_id=operation_id,
            resumed=False
        )

    # Check if execution is registered and waiting
    if not EXECUTION_REGISTRY.is_waiting_for_input(operation_id):
        return AssumptionResponseResponse(
            success=False,
            message="Operation is not waiting for assumption response in execution registry",
            operation_id=operation_id,
            resumed=False
        )

    # Provide the answer to the execution registry
    # The blocked generator will pick this up and continue
    if EXECUTION_REGISTRY.provide_input(operation_id, request.answer):
        return AssumptionResponseResponse(
            success=True,
            message="Answer provided. Execution will resume.",
            operation_id=operation_id,
            resumed=True
        )
    else:
        return AssumptionResponseResponse(
            success=False,
            message="Failed to provide answer. Execution state may have changed.",
            operation_id=operation_id,
            resumed=False
        )


# ==================== EXECUTION CHAT ENDPOINTS (Phase 3.2) ====================

@router.get("/{operation_id}/messages", response_model=ExecutionMessagesResponse)
async def get_execution_messages(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all messages for an execution.

    Returns chronological list of all messages in the execution transcript:
    - User messages
    - Agent messages (outputs, questions)
    - Manager reviews and questions
    - System status messages

    Used to populate the execution chat panel in real-time.
    """
    print(f"\n[chat] Get messages for operation {operation_id}")

    # Get operation
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

    # Get all messages for this operation, ordered chronologically
    messages = db.query(ExecutionMessage).filter(
        ExecutionMessage.operation_id == operation_id
    ).order_by(ExecutionMessage.created_at.asc()).all()

    print(f"[chat] Found {len(messages)} messages for operation {operation_id}")

    return ExecutionMessagesResponse(
        messages=messages,
        total_count=len(messages),
        operation_id=operation_id
    )


@router.post("/{operation_id}/messages", response_model=ExecutionMessageResponse)
async def send_execution_message(
    operation_id: int,
    request: ExecutionMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message during execution.

    Allows users to send instructions, questions, or comments to:
    - Current agent (will be injected into next LLM call)
    - Manager (Evo)
    - Specific agent by name

    The message is stored in the execution transcript and can be consumed
    by the execution generator to inject into agent context.
    """
    print(f"\n[chat] User sending message to operation {operation_id}: '{request.content[:50]}...'")

    # Get operation
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

    # Create execution message
    message = ExecutionMessage(
        operation_id=operation_id,
        sender_type="user",
        sender_name=current_user.username,
        sender_id=current_user.id,
        content=request.content,
        message_type=request.message_type,
        context={
            "target": request.target,
            "consumed": False,  # Will be marked True when injected into agent context
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    print(f"[chat] Created message {message.id} for operation {operation_id}")

    # TODO Phase 3.3: If execution is running, this message should be injected
    # into the agent's context at the next LLM call. This will be implemented
    # in the execution generator.

    return message


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
    performances = evolution_service.get_agent_performance(agent_name=agent_name)

    return {
        "team_id": team_id,
        "agents": [p.to_dict() for p in performances],
        "total_agents": len(performances),
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
        # Hierarchy-mode operations don't create a WorkflowExecution row.
        # Create a minimal one so the user rating can still be persisted.
        workflow_exec = WorkflowExecution(
            operation_id=operation_id,
            status="completed",
            proxy_score=0.5,
        )
        db.add(workflow_exec)
        db.flush()  # get an id without committing yet

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
