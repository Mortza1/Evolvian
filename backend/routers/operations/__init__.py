"""
Operations router package.

Assembles all sub-routers under the /api/operations prefix and exposes
`router` so that main.py can do: from routers.operations import router
"""

from fastapi import APIRouter

from .crud import router as crud_router
from .execution import router as execution_router
from .control import router as control_router
from .messaging import router as messaging_router
from .evolution import router as evolution_router
from .rating import router as rating_router

router = APIRouter(prefix="/api/operations", tags=["Operations"])

router.include_router(crud_router)
router.include_router(execution_router)
router.include_router(control_router)
router.include_router(messaging_router)
router.include_router(evolution_router)
router.include_router(rating_router)
