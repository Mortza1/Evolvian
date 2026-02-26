"""
Execution State Registry

Manages in-memory state and control signals for running workflow executions.
Enables cooperative cancellation and pause/resume functionality.
"""

from dataclasses import dataclass, field
from typing import Dict, Optional, List, Any
from enum import Enum
from threading import Lock
from datetime import datetime


class ExecutionSignal(Enum):
    """Control signals for execution state"""
    RUNNING = "running"
    PAUSE_REQUESTED = "pause_requested"
    CANCEL_REQUESTED = "cancel_requested"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    WAITING_FOR_INPUT = "waiting_for_input"


@dataclass
class ExecutionState:
    """Tracks the state of a running execution"""
    operation_id: int
    signal: ExecutionSignal = ExecutionSignal.RUNNING
    current_node_index: int = 0
    started_at: datetime = field(default_factory=datetime.utcnow)
    paused_at: Optional[datetime] = None
    completed_nodes: List[Dict[str, Any]] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    pending_assumption: Optional[Dict[str, Any]] = None
    assumption_answer: Optional[str] = None


class ExecutionRegistry:
    """
    Singleton registry for tracking running executions.
    Thread-safe for concurrent access.
    """
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._executions: Dict[int, ExecutionState] = {}
                    cls._instance._registry_lock = Lock()
        return cls._instance

    def register(self, operation_id: int) -> ExecutionState:
        """Register a new execution and return its state"""
        with self._registry_lock:
            state = ExecutionState(operation_id=operation_id)
            self._executions[operation_id] = state
            return state

    def get(self, operation_id: int) -> Optional[ExecutionState]:
        """Get execution state by operation ID"""
        with self._registry_lock:
            return self._executions.get(operation_id)

    def request_pause(self, operation_id: int) -> bool:
        """
        Request pause for a running execution.
        Returns True if pause was requested, False if not running.
        """
        with self._registry_lock:
            state = self._executions.get(operation_id)
            if state and state.signal == ExecutionSignal.RUNNING:
                state.signal = ExecutionSignal.PAUSE_REQUESTED
                return True
            return False

    def confirm_paused(self, operation_id: int) -> bool:
        """Confirm that execution has paused"""
        with self._registry_lock:
            state = self._executions.get(operation_id)
            if state and state.signal == ExecutionSignal.PAUSE_REQUESTED:
                state.signal = ExecutionSignal.PAUSED
                state.paused_at = datetime.utcnow()
                return True
            return False

    def request_cancel(self, operation_id: int) -> bool:
        """
        Request cancellation for a running or paused execution.
        Returns True if cancel was requested, False if not found.
        """
        with self._registry_lock:
            state = self._executions.get(operation_id)
            if state and state.signal in (ExecutionSignal.RUNNING, ExecutionSignal.PAUSED, ExecutionSignal.PAUSE_REQUESTED):
                state.signal = ExecutionSignal.CANCEL_REQUESTED
                return True
            return False

    def confirm_cancelled(self, operation_id: int) -> bool:
        """Confirm that execution has been cancelled"""
        with self._registry_lock:
            state = self._executions.get(operation_id)
            if state and state.signal == ExecutionSignal.CANCEL_REQUESTED:
                state.signal = ExecutionSignal.CANCELLED
                return True
            return False

    def unregister(self, operation_id: int) -> None:
        """Remove execution from registry"""
        with self._registry_lock:
            self._executions.pop(operation_id, None)

    def is_running(self, operation_id: int) -> bool:
        """Check if an execution is currently running"""
        with self._registry_lock:
            state = self._executions.get(operation_id)
            return state is not None and state.signal == ExecutionSignal.RUNNING

    def is_registered(self, operation_id: int) -> bool:
        """Check if an execution is registered (any state)"""
        with self._registry_lock:
            return operation_id in self._executions

    def update_progress(self, operation_id: int, node_index: int, completed_node: Optional[Dict[str, Any]] = None) -> None:
        """Update execution progress after completing a node"""
        with self._registry_lock:
            state = self._executions.get(operation_id)
            if state:
                state.current_node_index = node_index
                if completed_node:
                    state.completed_nodes.append(completed_node)

    def get_all_running(self) -> List[int]:
        """Get all running operation IDs"""
        with self._registry_lock:
            return [
                op_id for op_id, state in self._executions.items()
                if state.signal == ExecutionSignal.RUNNING
            ]

    def request_input(self, operation_id: int, assumption_data: Dict[str, Any]) -> bool:
        """
        Request user input for an assumption.
        Sets signal to WAITING_FOR_INPUT and stores assumption data.
        Returns True if successfully requested, False if not running.
        """
        with self._registry_lock:
            state = self._executions.get(operation_id)
            if state and state.signal == ExecutionSignal.RUNNING:
                state.signal = ExecutionSignal.WAITING_FOR_INPUT
                state.pending_assumption = assumption_data
                state.assumption_answer = None
                return True
            return False

    def provide_input(self, operation_id: int, answer: str) -> bool:
        """
        Provide user's answer to a pending assumption.
        Stores answer and resets signal to RUNNING.
        Returns True if answer was accepted, False if not waiting for input.
        """
        with self._registry_lock:
            state = self._executions.get(operation_id)
            if state and state.signal == ExecutionSignal.WAITING_FOR_INPUT:
                state.assumption_answer = answer
                state.signal = ExecutionSignal.RUNNING
                state.pending_assumption = None
                return True
            return False

    def is_waiting_for_input(self, operation_id: int) -> bool:
        """Check if an execution is waiting for user input"""
        with self._registry_lock:
            state = self._executions.get(operation_id)
            return state is not None and state.signal == ExecutionSignal.WAITING_FOR_INPUT


# Global singleton instance
EXECUTION_REGISTRY = ExecutionRegistry()
