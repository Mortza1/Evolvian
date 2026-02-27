"""
Unit tests for Phase 2 — HierarchicalWorkFlowGraph.

Tests cover:
  - from_teams() factory builds correct nodes/edges
  - is_team_node() / get_team_for_node() identification
  - validate_hierarchy() catches invalid configurations
  - InterTeamProtocol assignment
"""
import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from dissertation.hierarchy.team import (
    AgentRole, Team, HierarchicalAgent, InterTeamProtocol,
)
from dissertation.hierarchy.hierarchical_graph import HierarchicalWorkFlowGraph


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_agent(name: str, role: AgentRole = AgentRole.WORKER) -> HierarchicalAgent:
    return HierarchicalAgent(
        name=name,
        description=f"{name} agent",
        role=role,
        is_human=True,
    )


def make_team(team_id: str, n_workers: int = 2) -> Team:
    supervisor = make_agent(f"Sup_{team_id}", role=AgentRole.SUPERVISOR)
    workers = [make_agent(f"W_{team_id}_{i}") for i in range(n_workers)]
    return Team(
        team_id=team_id,
        name=f"Team {team_id}",
        supervisor=supervisor,
        workers=workers,
    )


INPUTS = [{"name": "question", "type": "str", "description": "Input question"}]
OUTPUTS = [{"name": "answer", "type": "str", "description": "Final answer"}]


# ---------------------------------------------------------------------------
# HierarchicalWorkFlowGraph construction
# ---------------------------------------------------------------------------

class TestHierarchicalWorkFlowGraphConstruction:
    def test_single_team_graph(self):
        team = make_team("t1")
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="Answer a question",
            teams=[team],
            inputs=INPUTS,
            outputs=OUTPUTS,
        )
        assert len(graph.nodes) == 1
        assert len(graph.teams) == 1
        assert len(graph.edges) == 0   # no edges for single team

    def test_two_team_graph_has_edge(self):
        t1, t2 = make_team("t1"), make_team("t2")
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="Two-step task",
            teams=[t1, t2],
            inputs=INPUTS,
            outputs=OUTPUTS,
        )
        assert len(graph.nodes) == 2
        assert len(graph.edges) == 1
        assert graph.edges[0].source == "team_t1"
        assert graph.edges[0].target == "team_t2"

    def test_node_names_use_team_id(self):
        team = make_team("research")
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="Research task",
            teams=[team],
            inputs=INPUTS,
            outputs=OUTPUTS,
        )
        assert graph.get_node("team_research") is not None

    def test_custom_dependencies(self):
        t1, t2, t3 = make_team("t1"), make_team("t2"), make_team("t3")
        # t1 → t3 (skip t2) and t2 → t3
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="Custom dag",
            teams=[t1, t2, t3],
            inputs=INPUTS,
            outputs=OUTPUTS,
            team_dependencies=[("t1", "t3"), ("t2", "t3")],
        )
        assert len(graph.edges) == 2
        targets = {e.target for e in graph.edges}
        assert "team_t3" in targets

    def test_inter_team_protocol_stored(self):
        team = make_team("t1")
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G",
            teams=[team],
            inputs=INPUTS,
            outputs=OUTPUTS,
            inter_team_protocol=InterTeamProtocol.SHARED_CONTEXT,
        )
        assert graph.inter_team_protocol == InterTeamProtocol.SHARED_CONTEXT

    def test_team_graph_populated(self):
        t1, t2 = make_team("t1"), make_team("t2")
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G",
            teams=[t1, t2],
            inputs=INPUTS,
            outputs=OUTPUTS,
        )
        assert "t2" in graph.team_graph["t1"]
        assert graph.team_graph["t2"] == []

    def test_no_teams_raises(self):
        with pytest.raises(ValueError):
            HierarchicalWorkFlowGraph.from_teams(
                goal="G", teams=[], inputs=INPUTS, outputs=OUTPUTS,
            )

    def test_teams_stored_on_graph(self):
        t1, t2 = make_team("t1"), make_team("t2")
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G",
            teams=[t1, t2],
            inputs=INPUTS,
            outputs=OUTPUTS,
        )
        ids = {t.team_id for t in graph.teams}
        assert ids == {"t1", "t2"}


# ---------------------------------------------------------------------------
# Team node identification
# ---------------------------------------------------------------------------

class TestTeamNodeIdentification:
    def _make_graph(self):
        team = make_team("r1")
        return HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )

    def test_is_team_node_true(self):
        graph = self._make_graph()
        assert graph.is_team_node("team_r1") is True

    def test_is_team_node_false_for_unknown(self):
        graph = self._make_graph()
        assert graph.is_team_node("nonexistent_node") is False

    def test_get_team_for_node_returns_team(self):
        graph = self._make_graph()
        team = graph.get_team_for_node("team_r1")
        assert team is not None
        assert team.team_id == "r1"

    def test_get_team_for_node_returns_none_for_unknown(self):
        graph = self._make_graph()
        assert graph.get_team_for_node("ghost") is None

    def test_team_index_populated_after_init(self):
        t1, t2 = make_team("a"), make_team("b")
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[t1, t2], inputs=INPUTS, outputs=OUTPUTS,
        )
        assert graph.get_team_for_node("team_a").team_id == "a"
        assert graph.get_team_for_node("team_b").team_id == "b"


# ---------------------------------------------------------------------------
# Hierarchy validation
# ---------------------------------------------------------------------------

class TestHierarchyValidation:
    def test_valid_single_team_passes(self):
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G",
            teams=[make_team("t1")],
            inputs=INPUTS,
            outputs=OUTPUTS,
        )
        assert graph.validate_hierarchy() is True

    def test_valid_two_team_passes(self):
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G",
            teams=[make_team("t1"), make_team("t2")],
            inputs=INPUTS,
            outputs=OUTPUTS,
        )
        assert graph.validate_hierarchy() is True

    def test_cycle_raises(self):
        # Build a valid linear graph, then inject a cycle into team_graph
        # (EvoAgentX itself rejects cyclic graphs at construction time, so we
        # test validate_hierarchy() by injecting the cycle post-construction)
        t1, t2 = make_team("c1"), make_team("c2")
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G",
            teams=[t1, t2],
            inputs=INPUTS,
            outputs=OUTPUTS,
        )
        # Inject a back-edge to create a cycle: c1 → c2 → c1
        graph.team_graph["c2"].append("c1")
        with pytest.raises(ValueError, match="Circular"):
            graph.validate_hierarchy()

    def test_no_supervisor_raises(self):
        team = make_team("ns")
        # Corrupt the supervisor reference to None to test the check
        graph = HierarchicalWorkFlowGraph.from_teams(
            goal="G", teams=[team], inputs=INPUTS, outputs=OUTPUTS,
        )
        # Directly patch for the test
        graph.teams[0].supervisor = None
        with pytest.raises(ValueError):
            graph.validate_hierarchy()

    def test_duplicate_workers_across_teams_raises(self):
        # Create two teams that share a worker name
        sup1 = make_agent("Sup1", role=AgentRole.SUPERVISOR)
        sup2 = make_agent("Sup2", role=AgentRole.SUPERVISOR)
        shared_worker = make_agent("SharedWorker")
        t1 = Team(team_id="t1", name="T1", supervisor=sup1, workers=[shared_worker])
        t2 = Team(team_id="t2", name="T2", supervisor=sup2,
                  workers=[make_agent("SharedWorker"), make_agent("OtherWorker")])
        # Both teams have a worker named "SharedWorker" — validation should catch it
        graph = HierarchicalWorkFlowGraph(
            goal="G",
            nodes=[],
            teams=[t1, t2],
            team_graph={"t1": [], "t2": []},
        )
        with pytest.raises(ValueError, match="unique"):
            graph.validate_hierarchy()
