"""
Auto-build a HierarchicalWorkFlowGraph from a plain-text task description.

The LLM analyses the task and generates:
  - A supervisor role with description and authority scope
  - 2–4 specialist worker roles with descriptions and authority scopes
  - A delegation strategy

The result is a ready-to-execute (HierarchicalWorkFlowGraph, AgentManager) pair
that can be passed directly to HierarchicalWorkFlow.

Usage:
    from dissertation.hierarchy.auto_build import build_hierarchy_from_task

    graph, agent_manager = build_hierarchy_from_task(
        task="Research the EV market in Southeast Asia and write a market entry report",
        llm_config=get_llm_config(),
    )
    workflow = HierarchicalWorkFlow(graph=graph, agent_manager=agent_manager, llm=llm)
    result = asyncio.run(workflow.async_execute(inputs={"task": task}))

REST API (via Evolvian operations router):
    POST /api/hierarchy/build
    { "task": "...", "team_id": 1 }
    → returns workflow_config with hierarchy_mode=true
"""
import sys
import json
import re
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from dissertation.hierarchy.team import (
    Team, AgentRole, DelegationPolicy, DelegationStrategy,
    EscalationRule, EscalationAction, ReviewMode, HierarchicalAgent,
)
from dissertation.hierarchy.hierarchical_graph import HierarchicalWorkFlowGraph
from evoagentx.agents import AgentManager


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are an expert at designing multi-agent AI systems. Given a task description,
you design the optimal hierarchical team: a Supervisor and 2-4 specialist workers.

Rules:
- The Supervisor orchestrates, reviews, and approves. It does NOT do the work itself.
- Each worker has a narrow, clearly-defined specialty.
- Choose the minimum number of workers that covers the task fully.
- Worker names must be unique and role-descriptive (e.g. "ResearchAnalyst", "DataAnalyst").
- Authority scope is a list of 3-6 short skill keywords.

Respond with ONLY valid JSON — no markdown fences, no commentary."""

_USER_PROMPT = """\
Design the optimal hierarchical agent team for this task:

TASK: {task}

Return JSON exactly matching this schema:
{{
  "team_name": "short descriptive team name",
  "supervisor": {{
    "name": "SupervisorName",
    "description": "2-3 sentence description of what the supervisor does for THIS task",
    "authority_scope": ["skill1", "skill2", "skill3"]
  }},
  "workers": [
    {{
      "name": "WorkerName",
      "description": "2-3 sentence description of what this worker does for THIS task",
      "authority_scope": ["skill1", "skill2", "skill3"]
    }}
  ],
  "delegation_strategy": "capability_match",
  "reasoning": "one sentence explaining why this team structure fits the task"
}}

delegation_strategy must be one of: capability_match, round_robin"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_hierarchy_from_task(
    task: str,
    llm_config=None,
    llm=None,
    max_tokens: int = 800,
) -> tuple:
    """
    Auto-generate a HierarchicalWorkFlowGraph + AgentManager from a task string.

    Provide either llm_config (to create a fresh OpenRouterLLM) or an existing llm.

    Returns:
        (HierarchicalWorkFlowGraph, AgentManager, team_spec_dict)
        The team_spec_dict is the raw parsed JSON for inspection/storage.
    """
    if llm is None and llm_config is None:
        raise ValueError("Provide either llm_config or llm")

    if llm is None:
        from evoagentx.models.openrouter_model import OpenRouterLLM
        llm = OpenRouterLLM(config=llm_config)

    team_spec = _generate_team_spec(task, llm)
    graph, agent_manager = _build_graph(task, team_spec, llm_config)
    return graph, agent_manager, team_spec


def build_hierarchy_from_task_with_llm_service(
    task: str,
    llm_service,
) -> dict:
    """
    Variant for the Evolvian backend where llm_service is the existing LLMService.

    Returns the team_spec dict (JSON-serialisable) so the router can store it
    in workflow_config and return it to the frontend.
    """
    prompt = _USER_PROMPT.format(task=task[:2000])
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
    raw = llm_service.simple_chat(messages)
    return _parse_team_spec(raw)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _generate_team_spec(task: str, llm) -> dict:
    """Call LLM and parse the team spec JSON."""
    prompt = _SYSTEM_PROMPT + "\n\n" + _USER_PROMPT.format(task=task[:2000])
    raw = llm.generate(prompt)
    if not isinstance(raw, str):
        raw = str(raw)
    return _parse_team_spec(raw)


def _parse_team_spec(raw: str) -> dict:
    """Extract JSON from LLM output robustly."""
    # Strip markdown fences if present
    raw = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()

    # Find the first { ... } block
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM response:\n{raw[:500]}")

    try:
        spec = json.loads(match.group())
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from LLM: {e}\nRaw:\n{raw[:500]}")

    _validate_team_spec(spec)
    return spec


def _validate_team_spec(spec: dict):
    """Light validation — raises ValueError with a clear message on bad schema."""
    if "supervisor" not in spec:
        raise ValueError("LLM team spec missing 'supervisor' key")
    if "workers" not in spec or not spec["workers"]:
        raise ValueError("LLM team spec missing 'workers' or empty workers list")
    if len(spec["workers"]) < 2:
        raise ValueError("LLM team spec must have at least 2 workers")
    for w in spec["workers"]:
        if "name" not in w or "description" not in w:
            raise ValueError(f"Worker missing name or description: {w}")


def _delegation_strategy(raw: str) -> DelegationStrategy:
    raw = raw.lower().replace("-", "_")
    mapping = {
        "capability_match": DelegationStrategy.CAPABILITY_MATCH,
        "round_robin": DelegationStrategy.ROUND_ROBIN,
    }
    return mapping.get(raw, DelegationStrategy.CAPABILITY_MATCH)


def _build_graph(task: str, spec: dict, llm_config) -> tuple:
    """Construct Team, HierarchicalWorkFlowGraph, AgentManager from spec dict."""
    sup_spec = spec["supervisor"]
    supervisor = HierarchicalAgent(
        name=_safe_name(sup_spec.get("name", "Supervisor")),
        description=sup_spec.get("description", "Oversees and reviews all work"),
        role=AgentRole.SUPERVISOR,
        authority_scope=sup_spec.get("authority_scope", ["management", "review"]),
        llm_config=llm_config,
    )

    workers = []
    for w in spec["workers"]:
        worker = HierarchicalAgent(
            name=_safe_name(w.get("name", f"Worker{len(workers)+1}")),
            description=w.get("description", "Specialist worker"),
            role=AgentRole.WORKER,
            authority_scope=w.get("authority_scope", ["general"]),
            llm_config=llm_config,
        )
        workers.append(worker)

    strategy = _delegation_strategy(spec.get("delegation_strategy", "capability_match"))

    team = Team(
        team_id="auto_team",
        name=spec.get("team_name", "Auto-Generated Team"),
        supervisor=supervisor,
        workers=workers,
        delegation_policy=DelegationPolicy(
            strategy=strategy,
            max_delegation_depth=3,
        ),
        escalation_rules=[
            EscalationRule(
                condition="output is empty, too short (under 50 words), or does not address the assigned task",
                action=EscalationAction.ESCALATE_TO_SUPERVISOR,
            )
        ],
        review_mode=ReviewMode.SUPERVISOR_REVIEWS_ALL,
    )

    graph = HierarchicalWorkFlowGraph.from_teams(
        goal=task,
        teams=[team],
        inputs=[{"name": "task", "type": "str", "description": "The task to complete"}],
        outputs=[{"name": "result", "type": "str", "description": "The completed work"}],
    )

    agent_manager = AgentManager(agents=[supervisor] + workers)
    return graph, agent_manager


def _safe_name(name: str) -> str:
    """Strip spaces/special chars from agent names."""
    return re.sub(r"[^A-Za-z0-9_]", "", name.replace(" ", "")) or "Agent"


# ---------------------------------------------------------------------------
# CLI smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from dissertation.config import get_llm_config

    task = sys.argv[1] if len(sys.argv) > 1 else (
        "Research the competitive landscape of AI agent frameworks "
        "and write a recommendation report for a fintech startup."
    )

    print(f"Task: {task}\n")
    print("Generating team spec...")

    llm_config = get_llm_config(temperature=0.2, max_tokens=800)
    graph, agent_manager, spec = build_hierarchy_from_task(task, llm_config=llm_config)

    print(f"\nTeam: {spec.get('team_name')}")
    print(f"Supervisor: {spec['supervisor']['name']}")
    print(f"Workers: {[w['name'] for w in spec['workers']]}")
    print(f"Reasoning: {spec.get('reasoning')}")
    print(f"\nGraph nodes: {[n.name for n in graph.nodes]}")
    print(f"Graph is_complete: {graph.is_complete}")
    print("\nTeam spec JSON:")
    print(json.dumps(spec, indent=2))
