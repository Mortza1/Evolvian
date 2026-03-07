"""
MBPP hierarchical team configuration (Config C).

Team structure:
  Supervisor: Architect
    Reads the specification, designs the implementation approach, delegates
    coding and testing, reviews the final code, requests revisions if tests fail.

  Worker 1: Coder
    Writes the Python implementation based on the spec and approach.
    Returns a complete, runnable Python function.

  Worker 2: Tester
    Writes test cases and validates the code against the provided test list.
    Reports whether the implementation passes all tests.

Delegation: capability_match (Coder gets implementation tasks, Tester gets validation)
Review:     supervisor_reviews_all
Escalation: if tests fail → supervisor requests Coder revision with Tester feedback
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.agents.agent_manager import AgentManager

from dissertation.hierarchy.team import (
    HierarchicalAgent, Team,
    AgentRole, DelegationPolicy, DelegationStrategy,
    EscalationRule, EscalationAction, ReviewMode,
)
from dissertation.hierarchy.hierarchical_graph import HierarchicalWorkFlowGraph


def _p(name: str, type_: str = "str", description: str = "") -> dict:
    return {"name": name, "type": type_, "description": description}


def build_mbpp_team(llm_config) -> tuple:
    """
    Build a single-team HierarchicalWorkFlowGraph for MBPP.

    Returns:
        (HierarchicalWorkFlowGraph, AgentManager)
    """
    supervisor = HierarchicalAgent(
        name="Architect",
        description=(
            "You are a Software Architect. Given a programming task, design the "
            "implementation approach (function signature, algorithm, edge cases). "
            "Delegate implementation to the Coder and validation to the Tester. "
            "Review the final code and confirm it satisfies the specification. "
            "Return ONLY the final Python function code."
        ),
        role=AgentRole.SUPERVISOR,
        authority_scope=["architecture", "design", "code review", "specification"],
        llm_config=llm_config,
    )

    coder = HierarchicalAgent(
        name="Coder",
        description=(
            "You are a Python Programmer. Given a task description, test cases, and "
            "an implementation approach, write a complete Python function that passes "
            "all the given tests. Return ONLY the Python code, no explanation."
        ),
        role=AgentRole.WORKER,
        authority_scope=["coding", "python", "implementation", "programming"],
        llm_config=llm_config,
    )

    tester = HierarchicalAgent(
        name="Tester",
        description=(
            "You are a Software Tester. Given Python code and test cases, "
            "verify whether the code logically satisfies each test. "
            "Report 'PASS' or 'FAIL: <reason>' for each test case. "
            "Summarise with 'ALL PASS' or 'FAILURES FOUND'."
        ),
        role=AgentRole.WORKER,
        authority_scope=["testing", "validation", "quality assurance", "test execution"],
        llm_config=llm_config,
    )

    team = Team(
        team_id="mbpp_team",
        name="MBPP Development Team",
        supervisor=supervisor,
        workers=[coder, tester],
        scope=["python code generation", "programming"],
        delegation_policy=DelegationPolicy(
            strategy=DelegationStrategy.CAPABILITY_MATCH,
        ),
        escalation_rules=[
            EscalationRule(
                condition="tester reports FAILURES FOUND or code does not pass all tests",
                action=EscalationAction.ESCALATE_TO_SUPERVISOR,
                max_retries=1,
            ),
        ],
        review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
    )

    graph = HierarchicalWorkFlowGraph.from_teams(
        goal="Generate Python code that passes all given tests using architect-coder-tester hierarchy",
        teams=[team],
        inputs=[
            _p("text", "str", "Task description"),
            _p("test_list", "str", "Test cases the code must pass"),
        ],
        outputs=[
            _p("code", "str", "The Python function implementation"),
        ],
    )

    agent_manager = AgentManager(agents=team.all_agents())
    return graph, agent_manager
