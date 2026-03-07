"""
Integration tests for Phase 3 — HierarchicalWorkFlow end-to-end execution.

Tests run the full workflow.execute() path with a MockLLM to avoid API calls.
Single-candidate task scheduling never calls LLM (EvoAgentX edge-case shortcut).
The MockLLM only needs to handle the hierarchy-specific calls:
  decompose, worker execute, review, escalation check.

Test coverage:
  3.2.1 — 1-team workflow executes the full loop (decompose → delegate → execute → review)
  3.2.2 — 2-team pipeline with cross-team handoff
  3.2.3 — Escalation path (supervisor takes over bad worker output)
  3.2.4 — Revision loop (supervisor rejects first output, accepts second)
  3.2.5 — Trace records all events for overhead analysis
"""
import sys
import asyncio
import pytest
from pathlib import Path
from typing import List, Optional

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.agents import AgentManager
from evoagentx.workflow.workflow_manager import WorkFlowManager
from evoagentx.models.base_model import BaseLLM
from evoagentx.models.model_configs import LLMConfig

from dissertation.hierarchy.team import (
    AgentRole, DelegationPolicy, DelegationStrategy,
    EscalationRule, EscalationAction, ReviewMode,
    Team, HierarchicalAgent,
)
from dissertation.hierarchy.hierarchical_graph import HierarchicalWorkFlowGraph
from dissertation.hierarchy.execution import HierarchicalWorkFlow, EscalationError


# ---------------------------------------------------------------------------
# MockBaseLLM — a BaseLLM subclass that satisfies pydantic isinstance check.
# Used only as the WorkFlowManager's llm (never actually called for scheduling
# in single-candidate graphs; hierarchy calls go through agent.llm instead).
# ---------------------------------------------------------------------------

class _StubLLMConfig(LLMConfig):
    llm_type: str = "stub"
    model: str = "stub"


class MockBaseLLM(BaseLLM):
    """
    Minimal BaseLLM subclass.
    Satisfies WorkFlowManager's pydantic `llm: BaseLLM` field validation.
    All hierarchy LLM calls go through agent.llm (set per-agent), so the
    WorkFlowManager LLM is never actually called in our tests.
    """

    def __init__(self):
        super().__init__(config=_StubLLMConfig())

    def init_model(self):
        pass

    def formulate_messages(self, prompts, system_messages=None):
        return [[{"role": "user", "content": p}] for p in (prompts or [])]

    def single_generate(self, messages, **kwargs) -> str:
        return ""

    def batch_generate(self, batch_messages, **kwargs):
        return ["" for _ in batch_messages]

    async def async_generate(self, prompt="", **kwargs):
        return ""


# Singleton stub — all workflows share it; it's never called
_STUB_LLM = MockBaseLLM()


# ---------------------------------------------------------------------------
# MockLLM — returns different responses based on call count or keywords
# ---------------------------------------------------------------------------

class SequenceLLM:
    """
    Returns responses in sequence.
    When the sequence is exhausted, repeats the last response.
    """

    def __init__(self, responses: List[str]):
        self._responses = responses
        self._index = 0

    def generate(self, prompt: str = "", **kwargs) -> str:
        r = self._responses[min(self._index, len(self._responses) - 1)]
        self._index += 1
        return r

    async def async_generate(self, prompt: str = "", **kwargs) -> str:
        return self.generate(prompt, **kwargs)

    @property
    def call_count(self) -> int:
        return self._index


class KeywordLLM:
    """Returns different responses based on keywords in the prompt."""

    def __init__(self, rules: dict, default: str = "Default answer."):
        """
        rules: {keyword: response} — first matching keyword wins.
        """
        self._rules = rules
        self._default = default
        self.calls: List[str] = []

    def generate(self, prompt: str = "", **kwargs) -> str:
        self.calls.append(prompt[:100])
        p = prompt.lower()
        for keyword, response in self._rules.items():
            if keyword.lower() in p:
                return response
        return self._default

    async def async_generate(self, prompt: str = "", **kwargs) -> str:
        return self.generate(prompt, **kwargs)


# ---------------------------------------------------------------------------
# Test fixtures
# ---------------------------------------------------------------------------

DECOMPOSE_JSON = '''[
    {"id": "s1", "description": "Find relevant information.", "required_skills": ["research"]},
    {"id": "s2", "description": "Synthesise findings.", "required_skills": ["reasoning"]}
]'''

APPROVE_JSON = '''{
    "approved": true,
    "final_output": "The final answer is Paris.",
    "revisions_needed": [],
    "feedback": {}
}'''

REJECT_THEN_APPROVE_RESPONSES = [
    DECOMPOSE_JSON,         # decomposition
    "Finding: Paris is the capital.",   # worker s1
    "Synthesis: Therefore Paris.",      # worker s2
    # Review rejects first
    '{"approved": false, "final_output": null, "revisions_needed": ["s2"], "feedback": {"s2": "Too brief"}}',
    "Improved synthesis: Paris is the capital of France.",  # revised s2
    APPROVE_JSON,           # second review approves
]


def make_worker(name: str, scope: List[str] = None) -> HierarchicalAgent:
    return HierarchicalAgent(
        name=name,
        description=f"{name} agent",
        role=AgentRole.WORKER,
        authority_scope=scope or [],
        is_human=True,
    )


def make_supervisor(name: str = "Supervisor") -> HierarchicalAgent:
    return HierarchicalAgent(
        name=name,
        description=f"{name} supervisor",
        role=AgentRole.SUPERVISOR,
        is_human=True,
    )


def make_team(
    team_id: str = "t1",
    llm=None,
    review_mode: ReviewMode = ReviewMode.SUPERVISOR_REVIEWS_ALL,
    escalation_rules: list = None,
    delegation_strategy: DelegationStrategy = DelegationStrategy.ROUND_ROBIN,
) -> Team:
    supervisor = make_supervisor(f"Sup_{team_id}")
    if llm is not None:
        supervisor.llm = llm
    workers = [
        make_worker(f"W_{team_id}_A", ["research"]),
        make_worker(f"W_{team_id}_B", ["reasoning"]),
    ]
    if llm is not None:
        for w in workers:
            w.llm = llm
    return Team(
        team_id=team_id,
        name=f"Team {team_id}",
        supervisor=supervisor,
        workers=workers,
        delegation_policy=DelegationPolicy(strategy=delegation_strategy),
        review_mode=review_mode,
        escalation_rules=escalation_rules or [],
    )


INPUTS = [{"name": "question", "type": "str", "description": "Input question"}]
OUTPUTS = [{"name": "answer", "type": "str", "description": "Final answer"}]


def make_workflow(graph: HierarchicalWorkFlowGraph, llm) -> HierarchicalWorkFlow:
    """
    Build a HierarchicalWorkFlow with:
    - agent.llm = llm (SequenceLLM) for all hierarchy-specific calls
    - workflow_manager uses _STUB_LLM (MockBaseLLM) — never actually called
      because single-candidate scheduling uses the edge-case shortcut and
      our async_execute override bypasses extract_output
    """
    all_agents = []
    for team in graph.teams:
        all_agents.extend(team.all_agents())
    agent_manager = AgentManager(agents=all_agents)
    wfm = WorkFlowManager(llm=_STUB_LLM)

    return HierarchicalWorkFlow(
        graph=graph,
        llm=_STUB_LLM,      # workflow-level LLM (never called for team nodes)
        agent_manager=agent_manager,
        workflow_manager=wfm,
    )


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# 3.2.1 — Single team: full decompose → delegate → execute → review loop
# ---------------------------------------------------------------------------

class TestSingleTeamExecution:
    def _make_llm(self):
        return KeywordLLM(
            rules={
                "decompose": DECOMPOSE_JSON,
                "your task:\nfind": "Paris is the capital of France.",
                "your task:\nsynth": "Therefore the answer is Paris.",
                "approved": APPROVE_JSON,
                "review": APPROVE_JSON,
            },
            default=APPROVE_JSON,
        )

    def test_execute_returns_string(self):
        llm = SequenceLLM([
            DECOMPOSE_JSON,
            "Worker A answer.",
            "Worker B answer.",
            APPROVE_JSON,
        ])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="Answer question", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        output = workflow.execute(inputs={"question": "What is the capital of France?"})
        assert isinstance(output, str)
        assert len(output) > 0

    def test_execute_returns_approved_answer(self):
        llm = SequenceLLM([
            DECOMPOSE_JSON,
            "Paris finding.",
            "Paris synthesis.",
            APPROVE_JSON,
        ])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="Answer question", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        output = workflow.execute(inputs={"question": "Capital of France?"})
        assert "Paris" in output

    def test_trace_records_decomposition(self):
        llm = SequenceLLM([DECOMPOSE_JSON, "A.", "B.", APPROVE_JSON])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        workflow.execute(inputs={"question": "Q?"})
        event_types = [e.event_type for e in workflow.trace.events]
        assert "decompose" in event_types

    def test_trace_records_delegation(self):
        llm = SequenceLLM([DECOMPOSE_JSON, "A.", "B.", APPROVE_JSON])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        workflow.execute(inputs={"question": "Q?"})
        event_types = [e.event_type for e in workflow.trace.events]
        assert "delegate" in event_types

    def test_trace_records_worker_execution(self):
        llm = SequenceLLM([DECOMPOSE_JSON, "A.", "B.", APPROVE_JSON])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        workflow.execute(inputs={"question": "Q?"})
        event_types = [e.event_type for e in workflow.trace.events]
        assert "execute" in event_types

    def test_trace_records_review(self):
        llm = SequenceLLM([DECOMPOSE_JSON, "A.", "B.", APPROVE_JSON])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        workflow.execute(inputs={"question": "Q?"})
        event_types = [e.event_type for e in workflow.trace.events]
        assert "review" in event_types

    def test_review_mode_none_skips_llm_review(self):
        # With ReviewMode.NONE, supervisor review is skipped → 3 LLM calls: decompose + 2 workers
        llm = SequenceLLM([DECOMPOSE_JSON, "A.", "B."])
        team = make_team("t1", llm=llm, review_mode=ReviewMode.NONE)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        output = workflow.execute(inputs={"question": "Q?"})
        assert output  # Should succeed with no review LLM call


# ---------------------------------------------------------------------------
# 3.2.2 — Two-team pipeline: cross-team handoff
# ---------------------------------------------------------------------------

class TestTwoTeamPipeline:
    def test_two_team_pipeline_executes(self):
        # Team 1 does research, Team 2 does analysis
        llm1 = SequenceLLM([
            DECOMPOSE_JSON,
            "Research finding: data shows X.",
            "More context: Y.",
            APPROVE_JSON,
        ])
        llm2 = SequenceLLM([
            DECOMPOSE_JSON,
            "Analysis of X shows conclusion Z.",
            "Secondary analysis confirms Z.",
            APPROVE_JSON,
        ])

        team1 = make_team("research", llm=llm1)
        team2 = make_team("analysis", llm=llm2)

        two_team_inputs = [{"name": "task", "type": "str", "description": "Input task"}]
        two_team_outputs = [{"name": "analysis", "type": "str", "description": "Final analysis"}]

        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="Research and analyse",
            teams=[team1, team2],
            inputs=two_team_inputs,
            outputs=two_team_outputs,
        )
        all_agents = team1.all_agents() + team2.all_agents()
        agent_manager = AgentManager(agents=all_agents)
        wfm = WorkFlowManager(llm=_STUB_LLM)
        workflow = HierarchicalWorkFlow(
            graph=graph, llm=_STUB_LLM, agent_manager=agent_manager, workflow_manager=wfm,
        )
        output = workflow.execute(inputs={"task": "Analyse market trends."})
        assert isinstance(output, str)
        assert len(output) > 0

    def test_two_team_trace_has_handoff(self):
        llm = SequenceLLM([
            DECOMPOSE_JSON, "R1.", "R2.", APPROVE_JSON,  # team1
            DECOMPOSE_JSON, "A1.", "A2.", APPROVE_JSON,  # team2
        ])
        team1 = make_team("t1", llm=llm)
        team2 = make_team("t2", llm=llm)

        inputs2 = [{"name": "task", "type": "str", "description": "task"}]
        outputs2 = [{"name": "result", "type": "str", "description": "result"}]
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="Two step", teams=[team1, team2],
            inputs=inputs2, outputs=outputs2,
        )
        all_agents = team1.all_agents() + team2.all_agents()
        agent_manager = AgentManager(agents=all_agents)
        wfm = WorkFlowManager(llm=_STUB_LLM)
        workflow = HierarchicalWorkFlow(
            graph=graph, llm=_STUB_LLM, agent_manager=agent_manager, workflow_manager=wfm,
        )
        workflow.execute(inputs={"task": "Do the thing."})
        event_types = [e.event_type for e in workflow.trace.events]
        assert event_types.count("handoff") == 2  # one per team


# ---------------------------------------------------------------------------
# 3.2.3 — Escalation path
# ---------------------------------------------------------------------------

class TestEscalationPath:
    def test_supervisor_takes_over_empty_output(self):
        """Empty worker output triggers escalation → supervisor takes over."""
        llm = SequenceLLM([
            DECOMPOSE_JSON,
            "",                         # Worker A returns empty → triggers escalation
            "Supervisor rescue answer.", # Supervisor takes over
            "Worker B answer.",
            APPROVE_JSON,
        ])
        escalation_rules = [
            EscalationRule(
                condition="output is empty",
                action=EscalationAction.ESCALATE_TO_SUPERVISOR,
            )
        ]
        team = make_team("t1", llm=llm, escalation_rules=escalation_rules)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        output = workflow.execute(inputs={"question": "Q?"})
        assert output  # Should not be empty
        event_types = [e.event_type for e in workflow.trace.events]
        assert "escalate" in event_types

    def test_fail_task_raises(self):
        """FAIL_TASK escalation should raise EscalationError."""
        llm = SequenceLLM([
            DECOMPOSE_JSON,
            "",  # Empty output triggers FAIL_TASK
        ])
        escalation_rules = [
            EscalationRule(
                condition="output is empty",
                action=EscalationAction.FAIL_TASK,
            )
        ]
        team = make_team("t1", llm=llm, escalation_rules=escalation_rules)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        # EscalationError propagates up through the execute() path
        output = workflow.execute(inputs={"question": "Q?"})
        assert "Failed" in output  # WorkFlow catches exceptions and returns error string

    def test_retry_with_different_worker(self):
        """RETRY_WITH_DIFFERENT_WORKER escalation tries another worker."""
        llm = SequenceLLM([
            DECOMPOSE_JSON,
            "",                      # Worker A fails (empty)
            "Worker B retry answer.",# Worker B succeeds on retry
            "Worker B second answer.",
            APPROVE_JSON,
        ])
        escalation_rules = [
            EscalationRule(
                condition="output is empty",
                action=EscalationAction.RETRY_WITH_DIFFERENT_WORKER,
                max_retries=1,
            )
        ]
        team = make_team("t1", llm=llm, escalation_rules=escalation_rules,
                         delegation_strategy=DelegationStrategy.ROUND_ROBIN)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        output = workflow.execute(inputs={"question": "Q?"})
        assert output


# ---------------------------------------------------------------------------
# 3.2.4 — Revision loop
# ---------------------------------------------------------------------------

class TestRevisionLoop:
    def test_revision_loop_improves_output(self):
        """Supervisor rejects first output → second attempt gets approved."""
        REJECT_JSON = '''{
            "approved": false,
            "final_output": null,
            "revisions_needed": ["s1"],
            "feedback": {"s1": "Too vague, be more specific."}
        }'''
        APPROVE_REVISED = '''{
            "approved": true,
            "final_output": "Specific answer: Paris, France.",
            "revisions_needed": [],
            "feedback": {}
        }'''
        llm = SequenceLLM([
            DECOMPOSE_JSON,
            "Vague answer.",         # Worker A first attempt
            "Worker B answer.",      # Worker B
            REJECT_JSON,             # Supervisor rejects s1
            "Specific revised answer.", # Worker re-does s1
            APPROVE_REVISED,         # Supervisor approves
        ])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        output = workflow.execute(inputs={"question": "What is the capital?"})
        assert "Paris" in output

    def test_revision_trace_has_revise_event(self):
        REJECT_JSON = '''{
            "approved": false,
            "final_output": null,
            "revisions_needed": ["s1"],
            "feedback": {"s1": "Needs improvement."}
        }'''
        llm = SequenceLLM([
            DECOMPOSE_JSON,
            "First attempt.",
            "B answer.",
            REJECT_JSON,
            "Better answer.",
            APPROVE_JSON,
        ])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        workflow.execute(inputs={"question": "Q?"})
        event_types = [e.event_type for e in workflow.trace.events]
        assert "revise" in event_types

    def test_max_revisions_cap(self):
        """After MAX_REVISION_ROUNDS, accept current output even if not approved."""
        ALWAYS_REJECT = '''{
            "approved": false,
            "final_output": null,
            "revisions_needed": ["s1"],
            "feedback": {"s1": "Still not good enough."}
        }'''
        # Provide enough responses for 2 revision rounds + initial
        llm = SequenceLLM([
            DECOMPOSE_JSON,
            "First.", "B.",          # Initial execution
            ALWAYS_REJECT,           # Review round 1 — reject
            "Revised 1.",            # Revision 1
            ALWAYS_REJECT,           # Review round 2 — reject
            "Revised 2.",            # Revision 2
            ALWAYS_REJECT,           # Would be review round 3, but MAX_REVISION_ROUNDS=2
        ])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        output = workflow.execute(inputs={"question": "Q?"})
        # Should complete (not hang) and return something
        assert isinstance(output, str)
        assert len(output) > 0


# ---------------------------------------------------------------------------
# 3.2.5 — Trace summary for dissertation overhead analysis
# ---------------------------------------------------------------------------

class TestExecutionTrace:
    def test_trace_summary_has_all_keys(self):
        llm = SequenceLLM([DECOMPOSE_JSON, "A.", "B.", APPROVE_JSON])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        workflow.execute(inputs={"question": "Q?"})
        summary = workflow.trace.summary()
        assert "total_events" in summary
        assert "event_counts" in summary
        assert "total_elapsed_s" in summary

    def test_trace_to_dict_is_serialisable(self):
        import json
        llm = SequenceLLM([DECOMPOSE_JSON, "A.", "B.", APPROVE_JSON])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        workflow.execute(inputs={"question": "Q?"})
        d = workflow.trace.to_dict()
        # Should be JSON-serialisable
        serialised = json.dumps(d)
        assert len(serialised) > 0

    def test_trace_event_count_matches_decomposed_subtasks(self):
        llm = SequenceLLM([DECOMPOSE_JSON, "A.", "B.", APPROVE_JSON])
        team = make_team("t1", llm=llm)
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        workflow = make_workflow(graph, llm)
        workflow.execute(inputs={"question": "Q?"})
        summary = workflow.trace.summary()
        # DECOMPOSE_JSON has 2 subtasks → 2 delegate events, 2 execute events
        assert summary["event_counts"].get("delegate", 0) == 2
        assert summary["event_counts"].get("execute", 0) == 2
