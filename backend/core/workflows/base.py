"""
Evolvian Workflow Base Classes

Simplified workflow primitives adapted from EvoAgentX.
These provide the foundation for task decomposition and execution.
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone


class WorkflowNodeStatus(str, Enum):
    """Status of a workflow node"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class WorkflowNode:
    """
    A single step in a workflow.

    Simplified from EvoAgentX WorkFlowNode - focuses on:
    - What needs to be done (name, description)
    - Who does it (agent_role, assigned_agent)
    - Data flow (inputs, outputs)
    - Dependencies (depends_on)
    """
    id: str
    name: str
    description: str
    agent_role: str  # Type of agent needed (e.g., "Research Specialist")

    # Data flow
    inputs: List[str] = field(default_factory=list)
    outputs: List[str] = field(default_factory=list)

    # Dependencies - IDs of nodes that must complete first
    depends_on: List[str] = field(default_factory=list)

    # Execution state
    status: WorkflowNodeStatus = WorkflowNodeStatus.PENDING
    assigned_agent: Optional[str] = None  # Agent name once assigned

    # Results
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def mark_running(self, agent_name: str = None):
        """Mark node as running"""
        self.status = WorkflowNodeStatus.RUNNING
        self.started_at = datetime.now(timezone.utc)
        if agent_name:
            self.assigned_agent = agent_name

    def mark_completed(self, result: Dict[str, Any] = None):
        """Mark node as completed with result"""
        self.status = WorkflowNodeStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        self.result = result or {}

    def mark_failed(self, error: str):
        """Mark node as failed with error"""
        self.status = WorkflowNodeStatus.FAILED
        self.completed_at = datetime.now(timezone.utc)
        self.error = error

    @property
    def is_complete(self) -> bool:
        return self.status in (WorkflowNodeStatus.COMPLETED, WorkflowNodeStatus.FAILED, WorkflowNodeStatus.SKIPPED)

    @property
    def duration_seconds(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "agent_role": self.agent_role,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "depends_on": self.depends_on,
            "status": self.status.value,
            "assigned_agent": self.assigned_agent,
            "result": self.result,
            "error": self.error,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


@dataclass
class WorkflowGraph:
    """
    A directed acyclic graph of workflow nodes.

    Simplified from EvoAgentX WorkFlowGraph - handles:
    - Node management
    - Dependency tracking
    - Execution ordering
    """
    goal: str
    nodes: List[WorkflowNode] = field(default_factory=list)

    # Execution context - data passed between nodes
    context: Dict[str, Any] = field(default_factory=dict)

    def add_node(self, node: WorkflowNode):
        """Add a node to the graph"""
        self.nodes.append(node)

    def get_node(self, node_id: str) -> Optional[WorkflowNode]:
        """Get a node by ID"""
        for node in self.nodes:
            if node.id == node_id:
                return node
        return None

    def get_initial_nodes(self) -> List[WorkflowNode]:
        """Get nodes with no dependencies (starting points)"""
        return [n for n in self.nodes if not n.depends_on]

    def get_ready_nodes(self) -> List[WorkflowNode]:
        """Get nodes that are ready to execute (dependencies complete)"""
        ready = []
        for node in self.nodes:
            if node.status != WorkflowNodeStatus.PENDING:
                continue

            # Check if all dependencies are complete
            deps_complete = True
            for dep_id in node.depends_on:
                dep_node = self.get_node(dep_id)
                if dep_node and not dep_node.is_complete:
                    deps_complete = False
                    break
                # If dependency failed, skip this node
                if dep_node and dep_node.status == WorkflowNodeStatus.FAILED:
                    node.status = WorkflowNodeStatus.SKIPPED
                    deps_complete = False
                    break

            if deps_complete:
                ready.append(node)

        return ready

    def get_next_node(self) -> Optional[WorkflowNode]:
        """Get the next node to execute"""
        ready = self.get_ready_nodes()
        return ready[0] if ready else None

    @property
    def is_complete(self) -> bool:
        """Check if all nodes are complete"""
        return all(n.is_complete for n in self.nodes)

    @property
    def has_failed(self) -> bool:
        """Check if any node failed"""
        return any(n.status == WorkflowNodeStatus.FAILED for n in self.nodes)

    def get_completed_outputs(self) -> Dict[str, Any]:
        """Get all outputs from completed nodes"""
        outputs = {}
        for node in self.nodes:
            if node.status == WorkflowNodeStatus.COMPLETED and node.result:
                outputs[node.id] = node.result
        return outputs

    def get_final_output(self) -> Any:
        """Get output from the last completed node"""
        # Find nodes with no dependents (end nodes)
        node_ids = {n.id for n in self.nodes}
        dependent_ids = set()
        for node in self.nodes:
            dependent_ids.update(node.depends_on)

        end_node_ids = node_ids - dependent_ids

        # Get results from end nodes
        for node in self.nodes:
            if node.id in end_node_ids and node.status == WorkflowNodeStatus.COMPLETED:
                return node.result

        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "goal": self.goal,
            "nodes": [n.to_dict() for n in self.nodes],
            "context": self.context,
            "is_complete": self.is_complete,
            "has_failed": self.has_failed,
        }

    @classmethod
    def from_workflow_dict(cls, workflow: Dict[str, Any]) -> "WorkflowGraph":
        """
        Create a WorkflowGraph from Evo's workflow JSON output.

        Expected format from evo_service.suggest_workflow():
        {
            "title": "...",
            "description": "...",
            "steps": [
                {"id": "1", "name": "...", "agent_role": "...", "inputs": [...], "outputs": [...], "depends_on": [...]}
            ]
        }
        """
        goal = workflow.get("description", workflow.get("title", "Execute workflow"))

        graph = cls(goal=goal)

        for step in workflow.get("steps", []):
            node = WorkflowNode(
                id=str(step.get("id", "")),
                name=step.get("name", "Step"),
                description=step.get("description", ""),
                agent_role=step.get("agent_role", "General"),
                inputs=step.get("inputs", []),
                outputs=step.get("outputs", []),
                depends_on=[str(d) for d in step.get("depends_on", [])],
            )
            graph.add_node(node)

        return graph


class EvolvianWorkflow:
    """
    The main workflow execution class.

    Simplified from EvoAgentX WorkFlow - provides:
    - Sequential/DAG execution of nodes
    - Agent assignment and execution
    - Context passing between nodes
    """

    def __init__(
        self,
        graph: WorkflowGraph,
        agent_registry: Any = None,  # AGENT_REGISTRY
        agent_service: Any = None,   # AgentService for execution
    ):
        self.graph = graph
        self.agent_registry = agent_registry
        self.agent_service = agent_service

        # Execution metadata
        self.workflow_id: Optional[str] = None
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.status: str = "pending"

    def execute(self, inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute the workflow synchronously.

        Args:
            inputs: Initial inputs to the workflow

        Returns:
            Dict with execution result and metadata
        """
        self.started_at = datetime.now(timezone.utc)
        self.status = "running"

        # Initialize context with inputs
        if inputs:
            self.graph.context.update(inputs)

        try:
            # Execute nodes in dependency order
            while not self.graph.is_complete:
                node = self.graph.get_next_node()

                if not node:
                    # No more nodes ready - check for circular deps or all complete
                    if self.graph.is_complete:
                        break
                    # Stuck - possibly circular dependency
                    self.status = "failed"
                    return {
                        "success": False,
                        "error": "Workflow stuck - possible circular dependency",
                        "graph": self.graph.to_dict(),
                    }

                # Execute the node
                self._execute_node(node)

                # Stop if node failed (unless we want to continue on failure)
                if node.status == WorkflowNodeStatus.FAILED:
                    self.status = "failed"
                    break

            self.completed_at = datetime.now(timezone.utc)
            self.status = "completed" if not self.graph.has_failed else "failed"

            return {
                "success": not self.graph.has_failed,
                "output": self.graph.get_final_output(),
                "all_outputs": self.graph.get_completed_outputs(),
                "graph": self.graph.to_dict(),
                "duration_seconds": (self.completed_at - self.started_at).total_seconds(),
            }

        except Exception as e:
            self.status = "failed"
            self.completed_at = datetime.now(timezone.utc)
            return {
                "success": False,
                "error": str(e),
                "graph": self.graph.to_dict(),
            }

    def _execute_node(self, node: WorkflowNode):
        """Execute a single workflow node"""
        # Find an agent for this role
        agent = self._find_agent_for_role(node.agent_role)
        agent_name = agent.name if agent else "System"

        node.mark_running(agent_name)

        try:
            # Gather inputs from context
            node_inputs = {}
            for input_key in node.inputs:
                if input_key in self.graph.context:
                    node_inputs[input_key] = self.graph.context[input_key]

            # Execute via agent or fallback
            if agent and self.agent_service:
                # Use agent service to execute
                result = self.agent_service.execute_simple(
                    agent=agent,
                    task=node.description,
                    context=node_inputs
                )
                output = {"output": result, "agent": agent_name}
            elif agent:
                # Direct agent execution
                result = agent.execute_simple(node.description)
                output = {"output": result, "agent": agent_name}
            else:
                # No agent available - just pass through
                output = {"output": f"[No agent for {node.agent_role}] {node.description}", "agent": "System"}

            # Store outputs in context
            for output_key in node.outputs:
                self.graph.context[output_key] = output.get("output", "")

            node.mark_completed(output)

        except Exception as e:
            node.mark_failed(str(e))

    def _find_agent_for_role(self, role: str) -> Any:
        """Find an agent that matches the required role"""
        if not self.agent_registry:
            return None

        # Try to find by role match
        role_lower = role.lower()

        # Get all available agents from registry
        for template_id, template in self.agent_registry._templates.items():
            if role_lower in template.role.lower() or role_lower in template.specialty.lower():
                # Create an instance from template
                return self.agent_registry.create_from_template(template_id)

        # No match found - try to find any available agent
        templates = list(self.agent_registry._templates.keys())
        if templates:
            return self.agent_registry.create_from_template(templates[0])

        return None
