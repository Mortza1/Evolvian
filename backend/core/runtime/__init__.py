"""
Evolvian Runtime Module

The execution kernel - owns all execution semantics.
This is the "brainstem" of Evolvian where intelligence happens.

Modules:
- context: ExecutionContext - stateful execution environment
- memory_bridge: MemoryBridge - connects agents to memory
- evolution: EvolutionService - Bayesian workflow selection and mutation
- kernel: RuntimeKernel - orchestrates everything (TODO)
- evaluator: ExecutionEvaluator - quality/cost metrics (TODO)
"""

from .context import (
    ExecutionContext,
    AgentState,
    ToolState,
    ExecutionMetrics,
    NodeMetrics,
)

from .memory_bridge import (
    MemoryBridge,
    ShortTermMemory,
    LongTermMemory,
    KnowledgeContext,
    MemoryItem,
)

from .evolution import (
    EvolutionService,
    WorkflowDNA,
    WorkflowStats,
    EvolutionSuggestion,
)

from .quality_evaluator import (
    QualityEvaluator,
    QualityResult,
)

__all__ = [
    # Context
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
    # Quality
    "QualityEvaluator",
    "QualityResult",
]
