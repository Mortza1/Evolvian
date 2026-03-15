"""Hierarchy helpers and generate_hierarchical_execution_events()."""

import json
import time
import asyncio
import threading
from datetime import datetime, timezone
from typing import List, Dict, Any, Generator

from models import Operation, Team, Agent, VaultFile


def _score_agent_for_role(agent, role_text: str) -> int:
    """Count keyword overlaps between a role string and all agent text fields."""
    parts = [
        agent.name,
        getattr(agent, 'description', '') or '',
        getattr(agent, 'role', '') or '',
        getattr(agent, 'specialty', '') or '',
    ]
    haystack = " ".join(parts).lower()
    needle_words = set(w for w in role_text.lower().replace("-", " ").replace("_", " ").split() if len(w) > 3)
    return sum(1 for w in needle_words if w in haystack)


def _select_workers_from_plan(
    candidate_agents: List[Agent],
    workflow_config: dict,
) -> List[Agent]:
    """
    Use the plan's step agent_roles to pick the best-matching workers.
    Each unique role gets the highest-scoring candidate. When scores are
    all zero (no keyword overlap), agents are distributed round-robin so
    multiple workers are used rather than collapsing to one.
    """
    steps = workflow_config.get("nodes", workflow_config.get("steps", []))
    roles = [s.get("agent_role") or s.get("agentRole") or "" for s in steps]
    roles = [r for r in roles if r]

    if not roles or not candidate_agents:
        return candidate_agents

    selected: List[Agent] = []
    seen_ids: set = set()

    for i, role in enumerate(roles):
        scores = [(a, _score_agent_for_role(a, role)) for a in candidate_agents]
        max_score = max(s for _, s in scores)

        if max_score > 0:
            best = max(candidate_agents, key=lambda a: _score_agent_for_role(a, role))
        else:
            # No keyword match — distribute round-robin to ensure variety
            best = candidate_agents[i % len(candidate_agents)]

        if best.id not in seen_ids:
            selected.append(best)
            seen_ids.add(best.id)

    return selected or candidate_agents


def _build_hierarchy_from_agents(
    task: str,
    agents: List[Agent],
    team_name: str,
    llm_config,
    workflow_config: dict | None = None,
) -> tuple:
    """
    Build a multi-level HierarchicalWorkFlowGraph from the team's hired agents.

    Each workflow step becomes its own team node:
      - The most-senior agent is the root supervisor across all steps.
      - Each step's best-matching worker acts as a mini-supervisor of that node,
        with the root supervisor overseeing the whole chain.
    Steps are chained sequentially (step N → step N+1) so each specialist
    hands off to the next, producing a tree of height >= 2.

    Falls back to a single flat team when the plan has no step definitions.
    """
    import re as _re
    from dissertation.hierarchy.team import (
        Team as HTeam, AgentRole, DelegationPolicy, DelegationStrategy,
        EscalationRule, EscalationAction, ReviewMode, HierarchicalAgent,
    )
    from dissertation.hierarchy.hierarchical_graph import HierarchicalWorkFlowGraph
    from evoagentx.agents import AgentManager

    def safe_name(n: str) -> str:
        return _re.sub(r"[^A-Za-z0-9_]", "", n.replace(" ", "")) or "Agent"

    def make_hagent(db_agent, role: AgentRole, fallback_desc: str) -> HierarchicalAgent:
        return HierarchicalAgent(
            name=safe_name(db_agent.name),
            description=getattr(db_agent, "description", None) or fallback_desc,
            role=role,
            authority_scope=["management", "review", "delegation"] if role == AgentRole.SUPERVISOR else ["research", "analysis", "execution"],
            llm_config=llm_config,
        )

    seniority_order = {"manager": 0, "specialist": 1, "practitioner": 2}
    sorted_agents = sorted(agents, key=lambda a: seniority_order.get(getattr(a, "seniority_level", "practitioner"), 2))

    if not sorted_agents:
        raise ValueError("No agents found for this team")

    sup_db = sorted_agents[0]
    candidate_workers = sorted_agents[1:] if len(sorted_agents) > 1 else sorted_agents

    wc = workflow_config or {}
    steps = wc.get("nodes", wc.get("steps", []))

    root_supervisor = make_hagent(sup_db, AgentRole.SUPERVISOR, f"Orchestrates and reviews all work for: {task[:100]}")

    all_hagents = [root_supervisor]
    teams: List[HTeam] = []

    step_tree: List[Dict[str, Any]] = []

    if steps and candidate_workers:
        # One team per step — every step gets its own node, no skipping or deduplication
        rr_index = 0
        for i, step in enumerate(steps):
            role_text = step.get("agent_role") or step.get("agentRole") or ""
            worker_scores = [(a, _score_agent_for_role(a, role_text)) for a in candidate_workers]
            max_worker_score = max(s for _, s in worker_scores)

            if max_worker_score > 0:
                step_worker_db = max(candidate_workers, key=lambda a: _score_agent_for_role(a, role_text))
            else:
                step_worker_db = candidate_workers[rr_index % len(candidate_workers)]
                rr_index += 1

            step_desc = step.get("description") or step.get("name") or f"Step {i + 1}"
            step_agent_name = f"{safe_name(step_worker_db.name)}_step{i + 1}"
            step_worker = HierarchicalAgent(
                name=step_agent_name,
                description=step_desc[:120],
                role=AgentRole.WORKER,
                authority_scope=["research", "analysis", "execution"],
                llm_config=llm_config,
            )
            all_hagents.append(step_worker)

            team_id = f"step_{i + 1}"
            hteam = HTeam(
                team_id=team_id,
                name=f"{safe_name(step_worker_db.name)} — {step.get('name', f'Step {i + 1}')}",
                supervisor=root_supervisor,
                workers=[step_worker],
                delegation_policy=DelegationPolicy(
                    strategy=DelegationStrategy.CAPABILITY_MATCH,
                    max_delegation_depth=2,
                ),
                escalation_rules=[
                    EscalationRule(
                        condition="output is empty, too short (under 50 words), or does not address the assigned task",
                        action=EscalationAction.ESCALATE_TO_SUPERVISOR,
                    )
                ],
                review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
            )
            teams.append(hteam)

            step_tree.append({
                "id": step.get("id", str(i + 1)),
                "team_id": team_id,
                "name": step.get("name", f"Step {i + 1}"),
                "agent": safe_name(step_worker_db.name),
                "depends_on": step.get("depends_on", []),
            })

        worker_names = [safe_name(step_worker_db_name) for step_worker_db_name in
                        [t.workers[0].name.rsplit("_step", 1)[0] for t in teams]]
    else:
        # Fallback: flat single team with all candidates
        workers = [make_hagent(wa, AgentRole.WORKER, f"Specialist for: {task[:100]}") for wa in candidate_workers]
        all_hagents.extend(workers)
        hteam = HTeam(
            team_id="auto_team",
            name=team_name,
            supervisor=root_supervisor,
            workers=workers,
            delegation_policy=DelegationPolicy(strategy=DelegationStrategy.CAPABILITY_MATCH, max_delegation_depth=3),
            escalation_rules=[EscalationRule(
                condition="output is empty, too short (under 50 words), or does not address the assigned task",
                action=EscalationAction.ESCALATE_TO_SUPERVISOR,
            )],
            review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
        )
        teams = [hteam]
        worker_names = [safe_name(wa.name) for wa in candidate_workers]

    graph = HierarchicalWorkFlowGraph.from_teams(
        goal=task,
        teams=teams,
        inputs=[{"name": "task", "type": "str", "description": "The task to complete"}],
        outputs=[{"name": "result", "type": "str", "description": "The completed work"}],
    )

    team_spec = {
        "team_name": team_name,
        "supervisor": root_supervisor.name,
        "workers": worker_names,
        "step_tree": step_tree,
        "reasoning": f"{sup_db.name} supervises {len(teams)} step-team(s)",
    }

    seen_names: set = set()
    unique_hagents = []
    for ha in all_hagents:
        if ha.name not in seen_names:
            seen_names.add(ha.name)
            unique_hagents.append(ha)

    agent_manager = AgentManager(agents=unique_hagents)
    return graph, agent_manager, team_spec


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
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

    def emit(event_type: str, data: Dict[str, Any]) -> str:
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"

    task = operation.description or operation.title
    print(f"\n[hierarchy] Starting hierarchical execution for op {operation.id}: {task[:80]}")

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
        yield emit("hierarchy_decompose", {
            "team_id": "auto_team",
            "supervisor": "Evo",
            "message": "Assembling team from your hired agents...",
        })

        from dissertation.config import get_llm_config
        from dissertation.hierarchy.execution import HierarchicalWorkFlow
        from evoagentx.models.openrouter_model import OpenRouterLLM

        llm_config = get_llm_config(temperature=0.1, max_tokens=2048)

        graph, agent_manager, team_spec = _build_hierarchy_from_agents(
            task=task,
            agents=agents,
            team_name=team.name,
            llm_config=llm_config,
            workflow_config=operation.workflow_config or {},
        )

        supervisor_name = team_spec["supervisor"]
        worker_names = team_spec["workers"]

        step_tree = team_spec.get("step_tree", [])

        wc = operation.workflow_config or {}
        wc["hierarchy_team"] = {
            "supervisor": supervisor_name,
            "workers": worker_names,
            "team_name": team_spec.get("team_name", team.name),
            "step_tree": step_tree,
        }
        operation.workflow_config = wc
        db.commit()

        yield emit("hierarchy_decompose", {
            "team_id": "auto_team",
            "supervisor": supervisor_name,
            "workers": worker_names,
            "step_tree": step_tree,
            "team_name": team_spec.get("team_name", team.name),
            "reasoning": team_spec.get("reasoning", ""),
            "message": f"Team ready: {supervisor_name} supervising {len(step_tree)} steps",
        })

        sse_queue: List[str] = []

        def sse_emit_callback(event_type: str, data: Dict[str, Any]):
            sse_queue.append(emit(event_type, data))

        llm = OpenRouterLLM(config=llm_config)
        workflow = HierarchicalWorkFlow(
            graph=graph,
            agent_manager=agent_manager,
            llm=llm,
        )

        loop = asyncio.new_event_loop()

        async def _run():
            return await workflow.async_execute(
                inputs={"task": task},
                sse_emit=sse_emit_callback,
            )

        result_holder: List = [None, None]

        def _thread_target():
            try:
                result_holder[0] = loop.run_until_complete(_run())
            except Exception as e:
                result_holder[1] = str(e)
            finally:
                loop.close()

        from core.workflows.execution_state import EXECUTION_REGISTRY, ExecutionSignal
        EXECUTION_REGISTRY.register(operation.id)

        thread = threading.Thread(target=_thread_target, daemon=True)
        thread.start()

        cancelled = False
        while thread.is_alive():
            while sse_queue:
                yield sse_queue.pop(0)
            state = EXECUTION_REGISTRY.get(operation.id)
            if state and state.signal == ExecutionSignal.CANCEL_REQUESTED:
                cancelled = True
                loop.call_soon_threadsafe(loop.stop)
                break
            time.sleep(0.2)

        if cancelled:
            thread.join(timeout=5)
            operation.status = "cancelled"
            db.commit()
            EXECUTION_REGISTRY.unregister(operation.id)
            yield emit("cancelled", {
                "operation_id": operation.id,
                "node_name": "hierarchical execution",
                "total_cost": float(operation.actual_cost or 0),
                "message": "Operation cancelled.",
            })
            return

        while sse_queue:
            yield sse_queue.pop(0)

        thread.join()
        EXECUTION_REGISTRY.unregister(operation.id)

        if result_holder[1]:
            raise RuntimeError(result_holder[1])

        final_output = result_holder[0] or ""

        operation.status = "completed"
        operation.completed_at = datetime.now(timezone.utc)
        wc = operation.workflow_config or {}
        wc["hierarchy_result"] = final_output[:5000]
        wc["hierarchy_team"] = {
            "supervisor": supervisor_name,
            "workers": worker_names,
            "team_name": team_spec.get("team_name", team.name),
            "step_tree": step_tree,
        }
        trace = workflow.trace.summary()
        wc["hierarchy_trace"] = trace
        operation.workflow_config = wc
        db.commit()

        vault_file_id = None
        vault_file_name = None
        try:
            results_content = f"# {operation.title}\n\n"
            results_content += f"**Task:** {operation.description}\n\n"
            results_content += f"**Team:** {team.name}\n"
            results_content += f"**Supervisor:** {supervisor_name}\n"
            results_content += f"**Workers:** {', '.join(worker_names)}\n"
            if operation.completed_at:
                results_content += f"**Completed:** {operation.completed_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            results_content += "\n---\n\n"
            results_content += final_output

            vault_file = VaultFile(
                team_id=operation.team_id,
                operation_id=operation.id,
                name=f"{operation.title} - Results.md",
                file_type="md",
                folder_path="/Workflow Outputs",
                content=results_content,
                content_json=wc,
                size_bytes=len(results_content.encode("utf-8")),
                mime_type="text/markdown",
                created_by="system",
                source_type="operation",
            )
            db.add(vault_file)
            db.commit()
            db.refresh(vault_file)

            vault_file_id = vault_file.id
            vault_file_name = vault_file.name
            wc["vault_file_id"] = vault_file_id
            wc["vault_file_name"] = vault_file_name
            operation.workflow_config = wc
            db.commit()
            print(f"[hierarchy] Saved results to vault: {vault_file_name} (ID: {vault_file_id})")

            yield emit("file_saved", {
                "file_id": vault_file_id,
                "file_name": vault_file_name,
                "folder_path": "/Workflow Outputs",
            })

        except Exception as e:
            print(f"[hierarchy] Error saving to vault: {e}")

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
