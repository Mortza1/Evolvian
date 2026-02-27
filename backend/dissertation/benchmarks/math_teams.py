"""
MATH hierarchical team configuration (Config B).

Team structure:
  Supervisor: MathStrategist
    Reads the problem, decides on solution strategy, delegates solving and
    verification steps, makes the final decision based on solver + verifier output.

  Worker 1: Solver
    Executes mathematical steps: algebra, calculus, combinatorics, etc.
    Shows all working. Produces a numerical or symbolic answer.

  Worker 2: Verifier
    Checks the solver's work for errors. Independently re-derives or spot-checks
    the answer. Reports whether the answer is correct and why.

Delegation: capability_match (Solver gets computation tasks, Verifier gets checking tasks)
Review:     supervisor_reviews_all
Escalation: if Verifier finds an error → escalate to supervisor for resolution
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


def build_math_team(llm_config) -> tuple:
    """
    Build a single-team HierarchicalWorkFlowGraph for MATH.

    Returns:
        (HierarchicalWorkFlowGraph, AgentManager)
    """
    supervisor = HierarchicalAgent(
        name="MathStrategist",
        description=(
            "You are a Mathematics Strategist. Given a mathematical problem, "
            "identify the solution strategy (e.g. algebraic manipulation, calculus, "
            "combinatorics), delegate the solving and verification steps to your team, "
            "then produce the final answer in the format 'Answer: <value>'."
        ),
        role=AgentRole.SUPERVISOR,
        authority_scope=["strategy", "math planning", "answer finalisation"],
        llm_config=llm_config,
    )

    solver = HierarchicalAgent(
        name="Solver",
        description=(
            "You are a Mathematics Solver. Given a problem and a solution strategy, "
            "work through every step carefully. Show all working. "
            "At the end, state: 'Final answer: <value>'."
        ),
        role=AgentRole.WORKER,
        authority_scope=["computation", "algebra", "calculus", "solving", "arithmetic", "math"],
        llm_config=llm_config,
    )

    verifier = HierarchicalAgent(
        name="Verifier",
        description=(
            "You are a Mathematics Verifier. Given a problem and a proposed solution, "
            "independently check the answer by re-deriving it or substituting back. "
            "State 'CORRECT' or 'INCORRECT: <reason>' at the start of your response."
        ),
        role=AgentRole.WORKER,
        authority_scope=["verification", "checking", "proof checking", "error detection"],
        llm_config=llm_config,
    )

    team = Team(
        team_id="math_team",
        name="MATH Team",
        supervisor=supervisor,
        workers=[solver, verifier],
        scope=["mathematical problem solving"],
        delegation_policy=DelegationPolicy(
            strategy=DelegationStrategy.CAPABILITY_MATCH,
        ),
        escalation_rules=[
            EscalationRule(
                condition="verifier reports the answer is INCORRECT or solution is incomplete",
                action=EscalationAction.ESCALATE_TO_SUPERVISOR,
                max_retries=1,
            ),
        ],
        review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
    )

    graph = HierarchicalWorkFlowGraph.from_teams(
        goal="Solve a mathematical problem using a solve-then-verify hierarchy",
        teams=[team],
        inputs=[
            _p("problem", "str", "The mathematical problem to solve"),
        ],
        outputs=[
            _p("solution", "str", "The final answer with working"),
        ],
    )

    agent_manager = AgentManager(agents=team.all_agents())
    return graph, agent_manager
