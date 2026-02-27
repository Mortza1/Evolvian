"""
Core data models for hierarchical team orchestration.

New classes:
  - AgentRole            — enum: supervisor | worker | reviewer | specialist
  - DelegationStrategy   — enum: round_robin | capability_match | load_balance | supervisor_decides
  - DelegationPolicy     — how a supervisor assigns subtasks to workers
  - EscalationAction     — enum: escalate_to_supervisor | retry_with_different_worker | ...
  - EscalationRule       — condition + action when a worker output is unsatisfactory
  - ReviewMode           — enum: none | supervisor_reviews_all | supervisor_reviews_on_flag | peer_review
  - Team                 — supervisor + workers + scope + policies
  - HierarchicalAgent    — Agent subclass with role, team_id, authority_scope
  - HierarchicalAgentManager — AgentManager subclass with team-aware lookup methods
"""
import sys
import threading
from enum import Enum
from pathlib import Path
from typing import List, Optional, Dict, Any

from pydantic import Field, model_validator

# Ensure evoAgentX importable
_EVOAGENTX = Path(__file__).parent.parent.parent.parent / "evoAgentX"
if str(_EVOAGENTX) not in sys.path:
    sys.path.insert(0, str(_EVOAGENTX))

from evoagentx.agents.agent import Agent
from evoagentx.agents.agent_manager import AgentManager, AgentState
from evoagentx.core.module import BaseModule


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class AgentRole(str, Enum):
    SUPERVISOR = "supervisor"
    WORKER = "worker"
    REVIEWER = "reviewer"
    SPECIALIST = "specialist"


class DelegationStrategy(str, Enum):
    ROUND_ROBIN = "round_robin"
    CAPABILITY_MATCH = "capability_match"
    LOAD_BALANCE = "load_balance"
    SUPERVISOR_DECIDES = "supervisor_decides"


class EscalationAction(str, Enum):
    ESCALATE_TO_SUPERVISOR = "escalate_to_supervisor"
    RETRY_WITH_DIFFERENT_WORKER = "retry_with_different_worker"
    REQUEST_HUMAN_INPUT = "request_human_input"
    FAIL_TASK = "fail_task"


class ReviewMode(str, Enum):
    NONE = "none"
    SUPERVISOR_REVIEWS_ALL = "supervisor_reviews_all"
    SUPERVISOR_REVIEWS_ON_FLAG = "supervisor_reviews_on_flag"
    PEER_REVIEW = "peer_review"


class InterTeamProtocol(str, Enum):
    SUPERVISOR_TO_SUPERVISOR = "supervisor_to_supervisor"
    DIRECT_HANDOFF = "direct_handoff"
    SHARED_CONTEXT = "shared_context"


# ---------------------------------------------------------------------------
# DelegationPolicy
# ---------------------------------------------------------------------------

class DelegationPolicy(BaseModule):
    """
    Rules for how a supervisor assigns subtasks to workers.

    strategy:
        round_robin         — cycle through workers in order
        capability_match    — match subtask required_skills to worker description/scope
        load_balance        — assign to the worker with the fewest in-flight tasks
        supervisor_decides  — the supervisor LLM picks the worker per subtask
    """
    strategy: DelegationStrategy = DelegationStrategy.CAPABILITY_MATCH
    max_concurrent_per_worker: int = Field(default=1, ge=1)
    require_supervisor_decomposition: bool = True
    allow_worker_to_worker: bool = False


# ---------------------------------------------------------------------------
# EscalationRule
# ---------------------------------------------------------------------------

class EscalationRule(BaseModule):
    """
    A condition-action pair: when `condition` is detected in a worker's output,
    take `action`. The condition is evaluated by the supervisor LLM.

    Example conditions:
        "confidence < 0.5"
        "output is empty or too short"
        "answer contains contradiction"
        "error_count > 2"
    """
    condition: str
    action: EscalationAction = EscalationAction.ESCALATE_TO_SUPERVISOR
    max_retries: int = Field(default=2, ge=0)


# ---------------------------------------------------------------------------
# Team
# ---------------------------------------------------------------------------

class Team(BaseModule):
    """
    A hierarchical organizational unit: one supervisor + one or more workers.

    The supervisor:
      1. Receives the task
      2. Decomposes it into subtasks (if require_supervisor_decomposition=True)
      3. Delegates subtasks to workers via DelegationPolicy
      4. Checks escalation conditions on worker outputs
      5. Reviews outputs according to ReviewMode
      6. Aggregates outputs into a final team result

    Attributes:
        team_id:            Unique string identifier
        name:               Human-readable name (e.g. "Research Team")
        supervisor:         The Agent that manages this team
        workers:            Agents that execute subtasks
        scope:              Task types / skills this team handles (for routing)
        delegation_policy:  How the supervisor assigns subtasks
        escalation_rules:   Conditions under which workers escalate
        review_mode:        How (or whether) the supervisor reviews outputs
    """
    team_id: str
    name: str
    supervisor: Agent
    workers: List[Agent] = Field(default_factory=list)
    scope: List[str] = Field(default_factory=list)
    delegation_policy: DelegationPolicy = Field(default_factory=DelegationPolicy)
    escalation_rules: List[EscalationRule] = Field(default_factory=list)
    review_mode: ReviewMode = ReviewMode.SUPERVISOR_REVIEWS_ALL

    @model_validator(mode="after")
    def validate_team(self) -> "Team":
        if not self.workers:
            raise ValueError(f"Team '{self.team_id}' must have at least one worker.")
        worker_names = [w.name for w in self.workers]
        if self.supervisor.name in worker_names:
            raise ValueError(
                f"Supervisor '{self.supervisor.name}' cannot also be a worker in the same team."
            )
        if len(worker_names) != len(set(worker_names)):
            raise ValueError(f"Worker names in team '{self.team_id}' must be unique.")
        return self

    def all_agents(self) -> List[Agent]:
        """Return supervisor + all workers."""
        return [self.supervisor] + self.workers

    def get_worker(self, name: str) -> Optional[Agent]:
        """Look up a worker by name."""
        for w in self.workers:
            if w.name == name:
                return w
        return None


# ---------------------------------------------------------------------------
# HierarchicalAgent
# ---------------------------------------------------------------------------

class HierarchicalAgent(Agent):
    """
    An Agent extended with role and team awareness for hierarchical workflows.

    Extra fields:
        role:            This agent's role in its team
        team_id:         Which team this agent belongs to (None if unassigned)
        authority_scope: Task types / skills this agent can handle
                         (used for capability_match delegation)

    Fully backward-compatible: can be used anywhere a plain Agent is expected.
    """
    role: AgentRole = AgentRole.WORKER
    team_id: Optional[str] = None
    authority_scope: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# HierarchicalAgentManager
# ---------------------------------------------------------------------------

class HierarchicalAgentManager(AgentManager):
    """
    AgentManager extended with team-aware lookup and assignment methods.

    Adds:
        teams:              List of Team objects managed by this instance
        get_team()          — look up a Team by team_id
        get_supervisor()    — get the supervisor Agent for a team
        get_workers()       — get all worker Agents for a team
        assign_to_team()    — assign an agent to a team with a given role
        get_agents_by_scope() — find agents whose authority_scope covers a task type
    """
    teams: List[Team] = Field(default_factory=list)
    _team_map: Dict[str, Team] = {}

    def init_module(self):
        """Called by BaseModule after __init__. Set up the team index and lock."""
        super().init_module()
        self._team_map = {t.team_id: t for t in self.teams}

    # -- Team lookup ----------------------------------------------------------

    def get_team(self, team_id: str) -> Optional[Team]:
        """Return the Team with the given team_id, or None."""
        return self._team_map.get(team_id)

    def get_supervisor(self, team_id: str) -> Optional[Agent]:
        """Return the supervisor Agent for the given team, or None."""
        team = self.get_team(team_id)
        return team.supervisor if team else None

    def get_workers(self, team_id: str) -> List[Agent]:
        """Return all worker Agents for the given team."""
        team = self.get_team(team_id)
        return team.workers if team else []

    # -- Team assignment -------------------------------------------------------

    def add_team(self, team: Team):
        """Register a new team and ensure all its agents are tracked."""
        if team.team_id in self._team_map:
            raise ValueError(f"Team '{team.team_id}' already registered.")
        self.teams.append(team)
        self._team_map[team.team_id] = team
        # Register any new agents
        existing = {a.name for a in self.agents}
        for agent in team.all_agents():
            if agent.name not in existing:
                self.agents.append(agent)
                self.agent_states[agent.name] = AgentState.AVAILABLE
                if not hasattr(self, '_state_conditions'):
                    self._state_conditions = {}
                self._state_conditions[agent.name] = threading.Condition()

    def assign_to_team(self, agent: Agent, team_id: str, role: AgentRole):
        """
        Assign an existing agent to a team with the given role.
        Only works for HierarchicalAgent instances.
        """
        if not isinstance(agent, HierarchicalAgent):
            raise TypeError(
                f"Only HierarchicalAgent can be assigned to a team, got {type(agent).__name__}"
            )
        team = self.get_team(team_id)
        if team is None:
            raise ValueError(f"Team '{team_id}' not found.")
        agent.team_id = team_id
        agent.role = role

    # -- Scope-based lookup ---------------------------------------------------

    def get_agents_by_scope(self, task_type: str) -> List[Agent]:
        """
        Return all HierarchicalAgents whose authority_scope includes task_type.
        Falls back to partial string matching if exact match fails.
        """
        result = []
        for agent in self.agents:
            if isinstance(agent, HierarchicalAgent) and agent.authority_scope:
                if task_type in agent.authority_scope:
                    result.append(agent)
                elif any(task_type.lower() in s.lower() for s in agent.authority_scope):
                    result.append(agent)
        return result
