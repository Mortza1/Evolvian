"""
HotPotQA hierarchical team configuration (Config B).

Team structure:
  Supervisor: Research Coordinator
    Receives the multi-hop question + context, decomposes into sub-questions,
    reviews sub-answers, synthesises the final answer.

  Worker 1: Retriever
    Extracts relevant facts from the provided context for a given sub-question.
    Skills: information retrieval, context extraction

  Worker 2: Reasoner
    Synthesises retrieved facts into a concise answer for a sub-question.
    Skills: logical reasoning, evidence synthesis

Delegation: capability_match
Review:     supervisor_reviews_all
Escalation: if output is empty or too short, supervisor takes over
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


def build_hotpotqa_team(llm_config) -> tuple:
    """
    Build a single-team HierarchicalWorkFlowGraph for HotPotQA.

    Returns:
        (HierarchicalWorkFlowGraph, AgentManager)
    """
    supervisor = HierarchicalAgent(
        name="ResearchCoordinator",
        description=(
            "You are a Research Coordinator specialising in multi-hop question answering. "
            "Given a question and supporting context, decompose it into precise sub-questions, "
            "delegate retrieval and reasoning tasks to your team, then synthesise a final "
            "short answer (a name, date, number, or brief phrase)."
        ),
        role=AgentRole.SUPERVISOR,
        authority_scope=["coordination", "synthesis", "question decomposition"],
        llm_config=llm_config,
    )

    retriever = HierarchicalAgent(
        name="Retriever",
        description=(
            "You are a Retrieval Specialist. Given a sub-question and context paragraphs, "
            "extract the most relevant sentences or facts that directly address the sub-question. "
            "Be precise and quote from the context where possible."
        ),
        role=AgentRole.WORKER,
        authority_scope=["retrieval", "search", "information extraction", "context extraction"],
        llm_config=llm_config,
    )

    reasoner = HierarchicalAgent(
        name="Reasoner",
        description=(
            "You are a Reasoning Specialist. Given a sub-question and retrieved facts, "
            "synthesise a concise, accurate answer. Use only the provided facts. "
            "Output a single short phrase or sentence."
        ),
        role=AgentRole.WORKER,
        authority_scope=["reasoning", "synthesis", "evidence-based answering", "logic"],
        llm_config=llm_config,
    )

    team = Team(
        team_id="hotpotqa_team",
        name="HotPotQA Research Team",
        supervisor=supervisor,
        workers=[retriever, reasoner],
        scope=["multi-hop question answering"],
        delegation_policy=DelegationPolicy(
            strategy=DelegationStrategy.CAPABILITY_MATCH,
        ),
        escalation_rules=[
            EscalationRule(
                condition="output is empty, too short, or does not address the question",
                action=EscalationAction.ESCALATE_TO_SUPERVISOR,
                max_retries=1,
            ),
        ],
        review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
    )

    graph = HierarchicalWorkFlowGraph.from_teams(
        goal="Answer a multi-hop question using hierarchical retrieval and reasoning",
        teams=[team],
        inputs=[
            _p("question", "str", "The multi-hop question to answer"),
            _p("context", "str", "Supporting context paragraphs"),
        ],
        outputs=[
            _p("answer", "str", "The final short answer"),
        ],
    )

    agent_manager = AgentManager(agents=team.all_agents())
    return graph, agent_manager
