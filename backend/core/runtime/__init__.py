"""
Evolvian Runtime Module

The execution kernel - owns all execution semantics.
This is the "brainstem" of Evolvian where intelligence happens.

Modules:
- context: ExecutionContext - stateful execution environment
- kernel: RuntimeKernel - orchestrates everything (TODO)
- evaluator: ExecutionEvaluator - quality/cost metrics (TODO)
- memory_bridge: MemoryBridge - connects agents to memory (TODO)
"""

from .context import (
    ExecutionContext,
    AgentState,
    ToolState,
    ExecutionMetrics,
    NodeMetrics,
)

__all__ = [
    "ExecutionContext",
    "AgentState",
    "ToolState",
    "ExecutionMetrics",
    "NodeMetrics",
]
