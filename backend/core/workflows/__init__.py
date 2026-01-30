"""
Evolvian Workflow Module

Simplified workflow primitives adapted from EvoAgentX.
Provides task decomposition, workflow building, and execution.

Usage:
    from core.workflows import WorkflowBuilder, WorkflowExecutor

    # Build a workflow from task
    builder = WorkflowBuilder(llm_service=llm, agent_registry=registry)
    graph = builder.build("Create a marketing campaign for product X")

    # Execute the workflow
    executor = WorkflowExecutor(agent_registry=registry)
    result = executor.execute(graph)

    print(result.output)
"""

# Base classes
from .base import (
    WorkflowNodeStatus,
    WorkflowNode,
    WorkflowGraph,
    EvolvianWorkflow,
)

# Builder
from .builder import (
    WorkflowBuilder,
    create_workflow_builder,
)

# Executor
from .executor import (
    ExecutionResult,
    WorkflowExecutor,
    AsyncWorkflowExecutor,
    create_workflow_executor,
    create_async_executor,
)

__all__ = [
    # Base
    "WorkflowNodeStatus",
    "WorkflowNode",
    "WorkflowGraph",
    "EvolvianWorkflow",
    # Builder
    "WorkflowBuilder",
    "create_workflow_builder",
    # Executor
    "ExecutionResult",
    "WorkflowExecutor",
    "AsyncWorkflowExecutor",
    "create_workflow_executor",
    "create_async_executor",
]
