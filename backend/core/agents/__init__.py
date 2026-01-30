"""
Evolvian Agents Module

Wraps EvoAgentX agent primitives with Evolvian-specific
identity, metadata, and business logic.
"""

from .base import EvolvianAgent, AgentMetadata, AgentCapabilities
from .registry import AgentRegistry, AGENT_REGISTRY
from .service import AgentService

__all__ = [
    "EvolvianAgent",
    "AgentMetadata",
    "AgentCapabilities",
    "AgentRegistry",
    "AGENT_REGISTRY",
    "AgentService",
]
