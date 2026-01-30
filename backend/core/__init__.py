"""
Evolvian Core Module

Contains the core primitives extracted from EvoAgentX,
wrapped for Evolvian's use case.

Modules:
- agents: Agent abstraction, registry, and service
- workflows: Workflow building and execution
"""

from .agents import EvolvianAgent, AgentRegistry, AgentService
from .workflows import (
    WorkflowNode,
    WorkflowGraph,
    WorkflowBuilder,
    WorkflowExecutor,
)

__all__ = [
    # Agents
    "EvolvianAgent",
    "AgentRegistry",
    "AgentService",
    # Workflows
    "WorkflowNode",
    "WorkflowGraph",
    "WorkflowBuilder",
    "WorkflowExecutor",
]
