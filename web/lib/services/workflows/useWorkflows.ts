/**
 * Workflow Hooks
 *
 * React hooks for workflow operations.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { workflowService } from './workflow.service';
import type {
  WorkflowGraph,
  WorkflowDesign,
  ExecutionResult,
  ExecutionStatus,
  TaskAnalysis,
  WorkflowNodeStatus,
} from './types';

// ==================== Build Workflow Hook ====================

interface UseBuildWorkflowOptions {
  teamId: number;
  autoAnalyze?: boolean;
}

interface UseBuildWorkflowReturn {
  // State
  task: string;
  setTask: (task: string) => void;
  analysis: TaskAnalysis | null;
  workflow: WorkflowDesign | null;
  graph: WorkflowGraph | null;
  isAnalyzing: boolean;
  isBuilding: boolean;
  error: string | null;

  // Actions
  analyzeTask: () => Promise<void>;
  buildWorkflow: (context?: Record<string, unknown>) => Promise<void>;
  quickTask: () => Promise<void>;
  reset: () => void;
}

export function useBuildWorkflow(options: UseBuildWorkflowOptions): UseBuildWorkflowReturn {
  const { teamId, autoAnalyze = false } = options;

  const [task, setTask] = useState('');
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowDesign | null>(null);
  const [graph, setGraph] = useState<WorkflowGraph | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeTask = useCallback(async () => {
    if (!task.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await workflowService.analyzeTask(task, teamId);
      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [task, teamId]);

  const buildWorkflow = useCallback(
    async (context?: Record<string, unknown>) => {
      if (!task.trim()) return;

      setIsBuilding(true);
      setError(null);

      try {
        const result = await workflowService.buildWorkflow({
          task,
          team_id: teamId,
          context,
        });

        if (result.success) {
          setWorkflow(result.workflow || null);
          setGraph(result.graph || null);
        } else {
          setError(result.error || 'Failed to build workflow');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to build workflow');
      } finally {
        setIsBuilding(false);
      }
    },
    [task, teamId]
  );

  const quickTask = useCallback(async () => {
    if (!task.trim()) return;

    setIsAnalyzing(true);
    setIsBuilding(true);
    setError(null);

    try {
      const result = await workflowService.quickTask(task, teamId);

      if (result.success) {
        setAnalysis(result.analysis || null);
        setWorkflow(result.workflow || null);
        setGraph(result.graph || null);
      } else {
        setError(result.error || 'Failed to process task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process task');
    } finally {
      setIsAnalyzing(false);
      setIsBuilding(false);
    }
  }, [task, teamId]);

  const reset = useCallback(() => {
    setTask('');
    setAnalysis(null);
    setWorkflow(null);
    setGraph(null);
    setError(null);
  }, []);

  // Auto-analyze when task changes (debounced)
  useEffect(() => {
    if (!autoAnalyze || !task.trim()) return;

    const timer = setTimeout(() => {
      analyzeTask();
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoAnalyze, task, analyzeTask]);

  return {
    task,
    setTask,
    analysis,
    workflow,
    graph,
    isAnalyzing,
    isBuilding,
    error,
    analyzeTask,
    buildWorkflow,
    quickTask,
    reset,
  };
}

// ==================== Execute Workflow Hook ====================

interface UseExecuteWorkflowOptions {
  operationId: number;
  pollInterval?: number; // ms
}

interface UseExecuteWorkflowReturn {
  // State
  status: ExecutionStatus | null;
  result: ExecutionResult | null;
  isExecuting: boolean;
  error: string | null;
  progress: number;
  currentNode: WorkflowGraph['nodes'][0] | null;

  // Actions
  execute: (inputs?: Record<string, unknown>) => Promise<void>;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useExecuteWorkflow(options: UseExecuteWorkflowOptions): UseExecuteWorkflowReturn {
  const { operationId, pollInterval = 2000 } = options;

  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const newStatus = await workflowService.getExecutionStatus(operationId);
      if (newStatus) {
        setStatus(newStatus);

        // Stop polling if execution is done
        if (newStatus.status === 'completed' || newStatus.status === 'failed' || newStatus.status === 'cancelled') {
          setIsExecuting(false);
          stopPolling();
        }
      }
    } catch (err) {
      console.error('Error refreshing status:', err);
    }
  }, [operationId, stopPolling]);

  const execute = useCallback(
    async (inputs?: Record<string, unknown>) => {
      setIsExecuting(true);
      setError(null);
      setResult(null);

      try {
        const execResult = await workflowService.executeWorkflow({
          operation_id: operationId,
          inputs,
        });

        if (execResult.success && execResult.result) {
          setResult(execResult.result);

          // Start polling for updates
          pollRef.current = setInterval(refresh, pollInterval);
        } else {
          setError(execResult.error || 'Execution failed');
          setIsExecuting(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Execution failed');
        setIsExecuting(false);
      }
    },
    [operationId, pollInterval, refresh]
  );

  const cancel = useCallback(async () => {
    try {
      const success = await workflowService.cancelExecution(operationId);
      if (success) {
        setIsExecuting(false);
        stopPolling();
        await refresh();
      }
    } catch (err) {
      console.error('Error cancelling execution:', err);
    }
  }, [operationId, stopPolling, refresh]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Calculate derived values
  const progress = status?.graph ? workflowService.calculateProgress(status.graph) : 0;
  const currentNode = status?.graph ? workflowService.getCurrentNode(status.graph) || null : null;

  return {
    status,
    result,
    isExecuting,
    error,
    progress,
    currentNode,
    execute,
    cancel,
    refresh,
  };
}

// ==================== Workflow Graph Hook (for visualization) ====================

interface UseWorkflowGraphOptions {
  initialGraph?: WorkflowGraph;
}

interface UseWorkflowGraphReturn {
  graph: WorkflowGraph | null;
  setGraph: (graph: WorkflowGraph | null) => void;
  selectedNodeId: string | null;
  selectNode: (nodeId: string | null) => void;
  getNode: (nodeId: string) => WorkflowGraph['nodes'][0] | undefined;
  updateNodeStatus: (nodeId: string, status: WorkflowNodeStatus) => void;
  progress: number;
  readyNodes: WorkflowGraph['nodes'];
  isComplete: boolean;
}

export function useWorkflowGraph(options: UseWorkflowGraphOptions = {}): UseWorkflowGraphReturn {
  const [graph, setGraph] = useState<WorkflowGraph | null>(options.initialGraph || null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const getNode = useCallback(
    (nodeId: string) => {
      return graph?.nodes.find((n) => n.id === nodeId);
    },
    [graph]
  );

  const updateNodeStatus = useCallback((nodeId: string, status: WorkflowNodeStatus) => {
    setGraph((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n)),
      };
    });
  }, []);

  const progress = graph ? workflowService.calculateProgress(graph) : 0;
  const readyNodes = graph ? workflowService.getReadyNodes(graph) : [];
  const isComplete = graph?.is_complete || false;

  return {
    graph,
    setGraph,
    selectedNodeId,
    selectNode,
    getNode,
    updateNodeStatus,
    progress,
    readyNodes,
    isComplete,
  };
}
