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

    Tree depth scales with team size and agent capabilities:

      Tier 0 — Root supervisor (most senior agent: manager > specialist > practitioner).
               Sits above all teams in the graph; receives escalations.

      Tier 1 — Domain sub-supervisors. Identified by:
               (a) can_delegate=True, or
               (b) seniority_level in ("manager", "specialist"), or
               (c) auto-promoted when the team has ≥4 agents (top half of rest).
               Each sub-supervisor owns a cluster of steps that best match their
               keywords (capability-match scoring). They are the supervisor of their
               step-teams and review worker outputs.

      Tier 2 — Leaf workers. Execute individual step actions under whichever
               sub-supervisor owns that step's cluster.

    This produces trees of height 3 for typical 4-agent teams instead of the
    flat height-2 star topology where every agent reports directly to the root.

    Falls back to a flat single team when steps are absent, or to a 2-level
    tree when the team is too small to justify a middle tier.
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
        scope = (
            ["management", "review", "delegation", "planning"]
            if role == AgentRole.SUPERVISOR
            else ["research", "analysis", "execution"]
        )
        return HierarchicalAgent(
            name=safe_name(db_agent.name),
            description=getattr(db_agent, "description", None) or fallback_desc,
            role=role,
            authority_scope=scope,
            llm_config=llm_config,
        )

    seniority_order = {"manager": 0, "specialist": 1, "practitioner": 2}
    sorted_agents = sorted(
        agents,
        key=lambda a: (seniority_order.get(getattr(a, "seniority_level", "practitioner"), 2), a.name),
    )

    if not sorted_agents:
        raise ValueError("No agents found for this team")

    root_sup_db = sorted_agents[0]
    rest = sorted_agents[1:] if len(sorted_agents) > 1 else sorted_agents

    wc = workflow_config or {}
    steps = wc.get("nodes", wc.get("steps", []))

    root_supervisor = make_hagent(
        root_sup_db, AgentRole.SUPERVISOR,
        f"Orchestrates and reviews all work for: {task[:100]}",
    )

    # ------------------------------------------------------------------ #
    # Determine tier-1 sub-supervisors and tier-2 leaf workers            #
    # ------------------------------------------------------------------ #
    sub_sups_db: List[Agent] = []
    leaf_workers_db: List[Agent] = []

    for a in rest:
        can_del = getattr(a, "can_delegate", False)
        seniority = getattr(a, "seniority_level", "practitioner")
        if can_del or seniority in ("manager", "specialist"):
            sub_sups_db.append(a)
        else:
            leaf_workers_db.append(a)

    # Auto-promote: if no natural sub-supervisors and team has ≥4 agents,
    # promote the top half of remaining agents to sub-supervisors.
    if not sub_sups_db and len(agents) >= 4:
        n_promote = max(1, len(rest) // 2)
        sub_sups_db = rest[:n_promote]
        leaf_workers_db = rest[n_promote:]

    all_hagents = [root_supervisor]
    teams: List[HTeam] = []
    step_tree: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------ #
    # Synthesise steps when none exist but domain leads are available.    #
    # Without this, a Research Squad with no workflow plan would collapse  #
    # to a flat depth-1 tree even though it has specialist sub-supervisors.#
    # ------------------------------------------------------------------ #
    if not steps and sub_sups_db:
        # One synthetic step per non-root agent, ordered by seniority so
        # sub-supervisors get their own steps and leaf workers get theirs.
        for a in (sub_sups_db + leaf_workers_db):
            steps.append({
                "id": str(a.id),
                "name": f"{a.name} — {a.specialty or a.role}",
                "agentRole": a.role,
                "description": (
                    getattr(a, "system_prompt", None) or
                    a.specialty or
                    a.role
                ),
            })

    # ------------------------------------------------------------------ #
    # Multi-tier path: sub-supervisors own step clusters                  #
    # ------------------------------------------------------------------ #
    if steps and sub_sups_db:
        # Build HierarchicalAgent objects for each sub-supervisor (shared
        # across multiple step-teams in their cluster).
        sub_sups_ha: Dict[int, HierarchicalAgent] = {}
        for a in sub_sups_db:
            ha = HierarchicalAgent(
                name=safe_name(a.name),
                description=getattr(a, "description", None) or f"Domain lead: {a.name}",
                role=AgentRole.SUPERVISOR,
                authority_scope=["research", "analysis", "execution", "delegation"],
                llm_config=llm_config,
            )
            sub_sups_ha[a.id] = ha
            all_hagents.append(ha)

        # Cluster each step to the best-matching sub-supervisor.
        cluster: Dict[int, List[dict]] = {a.id: [] for a in sub_sups_db}
        for step in steps:
            role_text = step.get("agent_role") or step.get("agentRole") or ""
            if role_text:
                best = max(sub_sups_db, key=lambda a: _score_agent_for_role(a, role_text))
                if _score_agent_for_role(best, role_text) > 0:
                    cluster[best.id].append(step)
                    continue
            # No keyword match: assign to least-loaded sub-supervisor
            min_loaded = min(sub_sups_db, key=lambda a: len(cluster[a.id]))
            cluster[min_loaded.id].append(step)

        # Build one step-team per step, supervised by its domain lead.
        step_counter = 0
        worker_names_used: List[str] = []
        for sub_sup_db in sub_sups_db:
            sub_sup_ha = sub_sups_ha[sub_sup_db.id]
            for step in cluster[sub_sup_db.id]:
                step_counter += 1
                role_text = step.get("agent_role") or step.get("agentRole") or ""

                # Pick the best leaf worker; fall back to sub-supervisor itself.
                if leaf_workers_db:
                    worker_db = max(leaf_workers_db, key=lambda a: _score_agent_for_role(a, role_text))
                else:
                    worker_db = sub_sup_db

                step_desc = step.get("description") or step.get("name") or f"Step {step_counter}"
                step_worker = HierarchicalAgent(
                    name=f"{safe_name(worker_db.name)}_step{step_counter}",
                    description=step_desc[:120],
                    role=AgentRole.WORKER,
                    authority_scope=["research", "analysis", "execution"],
                    llm_config=llm_config,
                )
                all_hagents.append(step_worker)

                team_id = f"step_{step_counter}"
                hteam = HTeam(
                    team_id=team_id,
                    name=f"{safe_name(sub_sup_db.name)} — {step.get('name', f'Step {step_counter}')}",
                    supervisor=sub_sup_ha,
                    workers=[step_worker],
                    delegation_policy=DelegationPolicy(
                        strategy=DelegationStrategy.CAPABILITY_MATCH,
                        max_delegation_depth=3,
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
                worker_names_used.append(safe_name(worker_db.name))

                step_tree.append({
                    "id": step.get("id", str(step_counter)),
                    "team_id": team_id,
                    "name": step.get("name", f"Step {step_counter}"),
                    "agent": safe_name(worker_db.name),
                    "supervisor": safe_name(sub_sup_db.name),
                    "tier": 2 if leaf_workers_db else 1,
                    "depends_on": step.get("depends_on", []),
                })

        graph = HierarchicalWorkFlowGraph.from_teams(
            goal=task,
            teams=teams,
            inputs=[{"name": "task", "type": "str", "description": "The task to complete"}],
            outputs=[{"name": "result", "type": "str", "description": "The completed work"}],
            root_supervisor=root_supervisor,
        )

        tree_depth = 3 if leaf_workers_db else 2
        team_spec = {
            "team_name": team_name,
            "supervisor": root_supervisor.name,
            "sub_supervisors": [safe_name(a.name) for a in sub_sups_db],
            "workers": list(dict.fromkeys(worker_names_used)),  # deduped, order-preserving
            "step_tree": step_tree,
            "tree_depth": tree_depth,
            "reasoning": (
                f"{root_sup_db.name} oversees {len(sub_sups_db)} domain lead(s) "
                f"({', '.join(safe_name(a.name) for a in sub_sups_db)}) "
                f"who each supervise their own step cluster — tree depth {tree_depth}"
            ),
        }

    # ------------------------------------------------------------------ #
    # Flat fallback: no sub-supervisors (small team or no steps)         #
    # ------------------------------------------------------------------ #
    elif steps and rest:
        # 2-level tree: root supervises each step directly
        rr_index = 0
        worker_names: List[str] = []
        for i, step in enumerate(steps):
            role_text = step.get("agent_role") or step.get("agentRole") or ""
            worker_scores = [(a, _score_agent_for_role(a, role_text)) for a in rest]
            max_score = max(s for _, s in worker_scores)

            if max_score > 0:
                step_worker_db = max(rest, key=lambda a: _score_agent_for_role(a, role_text))
            else:
                step_worker_db = rest[rr_index % len(rest)]
                rr_index += 1

            step_desc = step.get("description") or step.get("name") or f"Step {i + 1}"
            step_worker = HierarchicalAgent(
                name=f"{safe_name(step_worker_db.name)}_step{i + 1}",
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
            worker_names.append(safe_name(step_worker_db.name))

            step_tree.append({
                "id": step.get("id", str(i + 1)),
                "team_id": team_id,
                "name": step.get("name", f"Step {i + 1}"),
                "agent": safe_name(step_worker_db.name),
                "supervisor": root_supervisor.name,
                "tier": 1,
                "depends_on": step.get("depends_on", []),
            })

        graph = HierarchicalWorkFlowGraph.from_teams(
            goal=task,
            teams=teams,
            inputs=[{"name": "task", "type": "str", "description": "The task to complete"}],
            outputs=[{"name": "result", "type": "str", "description": "The completed work"}],
        )
        team_spec = {
            "team_name": team_name,
            "supervisor": root_supervisor.name,
            "sub_supervisors": [],
            "workers": list(dict.fromkeys(worker_names)),
            "step_tree": step_tree,
            "tree_depth": 2,
            "reasoning": f"{root_sup_db.name} directly supervises {len(teams)} step(s) — tree depth 2",
        }

    else:
        # No steps: flat single team
        workers = [make_hagent(wa, AgentRole.WORKER, f"Specialist for: {task[:100]}") for wa in rest]
        all_hagents.extend(workers)
        hteam = HTeam(
            team_id="auto_team",
            name=team_name,
            supervisor=root_supervisor,
            workers=workers,
            delegation_policy=DelegationPolicy(
                strategy=DelegationStrategy.CAPABILITY_MATCH,
                max_delegation_depth=3,
            ),
            escalation_rules=[EscalationRule(
                condition="output is empty, too short (under 50 words), or does not address the assigned task",
                action=EscalationAction.ESCALATE_TO_SUPERVISOR,
            )],
            review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
        )
        teams = [hteam]
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal=task,
            teams=teams,
            inputs=[{"name": "task", "type": "str", "description": "The task to complete"}],
            outputs=[{"name": "result", "type": "str", "description": "The completed work"}],
        )
        team_spec = {
            "team_name": team_name,
            "supervisor": root_supervisor.name,
            "sub_supervisors": [],
            "workers": [safe_name(wa.name) for wa in rest],
            "step_tree": [],
            "tree_depth": 1,
            "reasoning": f"{root_sup_db.name} supervises all workers directly — no step plan available",
        }

    seen_names: set = set()
    unique_hagents = []
    for ha in all_hagents:
        if ha.name not in seen_names:
            seen_names.add(ha.name)
            unique_hagents.append(ha)

    agent_manager = AgentManager(agents=unique_hagents)
    return graph, agent_manager, team_spec


import re as _re

def _base_agent_name(name: str) -> str:
    """Strip the _step{n} suffix added to worker names."""
    return _re.sub(r"_step\d+$", "", name)


class ToolAwareHierarchicalWorkFlow:
    """
    Thin wrapper around HierarchicalWorkFlow that overrides
    _execute_worker_subtask to inject tool-calling capability.

    Workers whose base name matches an entry in `agent_tools_map` will
    get a tools prompt section appended to their subtask prompt, and their
    response will be parsed for <tool_call> blocks that are then executed
    before the agent summarises the findings (up to MAX_TOOL_TURNS turns).
    """

    MAX_TOOL_TURNS = 4

    def __init__(self, base_workflow, agent_tools_map: dict):
        """
        Args:
            base_workflow: A HierarchicalWorkFlow instance.
            agent_tools_map: { base_agent_name -> [(EvolvianTool, config), ...] }
        """
        self._wf = base_workflow
        self._agent_tools_map = agent_tools_map

    def __getattr__(self, name):
        return getattr(self._wf, name)

    async def async_execute(self, **kwargs):
        # Patch _execute_worker_subtask on the underlying workflow
        original = self._wf._execute_worker_subtask
        agent_tools_map = self._agent_tools_map

        async def tool_aware_execute(team_id, worker, subtask):
            from routers.operations._utils import _build_tools_prompt_section, _strip_tool_calls
            from core.tools.executor import parse_tool_calls_from_response
            import asyncio as _asyncio

            base_name = _base_agent_name(worker.name)
            tools = agent_tools_map.get(base_name, [])

            if not tools:
                return await original(team_id, worker, subtask)

            import time
            t0 = time.time()
            worker_llm = self._wf._get_agent_llm(worker)
            original_task = getattr(subtask, "original_task", None)
            task_context = f"ORIGINAL QUESTION:\n{original_task}\n\n" if original_task else ""
            tools_section = _build_tools_prompt_section(tools)
            tool_names = ", ".join(t.name for t, _ in tools)

            prompt = (
                f"You are {worker.name}: {worker.description}\n\n"
                f"{task_context}"
                f"YOUR SUBTASK:\n{subtask.description}\n\n"
                f"{tools_section}\n"
                f"IMPORTANT: You MUST use the {tool_names} tool(s) to search for real, "
                f"up-to-date information before writing your answer. Do NOT rely on memory "
                f"or training data alone. Search first, then write your answer based on "
                f"what you actually find. Include source URLs in your answer."
            )

            conversation = prompt
            final_output = ""
            tool_results_accumulated: list = []

            for _turn in range(self.MAX_TOOL_TURNS):
                response = await self._wf._llm_call(worker_llm, conversation)
                tool_calls = parse_tool_calls_from_response(response)

                if not tool_calls:
                    # First turn with no tool calls: nudge the LLM to search
                    if _turn == 0 and tool_results_accumulated == []:
                        tool_name_hint = (tools[0][0].name if tools else "web_search")
                        conversation = (
                            conversation + "\n\n"
                            + response + "\n\n"
                            + f"You have not used any tools yet. You MUST call {tool_name_hint} "
                            f"now to gather real data before answering. Use a <tool_call> block."
                        )
                        continue
                    final_output = response
                    break

                # Execute each tool call
                tool_results = []
                for tc in tool_calls:
                    tool_name = tc.get("name", "")
                    tool_args = tc.get("arguments", {})
                    matched = next((t for t, _ in tools if t.name == tool_name), None)
                    if matched:
                        try:
                            print(f"[hierarchy] Executing tool: {tool_name}({tool_args})")
                            result = await matched.safe_execute(tool_args, {})
                            content = result.output if result.success else f"[error: {result.error}]"
                            snippet = str(content)[:3000]
                            tool_results.append(f"[{tool_name} result]:\n{snippet}")
                            tool_results_accumulated.append(snippet)
                        except Exception as exc:
                            tool_results.append(f"[{tool_name} error]: {exc}")

                if tool_results:
                    conversation = (
                        conversation + "\n\n"
                        + response + "\n\n"
                        + "\n\n".join(tool_results) + "\n\n"
                        + "Based on the search results above, write a detailed answer to your subtask. "
                        + "Cite the sources you used (include URLs where available)."
                    )
                else:
                    final_output = response
                    break
            else:
                final_output = response  # last response if loop exhausted

            from routers.operations._utils import _clean_llm_output
            final_output = _clean_llm_output(_strip_tool_calls(final_output))

            elapsed_ms = int((time.time() - t0) * 1000)
            from dissertation.hierarchy.supervisor import SubtaskResult
            subtask.result = final_output
            subtask.status = "completed"
            self._wf.trace.log_worker_execution(
                team_id=team_id,
                subtask_id=subtask.subtask_id,
                worker_name=worker.name,
                elapsed_ms=elapsed_ms,
                output_len=len(final_output),
            )
            return SubtaskResult(
                subtask_id=subtask.subtask_id,
                worker_name=worker.name,
                output=final_output,
            )

        self._wf._execute_worker_subtask = tool_aware_execute
        return await self._wf.async_execute(**kwargs)

    @property
    def trace(self):
        return self._wf.trace


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

    # Capture these before any db.commit() — commits expire the SQLAlchemy object
    # and subsequent attribute access returns None.
    _op_id = operation.id
    _op_team_id = operation.team_id
    _op_title = operation.title or ""
    _op_description = operation.description or ""

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

        sub_supervisors = team_spec.get("sub_supervisors", [])
        tree_depth = team_spec.get("tree_depth", 2)

        wc = operation.workflow_config or {}
        wc["hierarchy_team"] = {
            "supervisor": supervisor_name,
            "sub_supervisors": sub_supervisors,
            "workers": worker_names,
            "team_name": team_spec.get("team_name", team.name),
            "step_tree": step_tree,
            "tree_depth": tree_depth,
        }
        operation.workflow_config = wc
        db.commit()

        yield emit("hierarchy_decompose", {
            "team_id": "auto_team",
            "supervisor": supervisor_name,
            "sub_supervisors": sub_supervisors,
            "workers": worker_names,
            "step_tree": step_tree,
            "team_name": team_spec.get("team_name", team.name),
            "tree_depth": tree_depth,
            "reasoning": team_spec.get("reasoning", ""),
            "message": f"Team ready: {supervisor_name} → {len(sub_supervisors)} domain lead(s) → {len(step_tree)} steps (depth {tree_depth})",
        })

        sse_queue: List[str] = []

        def sse_emit_callback(event_type: str, data: Dict[str, Any]):
            sse_queue.append(emit(event_type, data))

        # ── Build agent → tools map for tool-aware execution ──────────────
        from models import InstalledTool as InstalledToolModel
        from core.tools.registry import get_tool_registry

        tool_registry = get_tool_registry()
        installed_records = db.query(InstalledToolModel).filter(
            InstalledToolModel.team_id == operation.team_id,
            InstalledToolModel.status == "connected",
        ).all()
        installed_data = [
            {"tool_id": r.tool_id, "assigned_agent_ids": r.assigned_agent_ids or [], "configuration": r.configuration or {}}
            for r in installed_records
        ]

        import re as _re2
        agent_tools_map: Dict[str, list] = {}
        for db_agent in agents:
            base = _re2.sub(r"[^A-Za-z0-9_]", "", db_agent.name.replace(" ", "")) or "Agent"
            agent_tools = tool_registry.get_tools_for_agent(db_agent.id, installed_data)
            if agent_tools:
                agent_tools_map[base] = agent_tools
                print(f"[hierarchy] Tools for {base}: {[t.name for t, _ in agent_tools]}")

        llm = OpenRouterLLM(config=llm_config)
        base_workflow = HierarchicalWorkFlow(
            graph=graph,
            agent_manager=agent_manager,
            llm=llm,
        )
        workflow = ToolAwareHierarchicalWorkFlow(base_workflow, agent_tools_map)

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

        from routers.operations._utils import _clean_llm_output
        final_output = _clean_llm_output(result_holder[0] or "")

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
        wc["hierarchy_team"]["sub_supervisors"] = sub_supervisors
        wc["hierarchy_team"]["tree_depth"] = tree_depth
        operation.workflow_config = wc
        db.commit()

        vault_file_id = None
        vault_file_name = None
        try:
            results_content = f"# {operation.title}\n\n"
            results_content += f"**Task:** {operation.description}\n\n"
            results_content += f"**Team:** {team.name}\n"
            results_content += f"**Supervisor:** {supervisor_name}\n"
            if sub_supervisors:
                results_content += f"**Domain Leads:** {', '.join(sub_supervisors)}\n"
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

        # ── Save WorkflowExecution for Evolution Insights ─────────────────
        try:
            from models import WorkflowExecution
            from core.utils import infer_task_type as _infer_task_type
            from core.runtime.quality_evaluator import QualityEvaluator
            import hashlib

            task_type = _infer_task_type(_op_title, _op_description)
            elapsed_ms = int(trace.get("total_elapsed_s", 0) * 1000)
            nodes_total = len(step_tree) if step_tree else len(agents)
            nodes_completed = trace.get("event_counts", {}).get("worker_complete", nodes_total)

            agent_signature_input = json.dumps(sorted(worker_names + [supervisor_name]))
            workflow_signature = hashlib.sha256(agent_signature_input.encode()).hexdigest()[:16]

            proxy_score = QualityEvaluator.compute_proxy_score(
                output_length=len(final_output),
                execution_time_ms=elapsed_ms,
                nodes_completed=nodes_completed,
                nodes_total=nodes_total,
            )
            quality_score = QualityEvaluator.compute_hybrid_score(proxy_score=proxy_score)

            team_composition = [
                {"agent_id": a.id, "agent_name": a.name, "role": getattr(a, "role", "worker")}
                for a in agents
            ]
            agents_used = [a.name for a in agents]

            wf_exec = WorkflowExecution(
                operation_id=_op_id,
                team_id=_op_team_id,
                workflow_signature=workflow_signature,
                task_type=task_type,
                team_composition=team_composition,
                agents_used=agents_used,
                cost=float(operation.actual_cost or 0),
                latency_ms=elapsed_ms,
                tokens_used=0,
                quality_score=quality_score,
                proxy_score=proxy_score,
                llm_judge_score=None,
                nodes_total=nodes_total,
                nodes_completed=nodes_completed,
                nodes_failed=0,
                status="completed",
                started_at=operation.started_at,
                completed_at=operation.completed_at,
            )
            db.add(wf_exec)
            db.commit()
            print(f"[hierarchy] Saved WorkflowExecution (quality: {quality_score:.3f}, task_type: {task_type})")
        except Exception as wf_err:
            print(f"[hierarchy] Error saving WorkflowExecution (non-fatal): {wf_err}")

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
