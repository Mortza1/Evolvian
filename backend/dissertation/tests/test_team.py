"""
Unit tests for Phase 1 data models:
  Team, DelegationPolicy, EscalationRule, HierarchicalAgent, HierarchicalAgentManager
"""
import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))          # backend/
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from dissertation.hierarchy.team import (
    AgentRole, DelegationStrategy, DelegationPolicy,
    EscalationAction, EscalationRule,
    ReviewMode, InterTeamProtocol,
    Team, HierarchicalAgent, HierarchicalAgentManager,
)
from dissertation.config import get_llm_config


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_agent(name: str, role: AgentRole = AgentRole.WORKER, scope: list = None) -> HierarchicalAgent:
    """Create a minimal HierarchicalAgent for unit tests.
    is_human=True skips LLM initialisation so we can test data model structure
    without needing API keys. Execution tests (Phase 3+) use real LLM configs.
    """
    return HierarchicalAgent(
        name=name,
        description=f"{name} agent for testing",
        role=role,
        authority_scope=scope or [],
        is_human=True,  # skip LLM init for data model tests
    )


def make_team(
    team_id: str = "t1",
    supervisor_name: str = "Supervisor",
    worker_names: list = None,
    scope: list = None,
) -> Team:
    supervisor = make_agent(supervisor_name, role=AgentRole.SUPERVISOR)
    workers = [make_agent(n) for n in (worker_names or ["Worker1", "Worker2"])]
    return Team(
        team_id=team_id,
        name="Test Team",
        supervisor=supervisor,
        workers=workers,
        scope=scope or ["research", "analysis"],
    )


# ---------------------------------------------------------------------------
# DelegationPolicy tests
# ---------------------------------------------------------------------------

class TestDelegationPolicy:
    def test_default_strategy(self):
        policy = DelegationPolicy()
        assert policy.strategy == DelegationStrategy.CAPABILITY_MATCH

    def test_all_strategies(self):
        for s in DelegationStrategy:
            p = DelegationPolicy(strategy=s)
            assert p.strategy == s

    def test_default_concurrency(self):
        policy = DelegationPolicy()
        assert policy.max_concurrent_per_worker == 1

    def test_custom_concurrency(self):
        policy = DelegationPolicy(max_concurrent_per_worker=3)
        assert policy.max_concurrent_per_worker == 3

    def test_invalid_concurrency(self):
        with pytest.raises(Exception):
            DelegationPolicy(max_concurrent_per_worker=0)

    def test_flags(self):
        policy = DelegationPolicy(
            require_supervisor_decomposition=False,
            allow_worker_to_worker=True,
        )
        assert policy.require_supervisor_decomposition is False
        assert policy.allow_worker_to_worker is True


# ---------------------------------------------------------------------------
# EscalationRule tests
# ---------------------------------------------------------------------------

class TestEscalationRule:
    def test_basic_creation(self):
        rule = EscalationRule(condition="confidence < 0.5")
        assert rule.condition == "confidence < 0.5"
        assert rule.action == EscalationAction.ESCALATE_TO_SUPERVISOR
        assert rule.max_retries == 2

    def test_all_actions(self):
        for action in EscalationAction:
            rule = EscalationRule(condition="test", action=action)
            assert rule.action == action

    def test_custom_max_retries(self):
        rule = EscalationRule(condition="x", max_retries=5)
        assert rule.max_retries == 5

    def test_zero_retries_allowed(self):
        rule = EscalationRule(condition="x", max_retries=0)
        assert rule.max_retries == 0


# ---------------------------------------------------------------------------
# Team tests
# ---------------------------------------------------------------------------

class TestTeam:
    def test_basic_creation(self):
        team = make_team()
        assert team.team_id == "t1"
        assert team.supervisor.name == "Supervisor"
        assert len(team.workers) == 2
        assert team.review_mode == ReviewMode.SUPERVISOR_REVIEWS_ALL

    def test_no_workers_raises(self):
        with pytest.raises(Exception):
            Team(
                team_id="bad",
                name="Bad Team",
                supervisor=make_agent("Sup", role=AgentRole.SUPERVISOR),
                workers=[],
            )

    def test_supervisor_cannot_be_worker(self):
        sup = make_agent("Alice", role=AgentRole.SUPERVISOR)
        worker_also_sup = make_agent("Alice")  # same name as supervisor
        with pytest.raises(Exception):
            Team(
                team_id="bad",
                name="Bad",
                supervisor=sup,
                workers=[worker_also_sup, make_agent("Bob")],
            )

    def test_duplicate_worker_names_raises(self):
        sup = make_agent("Sup", role=AgentRole.SUPERVISOR)
        with pytest.raises(Exception):
            Team(
                team_id="bad",
                name="Bad",
                supervisor=sup,
                workers=[make_agent("Worker"), make_agent("Worker")],
            )

    def test_all_agents(self):
        team = make_team()
        all_agents = team.all_agents()
        assert len(all_agents) == 3  # 1 supervisor + 2 workers
        assert all_agents[0].name == "Supervisor"

    def test_get_worker_found(self):
        team = make_team(worker_names=["Alpha", "Beta"])
        w = team.get_worker("Alpha")
        assert w is not None
        assert w.name == "Alpha"

    def test_get_worker_not_found(self):
        team = make_team()
        assert team.get_worker("Nonexistent") is None

    def test_scope_stored(self):
        team = make_team(scope=["math", "code"])
        assert "math" in team.scope

    def test_delegation_policy_default(self):
        team = make_team()
        assert team.delegation_policy.strategy == DelegationStrategy.CAPABILITY_MATCH

    def test_custom_escalation_rules(self):
        rules = [
            EscalationRule(condition="output is empty", action=EscalationAction.RETRY_WITH_DIFFERENT_WORKER),
            EscalationRule(condition="confidence < 0.4"),
        ]
        team = make_team()
        team.escalation_rules = rules
        assert len(team.escalation_rules) == 2

    def test_review_mode_variants(self):
        for mode in ReviewMode:
            team = make_team()
            team.review_mode = mode
            assert team.review_mode == mode

    def test_single_worker_allowed(self):
        sup = make_agent("Sup", role=AgentRole.SUPERVISOR)
        team = Team(
            team_id="solo",
            name="Solo Team",
            supervisor=sup,
            workers=[make_agent("Solo")],
        )
        assert len(team.workers) == 1


# ---------------------------------------------------------------------------
# HierarchicalAgent tests
# ---------------------------------------------------------------------------

class TestHierarchicalAgent:
    def test_default_role_is_worker(self):
        agent = make_agent("Agent1")
        assert agent.role == AgentRole.WORKER

    def test_supervisor_role(self):
        agent = make_agent("Boss", role=AgentRole.SUPERVISOR)
        assert agent.role == AgentRole.SUPERVISOR

    def test_team_id_default_none(self):
        agent = make_agent("Agent1")
        assert agent.team_id is None

    def test_authority_scope(self):
        agent = make_agent("Researcher", scope=["research", "summarization"])
        assert "research" in agent.authority_scope
        assert "summarization" in agent.authority_scope

    def test_empty_scope(self):
        agent = make_agent("Agent1")
        assert agent.authority_scope == []

    def test_is_agent_subclass(self):
        from evoagentx.agents.agent import Agent
        agent = make_agent("X")
        assert isinstance(agent, Agent)

    def test_all_agent_fields_accessible(self):
        agent = make_agent("X")
        assert agent.name == "X"
        assert agent.description is not None
        # Agent init_module populates actions with default ContextExtraction
        assert isinstance(agent.actions, list)


# ---------------------------------------------------------------------------
# HierarchicalAgentManager tests
# ---------------------------------------------------------------------------

class TestHierarchicalAgentManager:
    def _make_manager_with_team(self):
        team = make_team(team_id="team1", supervisor_name="Sup", worker_names=["W1", "W2"])
        manager = HierarchicalAgentManager()
        manager.add_team(team)
        return manager, team

    def test_add_team(self):
        manager, team = self._make_manager_with_team()
        assert manager.get_team("team1") is not None

    def test_duplicate_team_raises(self):
        manager, team = self._make_manager_with_team()
        with pytest.raises(ValueError, match="already registered"):
            manager.add_team(team)

    def test_get_team_not_found(self):
        manager = HierarchicalAgentManager()
        assert manager.get_team("ghost") is None

    def test_get_supervisor(self):
        manager, team = self._make_manager_with_team()
        sup = manager.get_supervisor("team1")
        assert sup is not None
        assert sup.name == "Sup"

    def test_get_supervisor_unknown_team(self):
        manager = HierarchicalAgentManager()
        assert manager.get_supervisor("nope") is None

    def test_get_workers(self):
        manager, team = self._make_manager_with_team()
        workers = manager.get_workers("team1")
        assert len(workers) == 2
        names = {w.name for w in workers}
        assert names == {"W1", "W2"}

    def test_get_workers_unknown_team(self):
        manager = HierarchicalAgentManager()
        assert manager.get_workers("nope") == []

    def test_agents_registered_after_add_team(self):
        manager, team = self._make_manager_with_team()
        agent_names = manager.list_agents()
        assert "Sup" in agent_names
        assert "W1" in agent_names
        assert "W2" in agent_names

    def test_multiple_teams(self):
        team1 = make_team("t1", "Sup1", ["W1a", "W1b"])
        team2 = make_team("t2", "Sup2", ["W2a", "W2b"])
        manager = HierarchicalAgentManager()
        manager.add_team(team1)
        manager.add_team(team2)
        assert manager.get_team("t1") is not None
        assert manager.get_team("t2") is not None
        assert len(manager.list_agents()) == 6  # 2 sups + 4 workers

    def test_get_agents_by_scope_exact(self):
        manager = HierarchicalAgentManager()
        team = Team(
            team_id="scoped",
            name="Scoped",
            supervisor=make_agent("Sup", role=AgentRole.SUPERVISOR, scope=["management"]),
            workers=[
                make_agent("Researcher", scope=["research", "search"]),
                make_agent("Analyst", scope=["analysis", "math"]),
            ],
        )
        manager.add_team(team)
        results = manager.get_agents_by_scope("research")
        names = [a.name for a in results]
        assert "Researcher" in names
        assert "Analyst" not in names

    def test_get_agents_by_scope_partial(self):
        manager = HierarchicalAgentManager()
        team = Team(
            team_id="partial",
            name="Partial",
            supervisor=make_agent("Sup", role=AgentRole.SUPERVISOR),
            workers=[make_agent("CodeExpert", scope=["code_generation", "debugging"])],
        )
        manager.add_team(team)
        results = manager.get_agents_by_scope("code")
        assert any(a.name == "CodeExpert" for a in results)

    def test_get_agents_by_scope_none_match(self):
        manager, _ = self._make_manager_with_team()
        results = manager.get_agents_by_scope("astrophysics")
        assert results == []

    def test_assign_to_team_non_hierarchical_raises(self):
        from evoagentx.agents import Agent
        manager, _ = self._make_manager_with_team()
        # Plain Agent requires llm — use is_human=True for test
        plain_agent = Agent(name="Plain", description="plain", is_human=True)
        with pytest.raises(TypeError):
            manager.assign_to_team(plain_agent, "team1", AgentRole.WORKER)

    def test_assign_to_team_unknown_raises(self):
        manager = HierarchicalAgentManager()
        agent = make_agent("X")
        with pytest.raises(ValueError):
            manager.assign_to_team(agent, "ghost_team", AgentRole.WORKER)
