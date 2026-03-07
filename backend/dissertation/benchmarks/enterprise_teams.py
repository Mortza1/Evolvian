"""
Enterprise Research-to-Report team configuration.

Builds a HierarchicalWorkFlowGraph with:
  - Project Supervisor  — decomposes brief, delegates, reviews, approves
  - Research Analyst    — gathers information on assigned sub-topics
  - Data Analyst        — performs analysis, comparisons, estimates
  - Report Writer       — structures final report per brief requirements

Used by Config C (hierarchical) and Config D (hierarchical + evolution).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from dissertation.hierarchy.team import (
    Team, AgentRole, DelegationPolicy, DelegationStrategy,
    EscalationRule, EscalationAction, ReviewMode,
    HierarchicalAgent,
)
from dissertation.hierarchy.hierarchical_graph import HierarchicalWorkFlowGraph


def build_enterprise_team(llm_config) -> tuple:
    """
    Build hierarchical team + graph for the enterprise Research-to-Report benchmark.

    Returns (HierarchicalWorkFlowGraph, AgentManager).
    """
    from evoagentx.agents import AgentManager

    supervisor = HierarchicalAgent(
        name="ProjectSupervisor",
        description=(
            "You are a Project Supervisor managing a research-to-report workflow. "
            "Your job is to:\n"
            "1. Read the research brief carefully and identify all required sections "
            "and specific questions that must be answered.\n"
            "2. Decompose the brief into research sub-tasks and assign them to the "
            "Research Analyst. Specify exactly which sub-topics each task covers.\n"
            "3. Review the research findings: are ALL required sub-topics covered? "
            "Are the specific questions answered with sufficient evidence? If not, "
            "send the Analyst back with precise instructions on what is missing.\n"
            "4. Once research is complete, assign analysis tasks to the Data Analyst. "
            "Specify what comparisons, estimates, or matrices are needed.\n"
            "5. Review the analysis: is it logically sound? Does it support the "
            "conclusions needed for the recommendation? Send back if insufficient.\n"
            "6. Assign report writing to the Report Writer. Provide the required "
            "section structure and ensure the writer has all research + analysis.\n"
            "7. Review the final report against the original brief: are ALL required "
            "sections present? Are ALL specific questions answered? Does the executive "
            "summary match the body? If not, send back with specific revision instructions.\n"
            "8. Only approve the report when it fully meets the brief's requirements.\n"
            "You may send work back for revision up to 2 times per stage."
        ),
        role=AgentRole.SUPERVISOR,
        authority_scope=["project management", "quality review", "brief compliance",
                         "task decomposition", "report approval"],
        llm_config=llm_config,
    )

    research_analyst = HierarchicalAgent(
        name="ResearchAnalyst",
        description=(
            "You are a Research Analyst. You receive specific research sub-tasks "
            "from the Project Supervisor. For each task:\n"
            "- Gather comprehensive information on the assigned sub-topics.\n"
            "- Provide structured findings with clear headings per sub-topic.\n"
            "- Support claims with specific facts, data points, and examples.\n"
            "- Flag explicitly when information is uncertain or unavailable.\n"
            "- Address the specific questions assigned to you directly.\n"
            "Return well-structured research findings that the Data Analyst can "
            "work with directly."
        ),
        role=AgentRole.WORKER,
        authority_scope=["research", "information gathering", "fact finding",
                         "market research", "literature review"],
        llm_config=llm_config,
    )

    data_analyst = HierarchicalAgent(
        name="DataAnalyst",
        description=(
            "You are a Data Analyst. You receive research findings and analysis "
            "requirements from the Project Supervisor. Your job is to:\n"
            "- Perform structured comparisons (e.g. feature matrices, vendor comparisons).\n"
            "- Produce quantitative estimates where data supports them.\n"
            "- Identify patterns, gaps, and insights in the research.\n"
            "- Produce clear analytical outputs: tables, matrices, ranked lists, "
            "cost breakdowns, risk ratings.\n"
            "- Derive conclusions that can directly inform recommendations.\n"
            "Be analytical, not descriptive. Avoid restating research; synthesise it."
        ),
        role=AgentRole.WORKER,
        authority_scope=["analysis", "comparison", "data synthesis", "financial modelling",
                         "risk assessment", "matrix creation"],
        llm_config=llm_config,
    )

    report_writer = HierarchicalAgent(
        name="ReportWriter",
        description=(
            "You are a Report Writer. You receive the original brief, research "
            "findings, and analysis from the Project Supervisor. Your job is to:\n"
            "- Produce a complete, professionally structured report with ALL required "
            "sections specified in the brief.\n"
            "- Ensure every section directly addresses the content required.\n"
            "- Write an Executive Summary that accurately reflects the key findings "
            "and recommendation.\n"
            "- Ensure logical flow: each section builds on the previous.\n"
            "- Ensure the recommendation follows directly from the analysis.\n"
            "- Reference specific findings from the research in the analysis sections.\n"
            "Format: use clear section headers matching the brief's required sections exactly."
        ),
        role=AgentRole.WORKER,
        authority_scope=["report writing", "document structure", "synthesis",
                         "executive summary", "recommendation writing"],
        llm_config=llm_config,
    )

    delegation_policy = DelegationPolicy(
        strategy=DelegationStrategy.CAPABILITY_MATCH,
        max_delegation_depth=3,
    )

    escalation_rules = [
        EscalationRule(
            condition=(
                "output is empty, too short (under 100 words), or does not address "
                "the assigned task"
            ),
            action=EscalationAction.ESCALATE_TO_SUPERVISOR,
        ),
    ]

    team = Team(
        team_id="enterprise_team",
        name="Enterprise Research Team",
        supervisor=supervisor,
        workers=[research_analyst, data_analyst, report_writer],
        delegation_policy=delegation_policy,
        escalation_rules=escalation_rules,
        review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
    )

    graph = HierarchicalWorkFlowGraph.from_teams(
        goal="Produce a comprehensive analytical report addressing all brief requirements",
        teams=[team],
        inputs=[
            {"name": "brief", "type": "str", "description": "The full research brief"},
        ],
        outputs=[
            {"name": "report", "type": "str", "description": "The completed report"},
        ],
    )

    agent_manager = AgentManager(
        agents=[supervisor, research_analyst, data_analyst, report_writer]
    )

    return graph, agent_manager
