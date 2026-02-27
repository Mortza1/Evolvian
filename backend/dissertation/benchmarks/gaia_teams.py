"""
GAIA hierarchical multi-team configuration (Config B).

Multi-team structure:
  Team 1 — Research Team
    Supervisor: Research Lead — plans information gathering, reviews research outputs
    Worker 1:  WebNavigator  — searches and extracts information from web/context
    Worker 2:  DataExtractor — parses documents, extracts structured data

  Team 2 — Analysis Team
    Supervisor: Analysis Lead — coordinates analytical reasoning, produces final answer
    Worker 1:  DataAnalyst   — performs calculations, quantitative analysis
    Worker 2:  Synthesiser   — integrates findings from multiple sources

Inter-team: supervisor_to_supervisor (Research Lead output → Analysis Lead input)
Delegation: capability_match for both teams
Review:     supervisor_reviews_all for both teams
Escalation: empty/off-topic output → escalate to supervisor
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.agents.agent_manager import AgentManager

from dissertation.hierarchy.team import (
    HierarchicalAgent, Team,
    AgentRole, DelegationPolicy, DelegationStrategy,
    EscalationRule, EscalationAction, ReviewMode, InterTeamProtocol,
)
from dissertation.hierarchy.hierarchical_graph import HierarchicalWorkFlowGraph


def _p(name: str, type_: str = "str", description: str = "") -> dict:
    return {"name": name, "type": type_, "description": description}


def build_gaia_teams(llm_config) -> tuple:
    """
    Build a two-team HierarchicalWorkFlowGraph for GAIA.

    Team 1 gathers information; Team 2 analyses and synthesises the final answer.

    Returns:
        (HierarchicalWorkFlowGraph, AgentManager)
    """
    # ------------------------------------------------------------------
    # Team 1: Research
    # ------------------------------------------------------------------
    research_supervisor = HierarchicalAgent(
        name="ResearchLead",
        description=(
            "You are a Research Lead. Given a complex multi-step task, identify what "
            "information needs to be gathered, direct your team to find it, then "
            "compile the collected information into a structured research summary."
        ),
        role=AgentRole.SUPERVISOR,
        authority_scope=["research planning", "information coordination", "research synthesis"],
        llm_config=llm_config,
    )

    web_navigator = HierarchicalAgent(
        name="WebNavigator",
        description=(
            "You are a Web Navigator. Given a specific information need, search the "
            "provided context or your knowledge to find relevant facts, URLs, or data. "
            "Report findings clearly and cite sources."
        ),
        role=AgentRole.WORKER,
        authority_scope=["web search", "information retrieval", "browsing", "navigation"],
        llm_config=llm_config,
    )

    data_extractor = HierarchicalAgent(
        name="DataExtractor",
        description=(
            "You are a Data Extractor. Given documents or text, parse and extract "
            "structured data: tables, numbers, dates, named entities, or specific fields. "
            "Output extracted data in a clear, structured format."
        ),
        role=AgentRole.WORKER,
        authority_scope=["data extraction", "document parsing", "structured data", "entity extraction"],
        llm_config=llm_config,
    )

    research_team = Team(
        team_id="gaia_research",
        name="GAIA Research Team",
        supervisor=research_supervisor,
        workers=[web_navigator, data_extractor],
        scope=["information gathering", "research"],
        delegation_policy=DelegationPolicy(strategy=DelegationStrategy.CAPABILITY_MATCH),
        escalation_rules=[
            EscalationRule(
                condition="output is empty, irrelevant, or fails to address the information need",
                action=EscalationAction.ESCALATE_TO_SUPERVISOR,
                max_retries=1,
            ),
        ],
        review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
    )

    # ------------------------------------------------------------------
    # Team 2: Analysis
    # ------------------------------------------------------------------
    analysis_supervisor = HierarchicalAgent(
        name="AnalysisLead",
        description=(
            "You are an Analysis Lead. You receive research findings and coordinate "
            "analytical work to produce a final answer. You review worker analyses, "
            "integrate results, and produce a concise, accurate final answer."
        ),
        role=AgentRole.SUPERVISOR,
        authority_scope=["analysis coordination", "answer synthesis", "result integration"],
        llm_config=llm_config,
    )

    data_analyst = HierarchicalAgent(
        name="DataAnalyst",
        description=(
            "You are a Data Analyst. Given research findings, perform calculations, "
            "comparisons, or quantitative analysis. Show your working clearly and "
            "report a precise numerical or factual answer."
        ),
        role=AgentRole.WORKER,
        authority_scope=["data analysis", "calculations", "quantitative reasoning", "math"],
        llm_config=llm_config,
    )

    synthesiser = HierarchicalAgent(
        name="Synthesiser",
        description=(
            "You are a Synthesiser. Given multiple pieces of evidence or analytical "
            "results, integrate them into a coherent conclusion. Identify the single "
            "best answer supported by the evidence."
        ),
        role=AgentRole.WORKER,
        authority_scope=["synthesis", "integration", "conclusion", "multi-source reasoning"],
        llm_config=llm_config,
    )

    analysis_team = Team(
        team_id="gaia_analysis",
        name="GAIA Analysis Team",
        supervisor=analysis_supervisor,
        workers=[data_analyst, synthesiser],
        scope=["analysis", "reasoning", "answer production"],
        delegation_policy=DelegationPolicy(strategy=DelegationStrategy.CAPABILITY_MATCH),
        escalation_rules=[
            EscalationRule(
                condition="output contradicts the research findings or is unsupported",
                action=EscalationAction.ESCALATE_TO_SUPERVISOR,
                max_retries=1,
            ),
        ],
        review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
    )

    # ------------------------------------------------------------------
    # Graph: research → analysis
    # ------------------------------------------------------------------
    graph = HierarchicalWorkFlowGraph.from_teams(
        goal="Solve a complex multi-step GAIA task using hierarchical research and analysis",
        teams=[research_team, analysis_team],
        inputs=[
            _p("task", "str", "The complex multi-step GAIA task"),
        ],
        outputs=[
            _p("answer", "str", "The final answer to the task"),
        ],
        inter_team_protocol=InterTeamProtocol.SUPERVISOR_TO_SUPERVISOR,
    )

    all_agents = research_team.all_agents() + analysis_team.all_agents()
    agent_manager = AgentManager(agents=all_agents)
    return graph, agent_manager
