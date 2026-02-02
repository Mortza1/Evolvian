"""
Evolvian Core Module

Contains the core primitives extracted from EvoAgentX,
wrapped for Evolvian's use case.

Modules:
- agents: Agent abstraction, registry, and service
- workflows: Workflow building and execution
- runtime: Execution kernel - stateful execution environment
"""

from .agents import EvolvianAgent, AgentRegistry, AgentService
from .workflows import (
    WorkflowNode,
    WorkflowGraph,
    WorkflowBuilder,
    WorkflowExecutor,
)
from .runtime import (
    ExecutionContext,
    AgentState,
    ToolState,
    ExecutionMetrics,
    NodeMetrics,
    MemoryBridge,
    ShortTermMemory,
    LongTermMemory,
    KnowledgeContext,
    MemoryItem,
    EvolutionService,
    WorkflowDNA,
    WorkflowStats,
    EvolutionSuggestion,
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
    # Runtime
    "ExecutionContext",
    "AgentState",
    "ToolState",
    "ExecutionMetrics",
    "NodeMetrics",
    # Memory
    "MemoryBridge",
    "ShortTermMemory",
    "LongTermMemory",
    "KnowledgeContext",
    "MemoryItem",
    # Evolution
    "EvolutionService",
    "WorkflowDNA",
    "WorkflowStats",
    "EvolutionSuggestion",
]
