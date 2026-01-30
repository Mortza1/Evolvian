"""
Evolvian API Routers

Modular router organization for the Evolvian backend.
"""

from .auth import router as auth_router
from .teams import router as teams_router
from .agents import router as agents_router
from .chat import router as chat_router
from .operations import router as operations_router
from .evo import router as evo_router
from .knowledge import router as knowledge_router
from .tools import router as tools_router
from .marketplace import router as marketplace_router
from .assumptions import router as assumptions_router
from .users import router as users_router

__all__ = [
    "auth_router",
    "teams_router",
    "agents_router",
    "chat_router",
    "operations_router",
    "evo_router",
    "knowledge_router",
    "tools_router",
    "marketplace_router",
    "assumptions_router",
    "users_router",
]
