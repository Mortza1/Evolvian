"""
Evolvian Workflow Executor

Runs workflows by coordinating agent execution.
Handles sequential and parallel execution patterns.
"""

import asyncio
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timezone
from dataclasses import dataclass, field
import uuid

from .base import (
    WorkflowGraph,
    WorkflowNode,
    WorkflowNodeStatus,
    EvolvianWorkflow,
)


@dataclass
class ExecutionResult:
    """Result of a workflow execution"""
    success: bool
    workflow_id: str
    output: Any = None
    all_outputs: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    duration_seconds: float = 0.0
    nodes_completed: int = 0
    nodes_failed: int = 0
    nodes_total: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "workflow_id": self.workflow_id,
            "output": self.output,
            "all_outputs": self.all_outputs,
            "error": self.error,
            "duration_seconds": self.duration_seconds,
            "nodes_completed": self.nodes_completed,
            "nodes_failed": self.nodes_failed,
            "nodes_total": self.nodes_total,
        }


class WorkflowExecutor:
    """
    Executes workflow graphs by coordinating agents.

    Features:
    - Sequential execution (respects dependencies)
    - Parallel execution of independent nodes
    - Context passing between nodes
    - Progress callbacks
    - Error handling
    """

    def __init__(
        self,
        agent_registry=None,
        agent_service=None,
        llm_service=None,
    ):
        """
        Initialize the executor.

        Args:
            agent_registry: Registry of available agent templates
            agent_service: Service for agent execution
            llm_service: LLM service for fallback execution
        """
        self._registry = agent_registry
        self._agent_service = agent_service
        self._llm = llm_service

        # Active workflows
        self._active_workflows: Dict[str, EvolvianWorkflow] = {}

        # Callbacks
        self._on_node_start: Optional[Callable] = None
        self._on_node_complete: Optional[Callable] = None
        self._on_workflow_complete: Optional[Callable] = None

    def set_callbacks(
        self,
        on_node_start: Callable[[str, WorkflowNode], None] = None,
        on_node_complete: Callable[[str, WorkflowNode], None] = None,
        on_workflow_complete: Callable[[str, ExecutionResult], None] = None,
    ):
        """Set execution callbacks for progress tracking"""
        self._on_node_start = on_node_start
        self._on_node_complete = on_node_complete
        self._on_workflow_complete = on_workflow_complete

    def execute(
        self,
        graph: WorkflowGraph,
        inputs: Dict[str, Any] = None,
        workflow_id: str = None,
    ) -> ExecutionResult:
        """
        Execute a workflow graph synchronously.

        Args:
            graph: The workflow graph to execute
            inputs: Initial inputs
            workflow_id: Optional ID (generated if not provided)

        Returns:
            ExecutionResult with outputs and metadata
        """
        workflow_id = workflow_id or str(uuid.uuid4())

        # Create workflow instance
        workflow = EvolvianWorkflow(
            graph=graph,
            agent_registry=self._registry,
            agent_service=self._agent_service,
        )
        workflow.workflow_id = workflow_id

        # Track active workflow
        self._active_workflows[workflow_id] = workflow

        start_time = datetime.now(timezone.utc)

        try:
            # Initialize context with inputs
            if inputs:
                graph.context.update(inputs)

            # Execute nodes in order
            while not graph.is_complete:
                ready_nodes = graph.get_ready_nodes()

                if not ready_nodes:
                    if graph.is_complete:
                        break
                    # Workflow stuck
                    return ExecutionResult(
                        success=False,
                        workflow_id=workflow_id,
                        error="Workflow stuck - possible circular dependency",
                        nodes_total=len(graph.nodes),
                        nodes_completed=sum(1 for n in graph.nodes if n.status == WorkflowNodeStatus.COMPLETED),
                        nodes_failed=sum(1 for n in graph.nodes if n.status == WorkflowNodeStatus.FAILED),
                    )

                # Execute ready nodes (could be parallelized)
                for node in ready_nodes:
                    self._execute_node(workflow_id, node, graph)

                    # Stop on failure (configurable in future)
                    if node.status == WorkflowNodeStatus.FAILED:
                        break

            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()

            result = ExecutionResult(
                success=not graph.has_failed,
                workflow_id=workflow_id,
                output=graph.get_final_output(),
                all_outputs=graph.get_completed_outputs(),
                duration_seconds=duration,
                nodes_total=len(graph.nodes),
                nodes_completed=sum(1 for n in graph.nodes if n.status == WorkflowNodeStatus.COMPLETED),
                nodes_failed=sum(1 for n in graph.nodes if n.status == WorkflowNodeStatus.FAILED),
            )

            # Callback
            if self._on_workflow_complete:
                self._on_workflow_complete(workflow_id, result)

            return result

        except Exception as e:
            return ExecutionResult(
                success=False,
                workflow_id=workflow_id,
                error=str(e),
                nodes_total=len(graph.nodes),
            )

        finally:
            # Clean up
            if workflow_id in self._active_workflows:
                del self._active_workflows[workflow_id]

    def _execute_node(
        self,
        workflow_id: str,
        node: WorkflowNode,
        graph: WorkflowGraph,
    ):
        """Execute a single workflow node"""
        # Callback: node starting
        if self._on_node_start:
            self._on_node_start(workflow_id, node)

        # Find agent for this node
        agent = self._find_agent(node)
        agent_name = agent.name if agent else "System"

        node.mark_running(agent_name)

        try:
            # Gather inputs from context
            node_inputs = self._gather_inputs(node, graph)

            # Build the task prompt
            task_prompt = self._build_task_prompt(node, node_inputs)

            # Execute
            if agent:
                # Use agent execution
                result = self._execute_with_agent(agent, task_prompt, node_inputs)
            else:
                # Fallback to LLM
                result = self._execute_with_llm(task_prompt, node_inputs)

            # Store outputs in context
            for output_key in node.outputs:
                graph.context[output_key] = result.get("output", "")

            node.mark_completed(result)

        except Exception as e:
            node.mark_failed(str(e))

        # Callback: node complete
        if self._on_node_complete:
            self._on_node_complete(workflow_id, node)

    def _find_agent(self, node: WorkflowNode) -> Optional[Any]:
        """Find an agent for the node"""
        # If already assigned, get from registry
        if node.assigned_agent and self._registry:
            # Try to find by name
            for template_id, template in self._registry._templates.items():
                if template.name == node.assigned_agent:
                    return self._registry.create_from_template(template_id)

        # Find by role
        if self._registry:
            role_lower = node.agent_role.lower()
            for template_id, template in self._registry._templates.items():
                if role_lower in template.role.lower() or role_lower in template.specialty.lower():
                    return self._registry.create_from_template(template_id)

        return None

    def _gather_inputs(self, node: WorkflowNode, graph: WorkflowGraph) -> Dict[str, Any]:
        """Gather inputs for a node from the graph context"""
        inputs = {}
        for input_key in node.inputs:
            if input_key in graph.context:
                inputs[input_key] = graph.context[input_key]
        return inputs

    def _build_task_prompt(self, node: WorkflowNode, inputs: Dict[str, Any]) -> str:
        """Build the task prompt for execution"""
        prompt = f"""Task: {node.name}

Description: {node.description}

"""
        if inputs:
            prompt += "Previous context:\n"
            for key, value in inputs.items():
                # Truncate long values
                value_str = str(value)
                if len(value_str) > 500:
                    value_str = value_str[:500] + "..."
                prompt += f"- {key}: {value_str}\n"
            prompt += "\n"

        prompt += "Please complete this task and provide your output."

        return prompt

    def _execute_with_agent(
        self,
        agent: Any,
        task: str,
        inputs: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute task with an agent"""
        try:
            # Use agent's execute_simple method
            if hasattr(agent, 'execute_simple'):
                output = agent.execute_simple(task)
            elif hasattr(agent, 'execute'):
                output = agent.execute(task, inputs)
            else:
                output = f"Agent {agent.name} executed: {task}"

            return {
                "output": output,
                "agent": agent.name,
                "method": "agent",
            }
        except Exception as e:
            # Fallback to LLM on agent error
            return self._execute_with_llm(task, inputs)

    def _execute_with_llm(
        self,
        task: str,
        inputs: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute task with raw LLM (fallback)"""
        if not self._llm:
            return {
                "output": f"[No executor available] Task: {task}",
                "agent": "System",
                "method": "none",
            }

        try:
            response = self._llm.simple_chat(user_message=task)
            return {
                "output": response,
                "agent": "LLM",
                "method": "llm",
            }
        except Exception as e:
            return {
                "output": f"[Execution error: {e}] Task: {task}",
                "agent": "System",
                "method": "error",
            }

    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get status of an active workflow"""
        if workflow_id in self._active_workflows:
            workflow = self._active_workflows[workflow_id]
            return {
                "workflow_id": workflow_id,
                "status": workflow.status,
                "graph": workflow.graph.to_dict(),
            }
        return None

    def cancel_workflow(self, workflow_id: str) -> bool:
        """Cancel an active workflow"""
        if workflow_id in self._active_workflows:
            workflow = self._active_workflows[workflow_id]
            workflow.status = "cancelled"
            del self._active_workflows[workflow_id]
            return True
        return False


class AsyncWorkflowExecutor(WorkflowExecutor):
    """
    Async version of workflow executor.

    Enables parallel execution of independent nodes
    and non-blocking operation.
    """

    async def execute_async(
        self,
        graph: WorkflowGraph,
        inputs: Dict[str, Any] = None,
        workflow_id: str = None,
        parallel: bool = True,
    ) -> ExecutionResult:
        """
        Execute a workflow graph asynchronously.

        Args:
            graph: The workflow graph to execute
            inputs: Initial inputs
            workflow_id: Optional ID
            parallel: Whether to run independent nodes in parallel

        Returns:
            ExecutionResult with outputs and metadata
        """
        workflow_id = workflow_id or str(uuid.uuid4())

        start_time = datetime.now(timezone.utc)

        try:
            if inputs:
                graph.context.update(inputs)

            while not graph.is_complete:
                ready_nodes = graph.get_ready_nodes()

                if not ready_nodes:
                    if graph.is_complete:
                        break
                    return ExecutionResult(
                        success=False,
                        workflow_id=workflow_id,
                        error="Workflow stuck",
                        nodes_total=len(graph.nodes),
                    )

                if parallel and len(ready_nodes) > 1:
                    # Execute ready nodes in parallel
                    tasks = [
                        self._execute_node_async(workflow_id, node, graph)
                        for node in ready_nodes
                    ]
                    await asyncio.gather(*tasks)
                else:
                    # Sequential execution
                    for node in ready_nodes:
                        await self._execute_node_async(workflow_id, node, graph)
                        if node.status == WorkflowNodeStatus.FAILED:
                            break

            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()

            return ExecutionResult(
                success=not graph.has_failed,
                workflow_id=workflow_id,
                output=graph.get_final_output(),
                all_outputs=graph.get_completed_outputs(),
                duration_seconds=duration,
                nodes_total=len(graph.nodes),
                nodes_completed=sum(1 for n in graph.nodes if n.status == WorkflowNodeStatus.COMPLETED),
                nodes_failed=sum(1 for n in graph.nodes if n.status == WorkflowNodeStatus.FAILED),
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                workflow_id=workflow_id,
                error=str(e),
                nodes_total=len(graph.nodes),
            )

    async def _execute_node_async(
        self,
        workflow_id: str,
        node: WorkflowNode,
        graph: WorkflowGraph,
    ):
        """Execute a node asynchronously"""
        # For now, wrap sync execution
        # In future, could use async agent execution
        self._execute_node(workflow_id, node, graph)


# Factory functions
def create_workflow_executor(
    agent_registry=None,
    agent_service=None,
    llm_service=None,
) -> WorkflowExecutor:
    """Create a workflow executor with optional dependencies"""
    # Try to import defaults
    if llm_service is None:
        try:
            from llm_service import llm_service as default_llm
            llm_service = default_llm
        except ImportError:
            pass

    if agent_registry is None:
        try:
            from core.agents import AGENT_REGISTRY
            agent_registry = AGENT_REGISTRY
        except ImportError:
            pass

    if agent_service is None:
        try:
            from core.agents import agent_service as default_agent_service
            agent_service = default_agent_service
        except ImportError:
            pass

    return WorkflowExecutor(
        agent_registry=agent_registry,
        agent_service=agent_service,
        llm_service=llm_service,
    )


def create_async_executor(
    agent_registry=None,
    agent_service=None,
    llm_service=None,
) -> AsyncWorkflowExecutor:
    """Create an async workflow executor"""
    if llm_service is None:
        try:
            from llm_service import llm_service as default_llm
            llm_service = default_llm
        except ImportError:
            pass

    if agent_registry is None:
        try:
            from core.agents import AGENT_REGISTRY
            agent_registry = AGENT_REGISTRY
        except ImportError:
            pass

    if agent_service is None:
        try:
            from core.agents import agent_service as default_agent_service
            agent_service = default_agent_service
        except ImportError:
            pass

    return AsyncWorkflowExecutor(
        agent_registry=agent_registry,
        agent_service=agent_service,
        llm_service=llm_service,
    )
