"""generate_execution_events() — the main SSE execution loop."""

import json
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import List, Dict, Any, Generator, Optional

from sqlalchemy.orm import Session

from models import Operation, Team, Agent, VaultFile, WorkflowExecution, InstalledTool
from llm_service import llm_service, ChatMessage as LLMChatMessage
from core.workflows.execution_state import EXECUTION_REGISTRY, ExecutionSignal
from core.runtime import (
    ExecutionContext, AgentState, ToolState, NodeMetrics, MemoryBridge,
    EvolutionService, WorkflowDNA, QualityEvaluator
)
from core.tools.executor import ToolExecutor, parse_tool_calls_from_response, parse_assumptions_from_response
from core.tools.registry import get_tool_registry
from rag_service import rag_service
from core.utils import infer_task_type as _infer_task_type

from ._utils import (
    _wait_for_assumption_answer,
    should_evo_review,
    run_evo_review,
    _get_and_consume_user_messages,
    _record_execution_event_as_message,
    _build_tools_prompt_section,
    _strip_tool_calls,
    _update_tool_stats,
)


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

    workflow_config = operation.workflow_config or {}
    nodes = workflow_config.get("nodes", [])

    if not nodes:
        yield emit("error", {"message": "No workflow nodes defined"})
        return

    if existing_context:
        context = existing_context
        context.resume()
        print(f"[execute] Restored context from checkpoint")
    else:
        context = ExecutionContext(
            operation_id=operation.id,
            team_id=operation.team_id
        )
        context.add_to_memory("task_goal", operation.title)
        context.add_to_memory("task_description", operation.description)
        context.add_to_memory("team_name", team.name)

        agent_roles = [node.get("agentRole", node.get("agent_role", "")) for node in nodes]
        context.compute_workflow_signature(agents=agent_roles)
        print(f"[execute] Created new context with signature: {context.workflow_signature}")

    context.start(total_nodes=len(nodes))
    context.current_node_index = start_index

    memory_bridge = MemoryBridge(team_id=operation.team_id, db=db)

    knowledge_context = memory_bridge.get_knowledge_context(
        task_description=operation.description,
        include_policies=True,
        include_entities=True,
        include_decisions=True,
        max_per_type=3
    )

    if not knowledge_context.is_empty():
        context.add_knowledge_context(knowledge_context.to_dict().get("policies", []))
        context.add_knowledge_context(knowledge_context.to_dict().get("entities", []))
        context.add_knowledge_context(knowledge_context.to_dict().get("decisions", []))
        print(f"[execute] Loaded knowledge context: {len(knowledge_context.policies)} policies, "
              f"{len(knowledge_context.entities)} entities, {len(knowledge_context.decisions)} decisions")

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
                    for s in suggestions[:2]:
                        print(f"[execute]   - [{s.suggestion_type}] {s.description}")
    except Exception as e:
        print(f"[execute] Evolution check failed (non-fatal): {e}")

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
        if inst.tool_id == "tool-file-manager":
            tool_dict["configuration"]["db"] = db
            tool_dict["configuration"]["team_id"] = operation.team_id
        installed_tools_data.append(tool_dict)
        installed_tool_by_id[inst.tool_id] = inst

    tool_executor = ToolExecutor(context, installed_tools_data, tool_registry)
    print(f"[execute] Loaded {len(installed_tools_data)} installed tools for team {operation.team_id}")

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

        operation.status = "active"
        if not is_resume:
            operation.started_at = datetime.now(timezone.utc)
        operation.execution_checkpoint = None
        db.commit()

        agent_by_role = {}
        for agent in agents:
            role_lower = agent.role.lower()
            agent_by_role[role_lower] = agent
            if agent.specialty:
                agent_by_role[agent.specialty.lower()] = agent

        for idx, node in enumerate(nodes[start_index:], start=start_index):
            node_id = node.get("id", f"step-{idx+1}")
            node_name = node.get("name", f"Step {idx+1}")
            node_desc = node.get("description", "")
            agent_role = node.get("agentRole", node.get("agent_role", "General Agent"))

            state = EXECUTION_REGISTRY.get(operation.id)
            if state:
                if state.signal == ExecutionSignal.CANCEL_REQUESTED:
                    print(f"[execute] Cancel requested at node {idx}")
                    context.status = "cancelled"
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

            context.start_node(node_id, agent_name)
            context.current_node_index = idx

            yield emit("node_start", {
                "node_id": node_id,
                "node_index": idx,
                "name": node_name,
                "description": node_desc,
                "agent_name": agent_name,
                "agent_photo": agent_photo,
                "agent_role": agent_role,
            })

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

            agent_tools = tool_registry.get_tools_for_agent(agent_id, installed_tools_data)
            tools_prompt_section = _build_tools_prompt_section(agent_tools)

            yield emit("progress", {
                "node_id": node_id,
                "progress": 25,
            })

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
                previous_outputs = context.get_all_agent_outputs()

                knowledge_section = ""
                if not knowledge_context.is_empty():
                    knowledge_section = knowledge_context.to_prompt_section()

                previous_work_section = ""
                if previous_outputs:
                    previous_work_section = "\n## Previous Work from Team\n"
                    for prev_agent, prev_output in previous_outputs.items():
                        prev_preview = prev_output[:200] + "..." if len(prev_output) > 200 else prev_output
                        previous_work_section += f"### {prev_agent}\n{prev_preview}\n\n"

                tool_instruction = ""
                if agent_tools:
                    tool_instruction = "\nIf a tool would help you complete this task, use it. Otherwise, respond directly."

                assumption_instruction = """

**IMPORTANT - If Uncertain**: If you are uncertain about something critical that would impact your work quality, output an assumption block before your response:
<assumption>
<question>Your specific question here</question>
<context>Why you need to know this</context>
<options>Option1|Option2|Option3</options>
<priority>high</priority>
</assumption>

Only raise assumptions for truly critical uncertainties. Most tasks can proceed with reasonable assumptions."""

                agent_custom_prompt = getattr(assigned_agent, 'system_prompt', None) or ""
                agent_specialty = getattr(assigned_agent, 'specialty', None) or ""
                agent_traits = getattr(assigned_agent, 'personality_traits', None) or []
                agent_seniority = getattr(assigned_agent, 'seniority_level', None) or "practitioner"
                agent_kb = getattr(assigned_agent, 'knowledge_base', None) or []

                if agent_custom_prompt:
                    identity_block = agent_custom_prompt
                else:
                    trait_str = ", ".join(agent_traits) if agent_traits else ""
                    identity_block = f"You are {agent_name}, a {agent_role}."
                    if agent_specialty:
                        identity_block += f" Your specialty is {agent_specialty}."
                    if trait_str:
                        identity_block += f" You are {trait_str}."

                seniority_note = ""
                if agent_seniority == "specialist":
                    seniority_note = "\nYou are a deep specialist. Provide authoritative, precise answers within your domain. Do not speculate outside it."
                elif agent_seniority == "manager":
                    seniority_note = "\nYou are a manager-level agent. Your job is to think strategically, coordinate outputs, and ensure quality across the team's work."

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
                        print(f"[execute] RAG retrieval failed, falling back to full injection: {_rag_err}")
                        kb_section = "\n## Your Knowledge Base\n"
                        for entry in agent_kb:
                            title = entry.get("title", "Reference")
                            content = entry.get("content", "")
                            if content:
                                kb_section += f"### {title}\n{content}\n\n"

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

                if not agent_tools:
                    user_messages_context = _get_and_consume_user_messages(operation.id, db, node_id)
                    effective_prompt = system_prompt + user_messages_context

                    print(f"[execute] Calling LLM for node {node_id} (no tools, prompt: {len(effective_prompt)} chars)...")
                    llm_response = llm_service.simple_chat(effective_prompt)
                    tokens_used = len(effective_prompt) // 4 + len(llm_response) // 4
                    print(f"[execute] LLM response received: {len(llm_response)} chars")

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

                        user_messages_context = _get_and_consume_user_messages(operation.id, db, node_id)
                        follow_up_prompt = f"{system_prompt}\n\n## User's Answer to Your Question\n\nQ: {assumption['question']}\nA: {answer}\n\nNow please complete the task with this information.{user_messages_context}"
                        llm_response = llm_service.simple_chat(follow_up_prompt)
                        tokens_used += len(follow_up_prompt) // 4 + len(llm_response) // 4
                        print(f"[execute] LLM response after assumption answered: {len(llm_response)} chars")
                else:
                    print(f"[execute] Starting tool loop for node {node_id} ({len(agent_tools)} tools available)...")
                    messages = [
                        LLMChatMessage(role="system", content=system_prompt),
                        LLMChatMessage(role="user", content=f"Complete this task: {node_name}\n\n{node_desc}"),
                    ]

                    max_tool_turns = 5
                    for turn in range(max_tool_turns):
                        user_messages_context = _get_and_consume_user_messages(operation.id, db, node_id)
                        if user_messages_context:
                            messages.append(LLMChatMessage(
                                role="user",
                                content=f"[REAL-TIME UPDATE FROM USER]{user_messages_context}"
                            ))

                        completion = llm_service.chat_completion(messages)
                        assistant_text = completion.response
                        usage = completion.usage or {}
                        tokens_used += usage.get("total_tokens", len(assistant_text) // 4)

                        assumptions = parse_assumptions_from_response(assistant_text)
                        if assumptions:
                            assumption = assumptions[0]
                            print(f"[execute] Assumption raised: {assumption['question'][:50]}...")

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
                                    "message": "No response received for assumption. Execution cannot continue."
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

                            messages.append(LLMChatMessage(role="assistant", content=assistant_text))
                            messages.append(LLMChatMessage(
                                role="user",
                                content=f"Thank you. The user answered your question:\n\nQ: {assumption['question']}\nA: {answer}\n\nNow please continue with your task, incorporating this information."
                            ))
                            continue

                        tool_calls = parse_tool_calls_from_response(assistant_text)

                        if not tool_calls:
                            llm_response = assistant_text
                            print(f"[execute] Turn {turn+1}: final response ({len(llm_response)} chars)")
                            break

                        print(f"[execute] Turn {turn+1}: {len(tool_calls)} tool call(s)")
                        tool_results_text = ""
                        for tc in tool_calls:
                            tc_name = tc.get("name", "unknown")
                            tc_args = tc.get("arguments", {})

                            yield emit("tool_use", {
                                "node_id": node_id,
                                "agent_name": agent_name,
                                "tool": tc_name,
                                "status": "running",
                            })

                            try:
                                loop = asyncio.new_event_loop()
                                tool_result = loop.run_until_complete(
                                    tool_executor.execute_function_call(tc, agent_name=agent_name)
                                )
                                loop.close()
                            except RuntimeError:
                                with ThreadPoolExecutor(max_workers=1) as pool:
                                    future = pool.submit(
                                        asyncio.run,
                                        tool_executor.execute_function_call(tc, agent_name=agent_name)
                                    )
                                    tool_result = future.result(timeout=60)

                            _update_tool_stats(db, installed_tool_by_id, tc_name, tool_result.cost)

                            if tool_result.success:
                                yield emit("tool_use", {
                                    "node_id": node_id,
                                    "agent_name": agent_name,
                                    "tool": tc_name,
                                    "status": "completed",
                                })
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

                        messages.append(LLMChatMessage(role="assistant", content=assistant_text))
                        messages.append(LLMChatMessage(role="user", content=f"Tool results:{tool_results_text}\n\nContinue with the task. If you have enough information, provide your final answer without any tool calls."))
                    else:
                        llm_response = assistant_text
                        print(f"[execute] Tool loop exhausted after {max_tool_turns} turns")

                    llm_response = _strip_tool_calls(llm_response)

                print(f"[execute] LLM final response: {len(llm_response)} chars, {tokens_used} tokens")

                yield emit("llm_call", {
                    "node_id": node_id,
                    "agent_name": agent_name,
                    "status": "completed",
                    "output_preview": llm_response[:200] + "..." if len(llm_response) > 200 else llm_response,
                })

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

            if assigned_agent:
                node_cost = assigned_agent.cost_per_hour * 0.1

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

            EXECUTION_REGISTRY.update_progress(operation.id, idx + 1, {"id": node_id, "status": "completed"})
            context.advance_node()

            remaining_nodes = nodes[idx + 1:]
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
                    print(f"[execute] Manager needs clarification: {evo_review['question']}")

                    context.raise_assumption(
                        question=evo_review["question"],
                        context=evo_review["context"],
                        options=evo_review.get("options", []),
                        priority="high"
                    )

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

                    EXECUTION_REGISTRY.request_input(operation.id, evo_review)
                    operation.execution_checkpoint = context.to_checkpoint()
                    operation.status = "waiting_for_input"
                    db.commit()

                    answer = _wait_for_assumption_answer(operation.id, timeout=300)

                    if answer is None:
                        yield emit("assumption_timeout", {
                            "operation_id": operation.id,
                            "node_id": node_id,
                            "message": "No response received for manager's question. Execution cannot continue."
                        })
                        context.status = "failed"
                        operation.status = "failed"
                        db.commit()
                        return

                    context.answer_assumption(len(context.assumptions) - 1, answer)
                    yield emit("assumption_answered", {
                        "assumption_index": len(context.assumptions) - 1,
                        "answer": answer,
                        "answered_by": "user",
                        "question_from": "manager",
                    })

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

                    print(f"[execute] Manager clarification received: {answer[:100]}...")

            time.sleep(0.2)

        context.complete(success=True)

        operation.workflow_config = workflow_config
        operation.status = "completed"
        operation.actual_cost = context.metrics.total_cost
        operation.completed_at = datetime.now(timezone.utc)
        operation.execution_checkpoint = None
        db.commit()

        try:
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

        try:
            for agent in agents:
                perf_list = evolution_service.get_agent_performance(agent_name=agent.name)
                if perf_list:
                    perf = perf_list[0]
                    agent.rating = round(1.0 + perf.avg_quality * 4.0, 2)
                    agent.accuracy = round(perf.success_rate * 100, 1)
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

        try:
            learnings_stored = 0
            for agent_name_key, agent_state in context.agent_states.items():
                if agent_state.output and len(agent_state.output) > 100:
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

        try:
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

        yield emit("complete", {
            "operation_id": operation.id,
            "status": "completed",
            "total_cost": context.metrics.total_cost,
            "duration_seconds": (operation.completed_at - operation.started_at).total_seconds(),
        })

        print(f"[execute] Operation {operation.id} completed!")

    finally:
        EXECUTION_REGISTRY.unregister(operation.id)
