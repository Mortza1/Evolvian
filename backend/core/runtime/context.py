"""
ExecutionContext - The stateful execution environment.

Every operation runs inside an ExecutionContext. This is why agents
currently feel stateless - they don't have access to this context.

The context holds:
- Operation and team identity
- Memory (operation-scoped state)
- Agent states (outputs from each agent)
- Tool states (tool execution results)
- Metrics (cost, latency, quality tracking)
- Assumptions (questions asked during execution)
- Knowledge context (relevant knowledge nodes)

The context is serializable for pause/resume checkpointing.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import json
import hashlib


@dataclass
class NodeMetrics:
    """Metrics for a single workflow node execution."""
    node_id: str
    agent_name: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    latency_ms: int = 0
    cost: float = 0.0
    tokens_used: int = 0
    success: bool = False
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "NodeMetrics":
        return cls(**data)


@dataclass
class AgentState:
    """State of an agent within an execution context."""
    agent_id: int
    agent_name: str
    role: str
    output: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    tokens_used: int = 0
    cost: float = 0.0
    xp_earned: int = 0

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "AgentState":
        return cls(**data)


@dataclass
class ToolState:
    """State of a tool execution within the context."""
    tool_id: str
    tool_name: str
    input_data: Any = None
    output_data: Any = None
    executed_at: Optional[str] = None
    latency_ms: int = 0
    cost: float = 0.0
    success: bool = False
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "ToolState":
        return cls(**data)


@dataclass
class ExecutionMetrics:
    """Aggregate metrics for the entire execution."""
    total_cost: float = 0.0
    total_latency_ms: int = 0
    total_tokens: int = 0
    nodes_completed: int = 0
    nodes_failed: int = 0
    nodes_total: int = 0
    quality_score: Optional[float] = None  # 0.0 - 1.0, set by evaluator

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "ExecutionMetrics":
        return cls(**data)


class ExecutionContext:
    """
    The stateful execution environment for an operation.

    Every operation MUST run inside an ExecutionContext.
    This context is passed to every agent execution.

    Usage:
        context = ExecutionContext(operation_id=1, team_id=1)

        # During execution, agents write to context
        context.set_agent_state("researcher", AgentState(...))
        context.add_to_memory("task_goal", "Analyze market trends")

        # Other agents can read previous outputs
        prev_output = context.get_agent_output("researcher")

        # For pause/resume, serialize and restore
        checkpoint = context.to_checkpoint()
        # ... later ...
        context = ExecutionContext.from_checkpoint(checkpoint)
    """

    def __init__(
        self,
        operation_id: int,
        team_id: int,
        workflow_signature: Optional[str] = None,
    ):
        self.operation_id = operation_id
        self.team_id = team_id
        self.workflow_signature = workflow_signature

        # Core state containers
        self.memory: Dict[str, Any] = {}  # Operation-scoped key-value store
        self.agent_states: Dict[str, AgentState] = {}  # agent_name -> state
        self.tool_states: List[ToolState] = []  # Tool execution history
        self.node_metrics: Dict[str, NodeMetrics] = {}  # node_id -> metrics

        # Aggregate metrics
        self.metrics = ExecutionMetrics()

        # Assumptions raised during execution
        self.assumptions: List[Dict[str, Any]] = []

        # Knowledge context - relevant nodes from team's knowledge graph
        self.knowledge_context: List[Dict[str, Any]] = []

        # Execution tracking
        self.current_node_index: int = 0
        self.completed_node_ids: List[str] = []
        self.status: str = "initialized"  # initialized, running, paused, completed, failed

        # Timestamps
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.started_at: Optional[str] = None
        self.paused_at: Optional[str] = None
        self.completed_at: Optional[str] = None

    # ==================== Memory Operations ====================

    def add_to_memory(self, key: str, value: Any) -> None:
        """Store a value in operation-scoped memory."""
        self.memory[key] = value

    def get_from_memory(self, key: str, default: Any = None) -> Any:
        """Retrieve a value from operation-scoped memory."""
        return self.memory.get(key, default)

    def has_in_memory(self, key: str) -> bool:
        """Check if a key exists in memory."""
        return key in self.memory

    # ==================== Agent State Operations ====================

    def set_agent_state(self, agent_name: str, state: AgentState) -> None:
        """Record an agent's execution state."""
        self.agent_states[agent_name] = state
        # Update aggregate metrics
        self.metrics.total_cost += state.cost
        self.metrics.total_tokens += state.tokens_used

    def get_agent_state(self, agent_name: str) -> Optional[AgentState]:
        """Get an agent's execution state."""
        return self.agent_states.get(agent_name)

    def get_agent_output(self, agent_name: str) -> Optional[str]:
        """Convenience method to get just the output from an agent."""
        state = self.agent_states.get(agent_name)
        return state.output if state else None

    def get_all_agent_outputs(self) -> Dict[str, str]:
        """Get all agent outputs as a dict."""
        return {
            name: state.output
            for name, state in self.agent_states.items()
            if state.output
        }

    # ==================== Tool State Operations ====================

    def add_tool_execution(self, tool_state: ToolState) -> None:
        """Record a tool execution."""
        self.tool_states.append(tool_state)
        self.metrics.total_cost += tool_state.cost

    def get_tool_executions(self, tool_name: Optional[str] = None) -> List[ToolState]:
        """Get tool executions, optionally filtered by tool name."""
        if tool_name:
            return [t for t in self.tool_states if t.tool_name == tool_name]
        return self.tool_states

    # ==================== Node Metrics Operations ====================

    def start_node(self, node_id: str, agent_name: str) -> NodeMetrics:
        """Mark a node as started, create its metrics."""
        metrics = NodeMetrics(
            node_id=node_id,
            agent_name=agent_name,
            started_at=datetime.now(timezone.utc).isoformat()
        )
        self.node_metrics[node_id] = metrics
        return metrics

    def complete_node(
        self,
        node_id: str,
        success: bool = True,
        cost: float = 0.0,
        tokens_used: int = 0,
        error: Optional[str] = None
    ) -> None:
        """Mark a node as completed, update its metrics."""
        if node_id not in self.node_metrics:
            return

        metrics = self.node_metrics[node_id]
        metrics.completed_at = datetime.now(timezone.utc).isoformat()
        metrics.success = success
        metrics.cost = cost
        metrics.tokens_used = tokens_used
        metrics.error = error

        # Calculate latency
        if metrics.started_at:
            start = datetime.fromisoformat(metrics.started_at)
            end = datetime.fromisoformat(metrics.completed_at)
            metrics.latency_ms = int((end - start).total_seconds() * 1000)

        # Update aggregate metrics
        self.metrics.total_cost += cost
        self.metrics.total_tokens += tokens_used
        self.metrics.total_latency_ms += metrics.latency_ms

        if success:
            self.metrics.nodes_completed += 1
            self.completed_node_ids.append(node_id)
        else:
            self.metrics.nodes_failed += 1

    # ==================== Assumptions Operations ====================

    def raise_assumption(
        self,
        question: str,
        context: str = "",
        options: List[str] = None,
        priority: str = "normal"
    ) -> Dict[str, Any]:
        """
        Raise an assumption instead of hallucinating.
        Returns the assumption dict so it can be stored in the database.
        """
        assumption = {
            "question": question,
            "context": context,
            "options": options or [],
            "priority": priority,
            "raised_at": datetime.now(timezone.utc).isoformat(),
            "answered": False,
            "answer": None
        }
        self.assumptions.append(assumption)
        return assumption

    def answer_assumption(self, index: int, answer: str) -> bool:
        """Answer an assumption by index."""
        if 0 <= index < len(self.assumptions):
            self.assumptions[index]["answered"] = True
            self.assumptions[index]["answer"] = answer
            return True
        return False

    def get_unanswered_assumptions(self) -> List[Dict[str, Any]]:
        """Get all unanswered assumptions."""
        return [a for a in self.assumptions if not a["answered"]]

    # ==================== Knowledge Context Operations ====================

    def add_knowledge_context(self, nodes: List[Dict[str, Any]]) -> None:
        """Add knowledge nodes to the context."""
        self.knowledge_context.extend(nodes)

    def get_knowledge_context(self, node_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get knowledge context, optionally filtered by type."""
        if node_type:
            return [n for n in self.knowledge_context if n.get("node_type") == node_type]
        return self.knowledge_context

    # ==================== Execution Control ====================

    def start(self, total_nodes: int = 0) -> None:
        """Mark execution as started."""
        self.status = "running"
        self.started_at = datetime.now(timezone.utc).isoformat()
        self.metrics.nodes_total = total_nodes

    def pause(self) -> None:
        """Mark execution as paused."""
        self.status = "paused"
        self.paused_at = datetime.now(timezone.utc).isoformat()

    def resume(self) -> None:
        """Mark execution as resumed."""
        self.status = "running"
        self.paused_at = None

    def complete(self, success: bool = True) -> None:
        """Mark execution as completed."""
        self.status = "completed" if success else "failed"
        self.completed_at = datetime.now(timezone.utc).isoformat()

    def advance_node(self) -> None:
        """Advance to the next node."""
        self.current_node_index += 1

    # ==================== Serialization (for pause/resume) ====================

    def to_checkpoint(self) -> dict:
        """
        Serialize the context to a checkpoint dict.
        Used for pause/resume functionality.
        """
        return {
            "operation_id": self.operation_id,
            "team_id": self.team_id,
            "workflow_signature": self.workflow_signature,
            "memory": self.memory,
            "agent_states": {
                name: state.to_dict()
                for name, state in self.agent_states.items()
            },
            "tool_states": [t.to_dict() for t in self.tool_states],
            "node_metrics": {
                node_id: metrics.to_dict()
                for node_id, metrics in self.node_metrics.items()
            },
            "metrics": self.metrics.to_dict(),
            "assumptions": self.assumptions,
            "knowledge_context": self.knowledge_context,
            "current_node_index": self.current_node_index,
            "completed_node_ids": self.completed_node_ids,
            "status": self.status,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "paused_at": self.paused_at,
            "completed_at": self.completed_at,
        }

    @classmethod
    def from_checkpoint(cls, checkpoint: dict) -> "ExecutionContext":
        """
        Restore a context from a checkpoint dict.
        Used for resume functionality.
        """
        context = cls(
            operation_id=checkpoint["operation_id"],
            team_id=checkpoint["team_id"],
            workflow_signature=checkpoint.get("workflow_signature"),
        )

        context.memory = checkpoint.get("memory", {})
        context.agent_states = {
            name: AgentState.from_dict(state_dict)
            for name, state_dict in checkpoint.get("agent_states", {}).items()
        }
        context.tool_states = [
            ToolState.from_dict(t) for t in checkpoint.get("tool_states", [])
        ]
        context.node_metrics = {
            node_id: NodeMetrics.from_dict(metrics_dict)
            for node_id, metrics_dict in checkpoint.get("node_metrics", {}).items()
        }
        context.metrics = ExecutionMetrics.from_dict(
            checkpoint.get("metrics", {})
        )
        context.assumptions = checkpoint.get("assumptions", [])
        context.knowledge_context = checkpoint.get("knowledge_context", [])
        context.current_node_index = checkpoint.get("current_node_index", 0)
        context.completed_node_ids = checkpoint.get("completed_node_ids", [])
        context.status = checkpoint.get("status", "initialized")
        context.created_at = checkpoint.get("created_at")
        context.started_at = checkpoint.get("started_at")
        context.paused_at = checkpoint.get("paused_at")
        context.completed_at = checkpoint.get("completed_at")

        return context

    def to_json(self) -> str:
        """Serialize to JSON string."""
        return json.dumps(self.to_checkpoint(), indent=2)

    @classmethod
    def from_json(cls, json_str: str) -> "ExecutionContext":
        """Restore from JSON string."""
        return cls.from_checkpoint(json.loads(json_str))

    # ==================== Workflow DNA ====================

    def compute_workflow_signature(
        self,
        agents: List[str],
        prompts: Dict[str, str] = None,
        tools: Dict[str, List[str]] = None
    ) -> str:
        """
        Compute a hash signature for the workflow configuration.
        Used to identify unique workflow patterns for evolution.
        """
        dna = {
            "agents": sorted(agents),
            "prompts": prompts or {},
            "tools": tools or {},
        }
        dna_str = json.dumps(dna, sort_keys=True)
        signature = hashlib.sha256(dna_str.encode()).hexdigest()[:16]
        self.workflow_signature = signature
        return signature

    # ==================== Summary ====================

    def get_summary(self) -> dict:
        """Get a summary of the execution context."""
        return {
            "operation_id": self.operation_id,
            "team_id": self.team_id,
            "status": self.status,
            "workflow_signature": self.workflow_signature,
            "nodes_completed": self.metrics.nodes_completed,
            "nodes_total": self.metrics.nodes_total,
            "total_cost": self.metrics.total_cost,
            "total_latency_ms": self.metrics.total_latency_ms,
            "agents_involved": list(self.agent_states.keys()),
            "tools_used": len(self.tool_states),
            "assumptions_raised": len(self.assumptions),
            "assumptions_answered": len([a for a in self.assumptions if a["answered"]]),
        }

    def __repr__(self) -> str:
        return (
            f"ExecutionContext(operation_id={self.operation_id}, "
            f"team_id={self.team_id}, status={self.status}, "
            f"nodes={self.metrics.nodes_completed}/{self.metrics.nodes_total})"
        )
