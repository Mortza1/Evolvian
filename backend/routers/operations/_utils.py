"""Shared helpers used across multiple operations sub-modules."""

import re
import json
from datetime import datetime, timezone
from typing import Optional
import time

from sqlalchemy.orm import Session

from models import ExecutionMessage
from core.workflows.execution_state import EXECUTION_REGISTRY, ExecutionSignal


def _wait_for_assumption_answer(operation_id: int, timeout: int = 300) -> Optional[str]:
    """
    Wait for user to answer an assumption by polling ExecutionRegistry.

    Returns the user's answer string, or None if timeout/cancelled.
    """
    start_time = time.time()
    poll_interval = 1.0

    while time.time() - start_time < timeout:
        state = EXECUTION_REGISTRY.get(operation_id)

        if not state:
            print(f"[wait_assumption] Execution {operation_id} unregistered")
            return None

        if state.signal == ExecutionSignal.CANCEL_REQUESTED:
            print(f"[wait_assumption] Cancel requested")
            return None

        if state.assumption_answer is not None:
            answer = state.assumption_answer
            print(f"[wait_assumption] Received answer: {answer[:50]}...")
            return answer

        time.sleep(poll_interval)

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
    if review_frequency == "never":
        return False

    if node_index == 0:
        return True

    if review_frequency == "every_node":
        return True
    elif review_frequency == "every_2_nodes":
        return (node_index + 1) % 2 == 0
    elif review_frequency == "first_and_last":
        return node_index == total_nodes - 1

    if len(node_output) < 50:
        return True

    confidence_markers = ["I have completed", "Successfully", "Confirmed", "Verified"]
    if any(marker.lower() in node_output.lower() for marker in confidence_markers):
        return False

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

    remaining_work = "\n".join([f"- {n.get('name', 'Unnamed')}" for n in remaining_nodes[:3]])
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
        evo_response = llm_service.simple_chat(review_prompt, model="gpt-4o-mini")
        print(f"[evo_review] Evo response: {evo_response[:200]}...")

        if "PROCEED" in evo_response.upper() and "needs_clarification" not in evo_response.lower():
            print("[evo_review] Evo approved - no clarification needed")
            return {"needs_clarification": False, "reason": "output_approved"}

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

        if len(evo_response) > 100:
            print("[evo_review] Ambiguous response, treating as no clarification needed")

        return {"needs_clarification": False, "reason": "ambiguous_response"}

    except Exception as e:
        print(f"[evo_review] Error during review: {e}")
        return {"needs_clarification": False, "reason": f"error: {str(e)}"}


def _get_and_consume_user_messages(operation_id: int, db: Session, current_node_id: str = None) -> str:
    """
    Retrieve unread user messages for this operation and mark them as consumed.

    This enables real-time collaboration: users can send instructions or questions
    during execution, and they'll be injected into the agent's context at the next
    LLM call.
    """
    messages = db.query(ExecutionMessage).filter(
        ExecutionMessage.operation_id == operation_id,
        ExecutionMessage.sender_type == "user",
    ).order_by(ExecutionMessage.created_at.asc()).all()

    unread_messages = []
    for msg in messages:
        context = msg.context or {}
        if not context.get("consumed", False):
            target = context.get("target")
            if target in [None, "current_agent", current_node_id]:
                unread_messages.append(msg)

    if not unread_messages:
        return ""

    print(f"[messages] Found {len(unread_messages)} unread user messages for operation {operation_id}")

    message_lines = []
    for msg in unread_messages:
        msg_type = msg.message_type
        type_label = {
            "instruction": "INSTRUCTION",
            "question": "QUESTION",
            "chat": "MESSAGE"
        }.get(msg_type, "MESSAGE")

        message_lines.append(f"[User {type_label}]: {msg.content}")

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

    lines = [
        "\n## Available Tools",
        "Call tools by outputting a <tool_call> XML block. "
        "You MUST call at least one tool before writing your final answer.\n",
    ]
    for tool, _config in agent_tools:
        param_parts = []
        example_args = []
        for p in tool.parameters:
            req = " (required)" if p.required else " (optional)"
            param_parts.append(f'    "{p.name}": "<{p.description}>{req}"')
            if p.required:
                example_args.append(f'"{p.name}": "example value"')
        params_json = ",\n".join(param_parts)
        example_json = ", ".join(example_args)
        lines.append(
            f"### {tool.name}\n"
            f"{tool.description}\n\n"
            f"Format:\n"
            f'<tool_call>\n{{"name": "{tool.name}", "arguments": {{{params_json}\n}}}}\n</tool_call>\n\n'
            f"Example:\n"
            f'<tool_call>\n{{"name": "{tool.name}", "arguments": {{{example_json}}}}}\n</tool_call>\n'
        )

    lines.append(
        "Call tools one at a time. After receiving results, you may call more tools "
        "or write your final answer. Always cite sources (URLs) in your answer.\n"
    )
    return "\n".join(lines)


def _strip_tool_calls(text: str) -> str:
    """Strip leftover <tool_call> XML tags from the agent's final response."""
    return re.sub(r'<tool_call>.*?</tool_call>', '', text, flags=re.DOTALL).strip()


# Patterns injected by some LLM providers/models when they see tool schemas
# in the conversation but decide not to call tools.
_LLM_META_PATTERNS = [
    # "CRITICAL: ..." lines or paragraphs (provider injections)
    re.compile(r'(?:^|\n)CRITICAL:.*?(?=\n[A-Z]|\n\n|\Z)', re.DOTALL | re.IGNORECASE),
    # "Note: ..." meta-commentary at the end of responses
    re.compile(r'(?:^|\n)Note:.*?Do NOT call any tools.*?(?=\n\n|\Z)', re.DOTALL | re.IGNORECASE),
    # Residual tool schemas accidentally echoed back
    re.compile(r'## Available Tools\n.*?(?=\n##|\Z)', re.DOTALL),
]


def _clean_llm_output(text: str) -> str:
    """
    Remove LLM meta-instructions and provider injections from agent output.

    Some models (via OpenRouter) inject self-reminder text like
    "CRITICAL: Respond with TEXT ONLY. Do NOT call any tools..."
    when tool schemas appear in the conversation history. This strips
    those artifacts before the output is stored in the vault.
    """
    cleaned = text
    for pattern in _LLM_META_PATTERNS:
        cleaned = pattern.sub('', cleaned)
    # Also strip <tool_call> remnants
    cleaned = re.sub(r'<tool_call>.*?</tool_call>', '', cleaned, flags=re.DOTALL)
    return cleaned.strip()


def _update_tool_stats(db: Session, installed_tool_by_id: dict, tool_name: str, cost: float) -> None:
    """Update InstalledTool.total_calls and total_cost in the DB."""
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
