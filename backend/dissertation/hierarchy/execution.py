"""
HierarchicalWorkFlow — executes a HierarchicalWorkFlowGraph.

When the execution engine encounters a team node, instead of running a
plain agent, it runs the full supervisor loop:

    1. Supervisor DECOMPOSES the task into subtasks
    2. DelegationEngine ASSIGNS each subtask to a worker
    3. Workers EXECUTE their subtasks (via LLM async_generate)
    4. After each worker, ESCALATION RULES are checked — if triggered,
       the supervisor handles the subtask directly, retries with a
       different worker, or fails the task.
    5. SupervisorReviewer REVIEWS outputs and either:
       - Approves and synthesises a final answer, or
       - Requests revisions (up to MAX_REVISION_ROUNDS)
    6. Final output is stored in the Environment for downstream nodes.
       CROSS-TEAM HANDOFF is handled automatically: the Environment
       accumulates all outputs, so the next team reads upstream results.

Non-team nodes execute via the standard WorkFlow path.

Usage:
    workflow = HierarchicalWorkFlow(
        graph=hierarchical_graph,
        llm=llm,
        agent_manager=agent_manager,
    )
    output = workflow.execute(inputs={"question": "..."})
"""
import asyncio
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

from evoagentx.workflow.workflow import WorkFlow
from evoagentx.workflow.workflow_graph import WorkFlowNode
from evoagentx.core.message import Message, MessageType
from evoagentx.workflow.environment import TrajectoryState, Environment
from evoagentx.core.logging import logger

from dissertation.hierarchy.hierarchical_graph import HierarchicalWorkFlowGraph
from dissertation.hierarchy.supervisor import (
    SupervisorDecomposer, DelegationEngine, SupervisorReviewer,
    Subtask, SubtaskResult,
)
from dissertation.hierarchy.team import Team, ReviewMode, EscalationAction


# Maximum revision rounds before accepting the current output
MAX_REVISION_ROUNDS = 2

# Maximum retries per subtask for escalation
MAX_ESCALATION_RETRIES = 2


# ---------------------------------------------------------------------------
# EscalationError
# ---------------------------------------------------------------------------

class EscalationError(RuntimeError):
    """Raised when an escalation rule with FAIL_TASK action is triggered."""


# ---------------------------------------------------------------------------
# ExecutionTrace — records every event for analysis
# ---------------------------------------------------------------------------

@dataclass
class TraceEvent:
    event_type: str           # decompose | delegate | execute | escalate | review | revise | handoff
    timestamp: float
    data: Dict[str, Any] = field(default_factory=dict)


class ExecutionTrace:
    """
    Records every event in a hierarchical execution.

    Used for:
    - Dissertation overhead analysis (API calls, tokens, time)
    - Debugging delegation / review behaviour
    - Generating execution trace figures
    """

    def __init__(self):
        self.events: List[TraceEvent] = []
        self.start_time: float = time.time()

    def _log(self, event_type: str, **data):
        self.events.append(TraceEvent(
            event_type=event_type,
            timestamp=time.time() - self.start_time,
            data=data,
        ))

    def log_decomposition(self, team_id: str, task: str, subtasks: List[Subtask]):
        self._log("decompose", team_id=team_id, task=task[:200],
                  subtask_count=len(subtasks),
                  subtasks=[{"id": s.subtask_id, "desc": s.description[:100]} for s in subtasks])

    def log_delegation(self, team_id: str, subtask_id: str, worker_name: str, strategy: str):
        self._log("delegate", team_id=team_id, subtask_id=subtask_id,
                  worker=worker_name, strategy=strategy)

    def log_worker_execution(self, team_id: str, subtask_id: str, worker_name: str,
                              elapsed_ms: int, output_len: int):
        self._log("execute", team_id=team_id, subtask_id=subtask_id,
                  worker=worker_name, elapsed_ms=elapsed_ms, output_len=output_len)

    def log_escalation(self, team_id: str, subtask_id: str, worker_name: str,
                        condition: str, action: str):
        self._log("escalate", team_id=team_id, subtask_id=subtask_id,
                  worker=worker_name, condition=condition, action=action)

    def log_review(self, team_id: str, approved: bool, revisions_needed: List[str]):
        self._log("review", team_id=team_id, approved=approved,
                  revisions_needed=revisions_needed)

    def log_revision(self, team_id: str, subtask_id: str, worker_name: str, round_: int):
        self._log("revise", team_id=team_id, subtask_id=subtask_id,
                  worker=worker_name, revision_round=round_)

    def log_handoff(self, from_team: str, to_node: str, output_len: int):
        self._log("handoff", from_team=from_team, to_node=to_node, output_len=output_len)

    def summary(self) -> Dict:
        """Aggregate stats for dissertation overhead table."""
        counts: Dict[str, int] = {}
        for e in self.events:
            counts[e.event_type] = counts.get(e.event_type, 0) + 1
        return {
            "total_events": len(self.events),
            "event_counts": counts,
            "total_elapsed_s": round(time.time() - self.start_time, 3),
        }

    def to_dict(self) -> Dict:
        """Full trace as JSON-serialisable dict."""
        return {
            "summary": self.summary(),
            "events": [
                {"type": e.event_type, "ts": round(e.timestamp, 3), **e.data}
                for e in self.events
            ],
        }


# ---------------------------------------------------------------------------
# HierarchicalWorkFlow
# ---------------------------------------------------------------------------

class HierarchicalWorkFlow(WorkFlow):
    """
    WorkFlow extended to execute HierarchicalWorkFlowGraph.

    Key overrides:
    - async_execute(): For hierarchical graphs, skips WorkFlowManager's
      LLM-based output extraction and returns the Environment result directly.
    - execute_task(): Routes team nodes to _execute_team_node() and regular
      nodes to the standard WorkFlow path.

    The trace attribute records every delegation/review/escalation event
    for dissertation overhead analysis.

    SSE integration:
    Pass an `sse_emit` callable to async_execute() to stream hierarchy events
    through the existing Evolvian SSE channel:
        await workflow.async_execute(inputs={...}, sse_emit=emit_fn)
    Where emit_fn(event_type: str, data: dict) -> None.
    Events emitted: hierarchy_decompose, hierarchy_delegate, hierarchy_worker_start,
    hierarchy_worker_complete, hierarchy_escalate, hierarchy_review, hierarchy_revise,
    hierarchy_complete.
    """

    # Not a Pydantic field — initialised in init_module
    _trace: Optional[ExecutionTrace] = None
    _sse_emit = None  # Optional[Callable[[str, dict], None]]

    def init_module(self):
        super().init_module()
        self._trace = ExecutionTrace()

    @property
    def trace(self) -> ExecutionTrace:
        if self._trace is None:
            self._trace = ExecutionTrace()
        return self._trace

    # ------------------------------------------------------------------
    # Override async_execute: skip LLM-based output extraction for
    # hierarchical graphs — the final team output is already in the
    # Environment, no second LLM call needed.
    # ------------------------------------------------------------------

    def _emit(self, event_type: str, data: dict):
        """Fire an SSE event if a callback was registered, otherwise no-op."""
        if self._sse_emit is not None:
            try:
                self._sse_emit(event_type, data)
            except Exception:
                pass  # Never let SSE errors break execution

    async def async_execute(self, inputs: dict = {}, **kwargs) -> str:
        """
        Execute the workflow asynchronously.

        For HierarchicalWorkFlowGraph: runs the standard node scheduling
        loop, then extracts the final output directly from the Environment
        (avoids the WorkFlowManager's LLM-based extract_output call).

        For plain WorkFlowGraph: delegates to the standard WorkFlow.

        Optional kwarg:
            sse_emit: Callable[[str, dict], None] — called for each hierarchy
                      event so the caller can stream it over SSE.
        """
        self._sse_emit = kwargs.pop("sse_emit", None)

        if not isinstance(self.graph, HierarchicalWorkFlowGraph):
            return await super().async_execute(inputs, **kwargs)

        goal = self.graph.goal
        inputs = self._prepare_inputs(inputs)
        self._validate_workflow_structure(inputs=inputs, **kwargs)

        inp_message = Message(
            content=inputs, msg_type=MessageType.INPUT, wf_goal=goal
        )
        self.environment.update(message=inp_message, state=TrajectoryState.COMPLETED)

        failed = False
        error_msg = None
        while not self.graph.is_complete and not failed:
            try:
                task: WorkFlowNode = await self.get_next_task()
                if task is None:
                    break
                logger.info(f"Executing node: {task.name}")
                await self.execute_task(task=task)
            except Exception as e:
                failed = True
                error_msg = str(e)
                logger.error(f"Workflow execution failed at node: {e}")

        if failed:
            return f"Workflow Execution Failed: {error_msg}"

        # Extract output directly from Environment — no LLM call needed
        return self._extract_hierarchical_output()

    def _extract_hierarchical_output(self) -> str:
        """
        Return the final output from the Environment.

        Looks for the last team node's declared output key first,
        then falls back to all execution data concatenated.
        """
        env_data = self.environment.get_all_execution_data()
        if not env_data:
            return ""

        # Find the last team's output key from the graph's end node
        if isinstance(self.graph, HierarchicalWorkFlowGraph):
            end_node_names = self.graph.find_end_nodes()
            for node_name in end_node_names:
                node = self.graph.get_node(node_name)
                if node.outputs:
                    key = node.outputs[0].name
                    if key in env_data:
                        return str(env_data[key])

        # Fallback: return the most recently added value
        return str(list(env_data.values())[-1])

    # ------------------------------------------------------------------
    # Override execute_task to route team nodes through hierarchy loop
    # ------------------------------------------------------------------

    async def execute_task(self, task: WorkFlowNode):
        """
        Execute a workflow node.

        Team nodes → _execute_team_node() (full hierarchy loop).
        Regular nodes → standard WorkFlow.execute_task().
        """
        if isinstance(self.graph, HierarchicalWorkFlowGraph) and \
                self.graph.is_team_node(task.name):
            team = self.graph.get_team_for_node(task.name)
            await self._execute_team_node(task=task, team=team)
        else:
            await super().execute_task(task=task)

    # ------------------------------------------------------------------
    # Team node execution: decompose → delegate → execute → review
    # ------------------------------------------------------------------

    async def _execute_team_node(self, task: WorkFlowNode, team: Team):
        """
        Run the full supervisor delegation loop for a team node.

        Stores the final output in the Environment so downstream nodes
        can read it, exactly like a regular agent would.

        Cross-team handoff: handled automatically by the Environment —
        upstream team outputs are already in env_data and are read by
        _resolve_task_input() for the next team node.
        """
        task_input = self._resolve_task_input(task)
        logger.info(f"[Hierarchy] Team '{team.team_id}': {task_input[:100]}...")

        supervisor_llm = self._get_agent_llm(team.supervisor)

        # Step 1 — Decompose
        self._emit("hierarchy_decompose", {
            "team_id": team.team_id,
            "supervisor": team.supervisor.name,
            "message": f"{team.supervisor.name} is decomposing the task...",
        })
        decomposer = SupervisorDecomposer(supervisor_llm=supervisor_llm)
        subtasks = await decomposer.decompose(task=task_input, workers=team.workers)
        self.trace.log_decomposition(team.team_id, task_input, subtasks)
        self._emit("hierarchy_decompose", {
            "team_id": team.team_id,
            "supervisor": team.supervisor.name,
            "subtask_count": len(subtasks),
            "subtasks": [{"id": s.subtask_id, "description": s.description[:120]} for s in subtasks],
            "message": f"{team.supervisor.name} decomposed into {len(subtasks)} subtasks",
        })

        # Step 2 — Assign
        engine = DelegationEngine(
            policy=team.delegation_policy,
            workers=team.workers,
        )
        for subtask in subtasks:
            worker = engine.assign(subtask)
            self.trace.log_delegation(
                team_id=team.team_id,
                subtask_id=subtask.subtask_id,
                worker_name=worker.name,
                strategy=team.delegation_policy.strategy.value,
            )
            self._emit("hierarchy_delegate", {
                "team_id": team.team_id,
                "subtask_id": subtask.subtask_id,
                "worker": worker.name,
                "subtask_description": subtask.description[:120],
                "message": f"→ {worker.name}: {subtask.description[:80]}...",
            })

        # Step 3 — Execute workers (with escalation checks)
        results: List[SubtaskResult] = []
        for subtask in subtasks:
            worker_name = subtask.assigned_worker
            worker = team.get_worker(worker_name) or team.supervisor

            self._emit("hierarchy_worker_start", {
                "team_id": team.team_id,
                "worker": worker.name,
                "subtask_id": subtask.subtask_id,
                "message": f"{worker.name} is working on: {subtask.description[:80]}...",
            })

            result = await self._execute_worker_subtask(
                team_id=team.team_id,
                worker=worker,
                subtask=subtask,
            )

            self._emit("hierarchy_worker_complete", {
                "team_id": team.team_id,
                "worker": worker.name,
                "subtask_id": subtask.subtask_id,
                "output_preview": result.output[:200],
                "message": f"{worker.name} completed subtask",
            })

            # Step 3.5 — Escalation check
            if team.escalation_rules:
                pre_escalation_worker = result.worker_name
                result = await self._check_escalation(
                    team=team,
                    subtask=subtask,
                    result=result,
                    engine=engine,
                    supervisor_llm=supervisor_llm,
                )
                if result.worker_name != pre_escalation_worker:
                    self._emit("hierarchy_escalate", {
                        "team_id": team.team_id,
                        "subtask_id": subtask.subtask_id,
                        "from_worker": pre_escalation_worker,
                        "to_worker": result.worker_name,
                        "message": f"⚠ Escalated: {pre_escalation_worker} → {result.worker_name}",
                    })

            results.append(result)

        # Step 4 — Review loop
        self._emit("hierarchy_review", {
            "team_id": team.team_id,
            "supervisor": team.supervisor.name,
            "message": f"{team.supervisor.name} is reviewing all outputs...",
        })
        reviewer = SupervisorReviewer(supervisor_llm=supervisor_llm)
        final_output = await self._review_loop(
            team=team,
            task_input=task_input,
            results=results,
            reviewer=reviewer,
            engine=engine,
            original_subtasks=subtasks,
        )

        # Step 5 — Store output in Environment and mark node complete
        self._store_team_output(task=task, output=final_output)
        self.graph.completed(node=task)

        self.trace.log_handoff(
            from_team=team.team_id,
            to_node=task.name,
            output_len=len(final_output),
        )
        self._emit("hierarchy_complete", {
            "team_id": team.team_id,
            "output_length": len(final_output),
            "message": f"✓ {team.name} complete — {len(final_output)} chars produced",
        })
        logger.info(f"[Hierarchy] Team '{team.team_id}' done. Output: {len(final_output)} chars")

    # ------------------------------------------------------------------
    # Worker subtask execution
    # ------------------------------------------------------------------

    async def _llm_call(self, llm, prompt: str) -> str:
        """
        Run generate() in a thread executor.
        The @retry decorator on single_generate handles transient 402/rate-limit
        errors from OpenRouter by backing off and retrying.
        Mock LLMs in tests implement generate() returning a plain string.
        A small pre-call sleep prevents cascading rate-limit errors when multiple
        workers fire in quick succession.
        """
        import functools
        await asyncio.sleep(1.0)  # 1s gap between LLM calls to avoid rate limiting
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, functools.partial(llm.generate, prompt)
        )
        return result if isinstance(result, str) else str(result)

    async def _execute_worker_subtask(
        self,
        team_id: str,
        worker,
        subtask: Subtask,
    ) -> SubtaskResult:
        """Execute a single subtask using a worker agent's LLM."""
        t0 = time.time()
        worker_llm = self._get_agent_llm(worker)

        original_task = getattr(subtask, "original_task", None)
        task_context = (
            f"ORIGINAL QUESTION:\n{original_task}\n\n" if original_task else ""
        )
        prompt = (
            f"You are {worker.name}: {worker.description}\n\n"
            f"{task_context}"
            f"YOUR SUBTASK:\n{subtask.description}\n\n"
            "Provide a clear, concise answer:"
        )

        try:
            output = await self._llm_call(worker_llm, prompt)
        except Exception as e:
            logger.warning(f"[Hierarchy] Worker '{worker.name}' failed: {e}")
            output = f"[Worker {worker.name} failed: {e}]"

        elapsed_ms = int((time.time() - t0) * 1000)
        self.trace.log_worker_execution(
            team_id=team_id,
            subtask_id=subtask.subtask_id,
            worker_name=worker.name,
            elapsed_ms=elapsed_ms,
            output_len=len(output),
        )
        subtask.result = output
        subtask.status = "completed"

        return SubtaskResult(
            subtask_id=subtask.subtask_id,
            worker_name=worker.name,
            output=output,
        )

    # ------------------------------------------------------------------
    # Escalation handling (3.1.3)
    # ------------------------------------------------------------------

    async def _check_escalation(
        self,
        team: Team,
        subtask: Subtask,
        result: SubtaskResult,
        engine: DelegationEngine,
        supervisor_llm,
    ) -> SubtaskResult:
        """
        Check all escalation rules against a worker's result.

        Uses the supervisor LLM to evaluate each condition.
        Returns the (possibly revised) SubtaskResult.
        """
        for rule in team.escalation_rules:
            triggered = await self._evaluate_escalation_condition(
                condition=rule.condition,
                output=result.output,
                supervisor_llm=supervisor_llm,
            )
            if not triggered:
                continue

            self.trace.log_escalation(
                team_id=team.team_id,
                subtask_id=subtask.subtask_id,
                worker_name=result.worker_name,
                condition=rule.condition,
                action=rule.action.value,
            )
            logger.info(
                f"[Hierarchy] Escalation triggered for subtask '{subtask.subtask_id}': "
                f"condition='{rule.condition}', action='{rule.action.value}'"
            )

            if rule.action == EscalationAction.FAIL_TASK:
                raise EscalationError(
                    f"Escalation rule '{rule.condition}' triggered FAIL_TASK "
                    f"for subtask '{subtask.subtask_id}'"
                )

            elif rule.action == EscalationAction.ESCALATE_TO_SUPERVISOR:
                return await self._supervisor_takes_over(
                    team=team,
                    subtask=subtask,
                    worker_result=result.output,
                    supervisor_llm=supervisor_llm,
                )

            elif rule.action == EscalationAction.RETRY_WITH_DIFFERENT_WORKER:
                return await self._retry_with_different_worker(
                    team=team,
                    subtask=subtask,
                    current_worker=result.worker_name,
                    engine=engine,
                    max_retries=rule.max_retries,
                )

            elif rule.action == EscalationAction.REQUEST_HUMAN_INPUT:
                # Not interactive — log and treat as supervisor takeover
                logger.warning(
                    "[Hierarchy] REQUEST_HUMAN_INPUT escalation not supported "
                    "in automated mode — supervisor will handle instead."
                )
                return await self._supervisor_takes_over(
                    team=team, subtask=subtask,
                    worker_result=result.output,
                    supervisor_llm=supervisor_llm,
                )

        return result  # No escalation triggered

    async def _evaluate_escalation_condition(
        self, condition: str, output: str, supervisor_llm
    ) -> bool:
        """
        Ask the supervisor LLM whether the escalation condition is triggered.

        Also applies simple heuristics (empty output) without an LLM call.
        For verifier outputs, parses confidence scores and checks for specific
        error identification before escalating.
        """
        import re

        # Fast heuristic: empty or very short output always escalates
        if not output or output.strip() == "" or output.startswith("[Worker"):
            return True

        # Confidence-based heuristic for verifier outputs
        # Look for "CONFIDENCE: XX/100" pattern
        confidence_match = re.search(r'CONFIDENCE:\s*(\d+)\s*/\s*100', output, re.IGNORECASE)
        if confidence_match:
            confidence = int(confidence_match.group(1))
            # Only escalate if confidence < 30 AND a specific error step is cited
            if confidence >= 30:
                return False  # Confident enough — no escalation
            # Check for specific error identification (e.g. "Step X is wrong")
            has_specific_error = bool(re.search(
                r'(?:step\s+\d|line\s+\d|error\s+(?:in|at)|wrong\s+(?:in|at|because))',
                output,
                re.IGNORECASE,
            ))
            if not has_specific_error:
                # Verifier says INCORRECT but can't point to specific error — treat as CORRECT
                logger.info(
                    "[Hierarchy] Verifier override: low confidence but no specific error cited — "
                    "treating as CORRECT"
                )
                return False
            return True  # Low confidence + specific error = escalate

        # Check for binary INCORRECT without confidence — apply specific-error check
        if re.search(r'\bINCORRECT\b', output, re.IGNORECASE):
            has_specific_error = bool(re.search(
                r'(?:step\s+\d|line\s+\d|error\s+(?:in|at)|wrong\s+(?:in|at|because))',
                output,
                re.IGNORECASE,
            ))
            if not has_specific_error:
                logger.info(
                    "[Hierarchy] Verifier override: INCORRECT without specific error — "
                    "treating as CORRECT"
                )
                return False

        # LLM evaluation for other conditions
        prompt = (
            f"You are evaluating whether a worker's output should trigger escalation.\n\n"
            f"ESCALATION CONDITION: {condition}\n\n"
            f"WORKER OUTPUT:\n{output[:500]}\n\n"
            "Does the worker's output trigger the escalation condition?\n"
            "Answer with only 'yes' or 'no':"
        )
        try:
            response = await self._llm_call(supervisor_llm, prompt)
            return response.lower().strip().startswith("yes")
        except Exception:
            return False  # On LLM failure, do not escalate

    async def _supervisor_takes_over(
        self,
        team: Team,
        subtask: Subtask,
        worker_result: str,
        supervisor_llm,
    ) -> SubtaskResult:
        """Supervisor directly handles the subtask (escalation action)."""
        prompt = (
            f"You are {team.supervisor.name}: {team.supervisor.description}\n\n"
            f"A worker produced an unsatisfactory result for this subtask:\n"
            f"SUBTASK: {subtask.description}\n\n"
            f"WORKER OUTPUT (unsatisfactory):\n{worker_result}\n\n"
            "Please provide a better answer to this subtask:"
        )
        try:
            output = await self._llm_call(supervisor_llm, prompt)
        except Exception as e:
            output = worker_result  # Fallback: keep original

        return SubtaskResult(
            subtask_id=subtask.subtask_id,
            worker_name=team.supervisor.name,
            output=output,
            confidence=0.8,
        )

    async def _retry_with_different_worker(
        self,
        team: Team,
        subtask: Subtask,
        current_worker: str,
        engine: DelegationEngine,
        max_retries: int,
    ) -> SubtaskResult:
        """Re-assign subtask to a different worker and retry."""
        for attempt in range(max(1, max_retries)):
            # Assign to a worker other than the current one
            workers_except_current = [w for w in team.workers if w.name != current_worker]
            if not workers_except_current:
                break  # No alternative workers

            # Use round-robin among alternatives
            retry_worker = workers_except_current[attempt % len(workers_except_current)]
            result = await self._execute_worker_subtask(
                team_id=team.team_id,
                worker=retry_worker,
                subtask=subtask,
            )
            if result.output and not result.output.startswith("[Worker"):
                return result  # Successful retry

        # All retries failed — return last result
        return SubtaskResult(
            subtask_id=subtask.subtask_id,
            worker_name=current_worker,
            output=f"[All retries exhausted for subtask {subtask.subtask_id}]",
        )

    # ------------------------------------------------------------------
    # Review loop
    # ------------------------------------------------------------------

    async def _review_loop(
        self,
        team: Team,
        task_input: str,
        results: List[SubtaskResult],
        reviewer: SupervisorReviewer,
        engine: DelegationEngine,
        original_subtasks: Optional[List[Subtask]] = None,
    ) -> str:
        """Run the supervisor review + optional revision loop."""
        # Build lookup for original skills so revisions get proper routing
        skills_map: Dict[str, List[str]] = {}
        if original_subtasks:
            skills_map = {s.subtask_id: s.required_skills for s in original_subtasks}

        revision_round = 0
        while True:
            decision = await reviewer.review(
                task=task_input,
                results=results,
                review_mode=team.review_mode,
            )
            self.trace.log_review(
                team_id=team.team_id,
                approved=decision.approved,
                revisions_needed=decision.revisions_needed,
            )

            if decision.approved or revision_round >= MAX_REVISION_ROUNDS:
                self._emit("hierarchy_review", {
                    "team_id": team.team_id,
                    "approved": True,
                    "revision_round": revision_round,
                    "message": f"✓ {team.supervisor.name} approved output (round {revision_round})",
                })
                return decision.final_output or self._concat_results(results)

            revision_round += 1
            self._emit("hierarchy_revise", {
                "team_id": team.team_id,
                "revision_round": revision_round,
                "revisions_needed": list(decision.revisions_needed),
                "message": f"↺ Revision {revision_round}: {len(decision.revisions_needed)} subtask(s) need rework",
            })

            # Re-execute flagged subtasks with feedback
            revised_results = []
            for result in results:
                if result.subtask_id not in decision.revisions_needed:
                    revised_results.append(result)
                    continue

                feedback = decision.feedback.get(result.subtask_id, "")
                revised_subtask = Subtask(
                    subtask_id=result.subtask_id,
                    description=(
                        f"Revision {revision_round} of subtask '{result.subtask_id}'.\n"
                        f"Feedback: {feedback}\n\n"
                        "Please provide an improved answer."
                    ),
                    required_skills=skills_map.get(result.subtask_id, []),
                    original_task=task_input,
                )

                worker = engine.assign(revised_subtask)
                self.trace.log_revision(
                    team_id=team.team_id,
                    subtask_id=result.subtask_id,
                    worker_name=worker.name,
                    round_=revision_round,
                )
                revised_result = await self._execute_worker_subtask(
                    team_id=team.team_id,
                    worker=worker,
                    subtask=revised_subtask,
                )
                revised_results.append(revised_result)

            results = revised_results

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _resolve_task_input(self, task: WorkFlowNode) -> str:
        """
        Pull the task's input from the Environment.

        Cross-team handoff: upstream team outputs are in env_data because
        _store_team_output() stored them as the previous node ran.
        This naturally flows into the next team's input without any
        special handoff code needed.
        """
        env_data = self.environment.get_all_execution_data()

        if task.inputs:
            parts = []
            for inp in task.inputs:
                val = env_data.get(inp.name)
                if val is not None:
                    parts.append(f"{inp.name}: {val}")
            if parts:
                return "\n".join(parts)

        # Fallback: node description + all available env data
        if env_data:
            context = "\n".join(f"{k}: {v}" for k, v in env_data.items())
            return f"{task.description}\n\nContext:\n{context}"
        return task.description

    def _get_agent_llm(self, agent):
        """
        Return the LLM for an agent.
        Priority: agent.llm → workflow-level self.llm → raise.
        """
        if hasattr(agent, "llm") and agent.llm is not None:
            return agent.llm
        if self.llm is not None:
            return self.llm
        raise ValueError(
            f"No LLM for agent '{agent.name}'. "
            "Provide llm_config when creating the agent or pass llm= to HierarchicalWorkFlow."
        )

    def _store_team_output(self, task: WorkFlowNode, output: str):
        """
        Inject the team's final output into the Environment.

        Uses the first declared output parameter name as the key so
        downstream nodes can look it up by name.
        """
        output_key = task.outputs[0].name if task.outputs else f"{task.name}_output"
        message = Message(
            content={output_key: output},
            msg_type=MessageType.RESPONSE,
            wf_goal=self.graph.goal,
            wf_task=task.name,
            wf_task_desc=task.description,
        )
        self.environment.update(message=message, state=TrajectoryState.COMPLETED)

    @staticmethod
    def _concat_results(results: List[SubtaskResult]) -> str:
        """Fallback aggregation: join worker outputs."""
        return "\n\n".join(
            f"[{r.subtask_id}] {r.output}" for r in results
        )
