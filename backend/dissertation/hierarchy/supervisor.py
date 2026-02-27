"""
Supervisor logic for hierarchical execution.

Classes:
  - Subtask              — a decomposed piece of work with required skills
  - SubtaskResult        — a worker's output for a subtask
  - ReviewDecision       — supervisor's verdict after reviewing worker outputs
  - SupervisorDecomposer — LLM-driven task decomposition
  - DelegationEngine     — routes subtasks to workers per DelegationPolicy
  - SupervisorReviewer   — LLM-driven output review and aggregation
"""
import re
import json
import asyncio
from dataclasses import dataclass, field
from typing import List, Optional, Dict

from dissertation.hierarchy.team import (
    DelegationPolicy, DelegationStrategy, EscalationRule, ReviewMode,
    HierarchicalAgent,
)

# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class Subtask:
    subtask_id: str
    description: str
    required_skills: List[str] = field(default_factory=list)
    priority: int = 0
    dependencies: List[str] = field(default_factory=list)
    assigned_worker: Optional[str] = None
    status: str = "pending"   # pending | running | completed | failed
    result: Optional[str] = None


@dataclass
class SubtaskResult:
    subtask_id: str
    worker_name: str
    output: str
    confidence: float = 1.0   # 0-1, worker self-reported or heuristic


@dataclass
class ReviewDecision:
    approved: bool
    final_output: Optional[str] = None
    feedback: Dict[str, str] = field(default_factory=dict)      # subtask_id → feedback text
    revisions_needed: List[str] = field(default_factory=list)   # subtask_ids to redo


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

DECOMPOSITION_PROMPT = """\
You are a supervisor agent. Your task is to decompose the following assignment into clear subtasks that your worker agents can execute independently.

TASK:
{task}

AVAILABLE WORKERS:
{workers}

Decompose this task into 2-4 subtasks. Each subtask should be:
- Concrete and self-contained
- Assignable to a single worker
- Tagged with the required skills (matching worker specialties)

Respond ONLY with a valid JSON array. Each element must have:
  "id": short unique identifier (e.g. "subtask_1")
  "description": what the worker must do (1-2 sentences)
  "required_skills": list of skill keywords (e.g. ["research", "search"])

Example:
[
  {{"id": "subtask_1", "description": "Search for X using available context.", "required_skills": ["research"]}},
  {{"id": "subtask_2", "description": "Synthesize the findings into a final answer.", "required_skills": ["reasoning"]}}
]

JSON array only, no other text:"""


REVIEW_PROMPT = """\
You are a supervisor agent reviewing the outputs produced by your worker agents.

ORIGINAL TASK:
{task}

WORKER OUTPUTS:
{results}

Review each output. Decide:
1. Are ALL outputs sufficient to answer the original task?
2. If yes, synthesize them into one clear final answer.
3. If any output is missing, wrong, or too vague, identify which subtask needs revision.

Respond ONLY with valid JSON:
{{
  "approved": true or false,
  "final_output": "the complete synthesised answer (if approved, else null)",
  "revisions_needed": ["subtask_id_1", ...],
  "feedback": {{"subtask_id": "what must be improved"}}
}}

JSON only, no other text:"""


AGGREGATE_PROMPT = """\
You are a supervisor agent. Combine the following worker outputs into one complete, coherent answer to the original task.

ORIGINAL TASK:
{task}

WORKER OUTPUTS:
{results}

Write one clear, concise final answer. Do not include meta-commentary — just the answer:"""


# ---------------------------------------------------------------------------
# SupervisorDecomposer
# ---------------------------------------------------------------------------

class SupervisorDecomposer:
    """
    Uses the supervisor's LLM to break a task into subtasks.
    Each subtask is tagged with required_skills for delegation routing.
    """

    def __init__(self, supervisor_llm):
        self._llm = supervisor_llm

    async def decompose(self, task: str, workers: List) -> List[Subtask]:
        """
        Decompose `task` into subtasks given the available workers.

        Falls back to a single pass-through subtask if LLM parsing fails.
        """
        worker_desc = self._format_workers(workers)
        prompt = DECOMPOSITION_PROMPT.format(task=task, workers=worker_desc)

        try:
            response = await self._llm.async_generate(prompt=prompt)
            text = response if isinstance(response, str) else str(response)
            return self._parse_subtasks(text)
        except Exception:
            # Fallback: one subtask, all workers eligible
            return [Subtask(
                subtask_id="subtask_1",
                description=task,
                required_skills=[],
            )]

    def _format_workers(self, workers: List) -> str:
        lines = []
        for w in workers:
            scope = getattr(w, "authority_scope", [])
            scope_str = ", ".join(scope) if scope else "general"
            lines.append(f"- {w.name}: {w.description}  [skills: {scope_str}]")
        return "\n".join(lines) if lines else "- (no workers)"

    def _parse_subtasks(self, text: str) -> List[Subtask]:
        # Strip markdown fences if present
        text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
        # Extract JSON array
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON array found in decomposition response: {text[:200]}")
        data = json.loads(match.group())
        subtasks = []
        for i, item in enumerate(data):
            subtasks.append(Subtask(
                subtask_id=item.get("id", f"subtask_{i+1}"),
                description=item.get("description", ""),
                required_skills=item.get("required_skills", []),
                priority=item.get("priority", 0),
            ))
        if not subtasks:
            raise ValueError("Decomposition returned empty subtask list")
        return subtasks


# ---------------------------------------------------------------------------
# DelegationEngine
# ---------------------------------------------------------------------------

class DelegationEngine:
    """
    Routes subtasks to workers based on DelegationPolicy.

    Strategies:
        capability_match   — score workers by overlap of required_skills with authority_scope
        round_robin        — cycle through workers in order
        load_balance       — assign to the worker with fewest current assignments
        supervisor_decides — not implemented here; falls back to capability_match
    """

    def __init__(self, policy: DelegationPolicy, workers: List):
        self.policy = policy
        self.workers = workers
        self._assignment_counts: Dict[str, int] = {w.name: 0 for w in workers}
        self._rr_index: int = 0

    def assign(self, subtask: Subtask):
        """Return the best worker for this subtask."""
        if not self.workers:
            raise ValueError("No workers available for delegation")

        strategy = self.policy.strategy
        if strategy == DelegationStrategy.ROUND_ROBIN:
            worker = self._round_robin()
        elif strategy == DelegationStrategy.LOAD_BALANCE:
            worker = self._load_balance()
        else:
            # Default: capability_match (also handles supervisor_decides fallback)
            worker = self._capability_match(subtask)

        self._assignment_counts[worker.name] += 1
        subtask.assigned_worker = worker.name
        return worker

    def _capability_match(self, subtask: Subtask):
        """Score each worker by skill overlap, return highest scorer."""
        if not subtask.required_skills:
            return self._round_robin()  # no skills specified → round robin

        best_worker = None
        best_score = -1
        for w in self.workers:
            scope = getattr(w, "authority_scope", [])
            # Count exact matches + partial matches (lowercase)
            exact = sum(1 for s in subtask.required_skills if s in scope)
            partial = sum(
                1 for s in subtask.required_skills
                if any(s.lower() in sc.lower() or sc.lower() in s.lower() for sc in scope)
            )
            score = exact * 2 + partial
            if score > best_score:
                best_score = score
                best_worker = w
        return best_worker or self.workers[0]

    def _round_robin(self):
        worker = self.workers[self._rr_index % len(self.workers)]
        self._rr_index += 1
        return worker

    def _load_balance(self):
        return min(self.workers, key=lambda w: self._assignment_counts.get(w.name, 0))


# ---------------------------------------------------------------------------
# SupervisorReviewer
# ---------------------------------------------------------------------------

class SupervisorReviewer:
    """
    Uses the supervisor's LLM to review worker outputs and either:
    - Approve and synthesise a final answer, or
    - Request targeted revisions on specific subtasks.
    """

    def __init__(self, supervisor_llm):
        self._llm = supervisor_llm

    async def review(
        self,
        task: str,
        results: List[SubtaskResult],
        review_mode: ReviewMode,
    ) -> ReviewDecision:
        """
        Review worker outputs. Returns a ReviewDecision.

        If review_mode is NONE, skip the LLM review and aggregate directly.
        """
        if review_mode == ReviewMode.NONE or not results:
            return ReviewDecision(
                approved=True,
                final_output=await self._aggregate(task, results),
            )

        results_str = self._format_results(results)
        prompt = REVIEW_PROMPT.format(task=task, results=results_str)

        try:
            response = await self._llm.async_generate(prompt=prompt)
            text = response if isinstance(response, str) else str(response)
            return self._parse_review(text)
        except Exception:
            # Fallback: approve and aggregate
            return ReviewDecision(
                approved=True,
                final_output=await self._aggregate(task, results),
            )

    async def _aggregate(self, task: str, results: List[SubtaskResult]) -> str:
        """Aggregate results via a final LLM call."""
        if not results:
            return ""
        if len(results) == 1:
            return results[0].output

        results_str = self._format_results(results)
        prompt = AGGREGATE_PROMPT.format(task=task, results=results_str)
        try:
            response = await self._llm.async_generate(prompt=prompt)
            return response if isinstance(response, str) else str(response)
        except Exception:
            # Fallback: concatenate
            return "\n\n".join(r.output for r in results)

    def _format_results(self, results: List[SubtaskResult]) -> str:
        lines = []
        for r in results:
            lines.append(f"[{r.subtask_id}] ({r.worker_name}):\n{r.output}")
        return "\n\n".join(lines)

    def _parse_review(self, text: str) -> ReviewDecision:
        text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON object in review response: {text[:200]}")
        data = json.loads(match.group())
        return ReviewDecision(
            approved=bool(data.get("approved", True)),
            final_output=data.get("final_output"),
            revisions_needed=data.get("revisions_needed", []),
            feedback=data.get("feedback", {}),
        )
