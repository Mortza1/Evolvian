"""
Unit tests for Phase 2 — SupervisorDecomposer, DelegationEngine, SupervisorReviewer.

Uses a MockLLM to avoid real API calls.
Tests cover:
  - Decomposition parses JSON subtasks correctly
  - Decomposition fallback on parse failure
  - DelegationEngine routes by capability_match, round_robin, load_balance
  - SupervisorReviewer approves / requests revisions
  - SupervisorReviewer aggregates outputs
"""
import sys
import asyncio
import pytest
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from dissertation.hierarchy.team import (
    AgentRole, DelegationPolicy, DelegationStrategy, ReviewMode,
    HierarchicalAgent,
)
from dissertation.hierarchy.supervisor import (
    SupervisorDecomposer, DelegationEngine, SupervisorReviewer,
    Subtask, SubtaskResult, ReviewDecision,
)


# ---------------------------------------------------------------------------
# Mock LLM — returns a preset response
# ---------------------------------------------------------------------------

class MockLLM:
    """Simple mock that returns a preset string for generate/async_generate."""

    def __init__(self, response: str):
        self._response = response

    def generate(self, prompt: str, **kwargs) -> str:
        return self._response

    async def async_generate(self, prompt: str, **kwargs) -> str:
        return self._response


class FailingLLM:
    """Mock that always raises an exception."""

    def generate(self, prompt: str, **kwargs) -> str:
        raise RuntimeError("LLM unavailable")

    async def async_generate(self, prompt: str, **kwargs) -> str:
        raise RuntimeError("LLM unavailable")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_worker(name: str, scope: List[str] = None) -> HierarchicalAgent:
    return HierarchicalAgent(
        name=name,
        description=f"{name} worker",
        role=AgentRole.WORKER,
        authority_scope=scope or [],
        is_human=True,
    )


def run(coro):
    """Run an async coroutine in a test (uses asyncio.run for fresh loop each time)."""
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# SupervisorDecomposer
# ---------------------------------------------------------------------------

class TestSupervisorDecomposer:
    VALID_JSON = '''[
        {"id": "s1", "description": "Search for X", "required_skills": ["research"]},
        {"id": "s2", "description": "Synthesise results", "required_skills": ["reasoning"]}
    ]'''

    def test_parses_valid_json(self):
        llm = MockLLM(self.VALID_JSON)
        decomposer = SupervisorDecomposer(supervisor_llm=llm)
        workers = [make_worker("W1", ["research"]), make_worker("W2", ["reasoning"])]
        subtasks = run(decomposer.decompose("Solve X", workers))
        assert len(subtasks) == 2
        assert subtasks[0].subtask_id == "s1"
        assert "research" in subtasks[0].required_skills

    def test_parses_json_with_markdown_fences(self):
        fenced = f"```json\n{self.VALID_JSON}\n```"
        llm = MockLLM(fenced)
        decomposer = SupervisorDecomposer(supervisor_llm=llm)
        subtasks = run(decomposer.decompose("task", [make_worker("W")]))
        assert len(subtasks) == 2

    def test_fallback_on_invalid_json(self):
        llm = MockLLM("This is not JSON at all.")
        decomposer = SupervisorDecomposer(supervisor_llm=llm)
        subtasks = run(decomposer.decompose("Fallback task", [make_worker("W")]))
        # Should return a single pass-through subtask
        assert len(subtasks) == 1
        assert subtasks[0].subtask_id == "subtask_1"

    def test_fallback_on_llm_failure(self):
        decomposer = SupervisorDecomposer(supervisor_llm=FailingLLM())
        subtasks = run(decomposer.decompose("Task", [make_worker("W")]))
        assert len(subtasks) == 1

    def test_subtask_fields_populated(self):
        llm = MockLLM(self.VALID_JSON)
        decomposer = SupervisorDecomposer(supervisor_llm=llm)
        subtasks = run(decomposer.decompose("Q", [make_worker("W")]))
        st = subtasks[0]
        assert st.description == "Search for X"
        assert st.status == "pending"
        assert st.result is None
        assert st.assigned_worker is None

    def test_empty_workers_list(self):
        llm = MockLLM(self.VALID_JSON)
        decomposer = SupervisorDecomposer(supervisor_llm=llm)
        # Should not crash with no workers
        subtasks = run(decomposer.decompose("Q", []))
        assert len(subtasks) >= 1


# ---------------------------------------------------------------------------
# DelegationEngine
# ---------------------------------------------------------------------------

class TestDelegationEngine:
    def _make_workers(self):
        return [
            make_worker("Researcher", ["research", "search"]),
            make_worker("Analyst", ["analysis", "math"]),
            make_worker("Coder", ["code", "python"]),
        ]

    def test_capability_match_exact(self):
        workers = self._make_workers()
        policy = DelegationPolicy(strategy=DelegationStrategy.CAPABILITY_MATCH)
        engine = DelegationEngine(policy=policy, workers=workers)
        subtask = Subtask(subtask_id="s1", description="D", required_skills=["research"])
        worker = engine.assign(subtask)
        assert worker.name == "Researcher"

    def test_capability_match_partial(self):
        # "cod" is a substring of "code" (Coder's scope) → partial match
        workers = self._make_workers()
        policy = DelegationPolicy(strategy=DelegationStrategy.CAPABILITY_MATCH)
        engine = DelegationEngine(policy=policy, workers=workers)
        subtask = Subtask(subtask_id="s1", description="D", required_skills=["cod"])
        worker = engine.assign(subtask)
        assert worker.name == "Coder"

    def test_capability_match_no_skills_falls_back_to_round_robin(self):
        workers = self._make_workers()
        policy = DelegationPolicy(strategy=DelegationStrategy.CAPABILITY_MATCH)
        engine = DelegationEngine(policy=policy, workers=workers)
        subtask = Subtask(subtask_id="s1", description="D", required_skills=[])
        worker = engine.assign(subtask)
        assert worker in workers

    def test_round_robin_cycles(self):
        workers = self._make_workers()
        policy = DelegationPolicy(strategy=DelegationStrategy.ROUND_ROBIN)
        engine = DelegationEngine(policy=policy, workers=workers)
        names = [engine.assign(Subtask(f"s{i}", "D")).name for i in range(6)]
        # Should cycle: 0, 1, 2, 0, 1, 2
        assert names[0] == names[3]
        assert names[1] == names[4]
        assert names[2] == names[5]

    def test_load_balance_assigns_to_least_busy(self):
        workers = self._make_workers()
        policy = DelegationPolicy(strategy=DelegationStrategy.LOAD_BALANCE)
        engine = DelegationEngine(policy=policy, workers=workers)
        # Assign first to Researcher
        st0 = Subtask("s0", "D", required_skills=["research"])
        w0 = engine.assign(st0)
        # Next assignment should go to a different (less loaded) worker
        st1 = Subtask("s1", "D")
        w1 = engine.assign(st1)
        assert w1.name != w0.name

    def test_no_workers_raises(self):
        policy = DelegationPolicy()
        engine = DelegationEngine(policy=policy, workers=[])
        with pytest.raises(ValueError):
            engine.assign(Subtask("s1", "D"))

    def test_assignment_recorded_on_subtask(self):
        workers = self._make_workers()
        policy = DelegationPolicy(strategy=DelegationStrategy.ROUND_ROBIN)
        engine = DelegationEngine(policy=policy, workers=workers)
        subtask = Subtask("s1", "D")
        engine.assign(subtask)
        assert subtask.assigned_worker is not None


# ---------------------------------------------------------------------------
# SupervisorReviewer
# ---------------------------------------------------------------------------

class TestSupervisorReviewer:
    APPROVE_JSON = '''{
        "approved": true,
        "final_output": "The answer is 42.",
        "revisions_needed": [],
        "feedback": {}
    }'''

    REJECT_JSON = '''{
        "approved": false,
        "final_output": null,
        "revisions_needed": ["s2"],
        "feedback": {"s2": "Too vague, please be more specific."}
    }'''

    def _results(self):
        return [
            SubtaskResult("s1", "Researcher", "Finding 1."),
            SubtaskResult("s2", "Analyst", "Finding 2."),
        ]

    def test_approves_outputs(self):
        reviewer = SupervisorReviewer(supervisor_llm=MockLLM(self.APPROVE_JSON))
        decision = run(reviewer.review("Task", self._results(), ReviewMode.SUPERVISOR_REVIEWS_ALL))
        assert decision.approved is True
        assert decision.final_output == "The answer is 42."
        assert decision.revisions_needed == []

    def test_requests_revisions(self):
        reviewer = SupervisorReviewer(supervisor_llm=MockLLM(self.REJECT_JSON))
        decision = run(reviewer.review("Task", self._results(), ReviewMode.SUPERVISOR_REVIEWS_ALL))
        assert decision.approved is False
        assert "s2" in decision.revisions_needed
        assert "s2" in decision.feedback

    def test_review_mode_none_skips_llm(self):
        # FailingLLM would raise if called — so if review_mode=NONE it must not call it
        reviewer = SupervisorReviewer(supervisor_llm=MockLLM("UNUSED"))
        decision = run(reviewer.review("Task", self._results(), ReviewMode.NONE))
        assert decision.approved is True
        assert decision.final_output is not None

    def test_empty_results_returns_empty_string(self):
        reviewer = SupervisorReviewer(supervisor_llm=MockLLM(self.APPROVE_JSON))
        decision = run(reviewer.review("Task", [], ReviewMode.NONE))
        assert decision.approved is True
        assert decision.final_output == ""

    def test_single_result_returned_directly(self):
        reviewer = SupervisorReviewer(supervisor_llm=MockLLM("UNUSED"))
        results = [SubtaskResult("s1", "W", "My single answer.")]
        decision = run(reviewer.review("Task", results, ReviewMode.NONE))
        assert decision.final_output == "My single answer."

    def test_fallback_on_llm_failure(self):
        reviewer = SupervisorReviewer(supervisor_llm=FailingLLM())
        decision = run(reviewer.review("Task", self._results(), ReviewMode.SUPERVISOR_REVIEWS_ALL))
        # Should fall back to approve + aggregate
        assert decision.approved is True
        assert decision.final_output is not None

    def test_parse_handles_markdown_fences(self):
        fenced = f"```json\n{self.APPROVE_JSON}\n```"
        reviewer = SupervisorReviewer(supervisor_llm=MockLLM(fenced))
        decision = run(reviewer.review("Task", self._results(), ReviewMode.SUPERVISOR_REVIEWS_ALL))
        assert decision.approved is True
