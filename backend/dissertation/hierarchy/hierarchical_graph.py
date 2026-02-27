"""
HierarchicalWorkFlowGraph — a WorkFlowGraph where teams are first-class nodes.

Each team occupies one WorkFlowNode in the outer graph. When the execution
engine reaches that node, HierarchicalWorkFlow runs the full
  decompose → delegate → execute workers → review → aggregate
loop and stores the final result as the node output.

Usage:
    graph = HierarchicalWorkFlowGraph.from_teams(
        goal="Answer a multi-hop question",
        teams=[hotpotqa_team],
        inputs=[{"name": "question", ...}, {"name": "context", ...}],
        outputs=[{"name": "answer", ...}],
    )
    workflow = HierarchicalWorkFlow(graph=graph, llm=llm, agent_manager=manager)
    output = workflow.execute(inputs={"question": "...", "context": "..."})
"""
import sys
from pathlib import Path
from typing import List, Optional, Dict

from pydantic import Field

_EVOAGENTX = Path(__file__).parent.parent.parent.parent / "evoAgentX"
if str(_EVOAGENTX) not in sys.path:
    sys.path.insert(0, str(_EVOAGENTX))

from evoagentx.workflow.workflow_graph import WorkFlowGraph, WorkFlowNode, WorkFlowEdge
from evoagentx.core.base_config import Parameter

from dissertation.hierarchy.team import Team, InterTeamProtocol


# Metadata key stored on a WorkFlowNode to mark it as a Team node
_TEAM_NODE_META_KEY = "_hierarchical_team_id"


class HierarchicalWorkFlowGraph(WorkFlowGraph):
    """
    WorkFlowGraph extended to support Team-level nodes.

    Each Team becomes a WorkFlowNode with metadata referencing the Team object.
    The HierarchicalWorkFlow executor detects Team nodes and runs the full
    delegation-review loop instead of a plain agent call.

    Extra attributes:
        teams               — all Team objects managed by this graph
        team_graph          — DAG: team_id → list of downstream team_ids
        inter_team_protocol — how results pass between teams
        root_supervisor     — optional top-level coordinator (used for GAIA)
    """
    teams: List[Team] = Field(default_factory=list)
    team_graph: Dict[str, List[str]] = Field(default_factory=dict)
    inter_team_protocol: InterTeamProtocol = InterTeamProtocol.SUPERVISOR_TO_SUPERVISOR
    root_supervisor: Optional[object] = Field(default=None, exclude=True)

    # Internal index: team_id → Team (populated in init_module)
    _team_index: Dict[str, Team] = {}

    def init_module(self):
        """Build the team index then call parent init."""
        self._team_index = {t.team_id: t for t in self.teams}
        super().init_module()

    # ------------------------------------------------------------------
    # Team-node helpers
    # ------------------------------------------------------------------

    def get_team_for_node(self, node_name: str) -> Optional[Team]:
        """Return the Team associated with a WorkFlowNode, or None."""
        if not self.node_exists(node=node_name):
            return None
        node = self.get_node(node_name)
        # Team nodes store the team_id in their 'reason' field as a tag
        if node.reason and node.reason.startswith(_TEAM_NODE_META_KEY + ":"):
            team_id = node.reason[len(_TEAM_NODE_META_KEY) + 1:]
            return self._team_index.get(team_id)
        return None

    def is_team_node(self, node_name: str) -> bool:
        """Return True if this node represents a Team."""
        return self.get_team_for_node(node_name) is not None

    # ------------------------------------------------------------------
    # Factory — build a graph from a list of Teams
    # ------------------------------------------------------------------

    @classmethod
    def from_teams(
        cls,
        goal: str,
        teams: List[Team],
        inputs: List[dict],
        outputs: List[dict],
        team_dependencies: Optional[List[tuple]] = None,
        inter_team_protocol: InterTeamProtocol = InterTeamProtocol.SUPERVISOR_TO_SUPERVISOR,
        root_supervisor=None,
    ) -> "HierarchicalWorkFlowGraph":
        """
        Build a HierarchicalWorkFlowGraph from a list of Teams.

        Args:
            goal:               High-level objective string
            teams:              List of Team objects (at least one)
            inputs:             Input parameter dicts for the first team node
            outputs:            Output parameter dicts from the last team node
            team_dependencies:  Optional list of (from_team_id, to_team_id) edges
            inter_team_protocol: How results pass between teams
            root_supervisor:    Optional top-level coordinator Agent

        Returns:
            A ready-to-execute HierarchicalWorkFlowGraph
        """
        if not teams:
            raise ValueError("At least one Team is required.")

        nodes = []
        edges = []
        team_graph: Dict[str, List[str]] = {t.team_id: [] for t in teams}

        for i, team in enumerate(teams):
            # Use the 'reason' field to tag the node with team_id
            is_first = (i == 0)
            is_last = (i == len(teams) - 1)

            node_inputs = inputs if is_first else [
                {"name": "team_result", "type": "str",
                 "description": "Input from previous team"}
            ]
            node_outputs = outputs if is_last else [
                {"name": "team_result", "type": "str",
                 "description": "Output to next team"}
            ]

            node = WorkFlowNode(
                name=f"team_{team.team_id}",
                description=f"Team '{team.name}': {team.supervisor.description}",
                inputs=[Parameter(**p) for p in node_inputs],
                outputs=[Parameter(**p) for p in node_outputs],
                agents=team.all_agents(),
                reason=f"{_TEAM_NODE_META_KEY}:{team.team_id}",
            )
            nodes.append(node)

        # Build sequential edges between consecutive teams by default
        dep_pairs = team_dependencies or [
            (teams[i].team_id, teams[i + 1].team_id)
            for i in range(len(teams) - 1)
        ]
        for from_id, to_id in dep_pairs:
            from_name = f"team_{from_id}"
            to_name = f"team_{to_id}"
            edge = WorkFlowEdge(
                source=from_name,
                target=to_name,
            )
            edges.append(edge)
            team_graph[from_id].append(to_id)

        graph = cls(
            goal=goal,
            nodes=nodes,
            edges=edges,
            teams=teams,
            team_graph=team_graph,
            inter_team_protocol=inter_team_protocol,
            root_supervisor=root_supervisor,
        )
        return graph

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate_hierarchy(self) -> bool:
        """
        Validate the hierarchical structure.
        Returns True if valid, raises ValueError otherwise.
        """
        # Every team must have exactly one supervisor
        for team in self.teams:
            if team.supervisor is None:
                raise ValueError(f"Team '{team.team_id}' has no supervisor.")

        # No circular team dependencies
        visited = set()
        rec_stack = set()

        def has_cycle(node_id: str) -> bool:
            visited.add(node_id)
            rec_stack.add(node_id)
            for neighbor in self.team_graph.get(node_id, []):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            rec_stack.discard(node_id)
            return False

        for team_id in self.team_graph:
            if team_id not in visited:
                if has_cycle(team_id):
                    raise ValueError(
                        f"Circular dependency detected in team_graph involving team '{team_id}'."
                    )

        # Workers must be unique across the whole graph (no shared workers)
        all_worker_names = []
        for team in self.teams:
            all_worker_names.extend(w.name for w in team.workers)
        if len(all_worker_names) != len(set(all_worker_names)):
            raise ValueError("Workers must have unique names across all teams.")

        return True
