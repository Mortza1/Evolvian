"""MATH hierarchical team configuration (Config C).

Team: MathStrategist (supervisor) + Planner + Solver + Verifier.
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
    """Build a HierarchicalWorkFlowGraph for MATH. Returns (graph, agent_manager)."""
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

    planner = HierarchicalAgent(
        name="Planner",
        description=(
            "You are a Mathematics Planner. Given a math problem, identify the "
            "mathematical domain (algebra, geometry, number theory, etc.) and plan "
            "the solution approach. List the steps needed to solve the problem. "
            "Do NOT solve it — only produce a clear plan."
        ),
        role=AgentRole.WORKER,
        authority_scope=["planning", "strategy", "domain identification", "math planning"],
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
            "Rate your confidence that the solution is correct on a scale of 0-100. "
            "Start your response with 'CONFIDENCE: <score>/100'. "
            "Flag as INCORRECT only if confidence < 30. If you flag INCORRECT, you "
            "MUST identify the SPECIFIC step that is wrong (e.g. 'Step 3 is wrong "
            "because...'). If you cannot point to a specific error, default to CORRECT."
        ),
        role=AgentRole.WORKER,
        authority_scope=["verification", "checking", "proof checking", "error detection"],
        llm_config=llm_config,
    )

    team = Team(
        team_id="math_team",
        name="MATH Team",
        supervisor=supervisor,
        workers=[planner, solver, verifier],
        scope=["mathematical problem solving"],
        delegation_policy=DelegationPolicy(
            strategy=DelegationStrategy.CAPABILITY_MATCH,
        ),
        escalation_rules=[
            EscalationRule(
                condition="verifier confidence is below 30 AND a specific error step is identified",
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
