/**
 * Workflow Service
 *
 * API integration for workflow building and execution.
 */

import { api } from '../api/client';
import type {
  WorkflowGraph,
  WorkflowDesign,
  ExecutionResult,
  ExecutionStatus,
  BuildWorkflowRequest,
  ExecuteWorkflowRequest,
  TaskAnalysis,
} from './types';

class WorkflowService {
  // ==================== Workflow Building ====================

  /**
   * Analyze a task and get Evo's breakdown
   * Note: Uses longer timeout (120s) for LLM call
   */
  async analyzeTask(
    task: string,
    teamId: number,
    context?: string
  ): Promise<{ success: boolean; analysis?: TaskAnalysis; error?: string }> {
    try {
      const result = await api.post<{
        success: boolean;
        analysis: TaskAnalysis;
        parse_error?: boolean;
      }>('/api/evo/analyze', {
        task,
        team_id: teamId,
        context,
      }, { timeout: 120000 }); // 2 minute timeout for LLM call
      return { success: true, analysis: result.analysis };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze task';
      return { success: false, error: message };
    }
  }

  /**
   * Build a workflow from task (uses Evo's brain)
   * Note: Uses longer timeouts as this involves LLM calls
   */
  async buildWorkflow(request: BuildWorkflowRequest): Promise<{
    success: boolean;
    workflow?: WorkflowDesign;
    graph?: WorkflowGraph;
    error?: string;
  }> {
    try {
      // First analyze the task (120s timeout)
      const analysisResult = await api.post<{
        success: boolean;
        analysis: TaskAnalysis;
      }>('/api/evo/analyze', {
        task: request.task,
        team_id: request.team_id,
        context: JSON.stringify(request.context || {}),
      }, { timeout: 120000 });

      if (!analysisResult.success) {
        return { success: false, error: 'Failed to analyze task' };
      }

      // Then get workflow design (120s timeout)
      const workflowResult = await api.post<{
        success: boolean;
        workflow: WorkflowDesign;
      }>('/api/evo/workflow', {
        task: request.task,
        analysis: analysisResult.analysis,
      }, { timeout: 120000 });

      if (!workflowResult.success) {
        return { success: false, error: 'Failed to design workflow' };
      }

      // Convert to graph format for UI
      const graph = this.designToGraph(workflowResult.workflow);

      return {
        success: true,
        workflow: workflowResult.workflow,
        graph,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build workflow';
      return { success: false, error: message };
    }
  }

  /**
   * Quick task - combined analyze + workflow in one call
   * Note: Uses longer timeout (180s) as this involves multiple LLM calls
   */
  async quickTask(
    task: string,
    teamId: number
  ): Promise<{
    success: boolean;
    analysis?: TaskAnalysis;
    workflow?: WorkflowDesign;
    graph?: WorkflowGraph;
    error?: string;
  }> {
    try {
      const result = await api.post<{
        success: boolean;
        analysis: TaskAnalysis;
        workflow: WorkflowDesign;
      }>('/api/evo/quick-task', {
        task,
        team_id: teamId,
      }, { timeout: 180000 }); // 3 minute timeout for multiple LLM calls

      if (!result.success) {
        return { success: false, error: 'Failed to process task' };
      }

      const graph = this.designToGraph(result.workflow);

      return {
        success: true,
        analysis: result.analysis,
        workflow: result.workflow,
        graph,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process task';
      return { success: false, error: message };
    }
  }

  // ==================== Workflow Execution ====================

  /**
   * Execute a workflow for an operation
   */
  async executeWorkflow(request: ExecuteWorkflowRequest): Promise<{
    success: boolean;
    result?: ExecutionResult;
    error?: string;
  }> {
    try {
      const result = await api.post<ExecutionResult>(
        `/api/operations/${request.operation_id}/execute`,
        { inputs: request.inputs || {} }
      );
      return { success: true, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute workflow';
      return { success: false, error: message };
    }
  }

  /**
   * Get execution status for an operation
   */
  async getExecutionStatus(operationId: number): Promise<ExecutionStatus | null> {
    try {
      return await api.get<ExecutionStatus>(`/api/operations/${operationId}/status`);
    } catch (err) {
      console.error('Error getting execution status:', err);
      return null;
    }
  }

  /**
   * Cancel a running or paused workflow
   */
  async cancelExecution(operationId: number): Promise<{
    success: boolean;
    status?: string;
    message?: string;
  }> {
    try {
      const result = await api.post<{
        success: boolean;
        status: string;
        message: string;
        operation_id: number;
      }>(`/api/operations/${operationId}/cancel`, {});
      return {
        success: result.success,
        status: result.status,
        message: result.message,
      };
    } catch (err) {
      console.error('Error cancelling execution:', err);
      const message = err instanceof Error ? err.message : 'Failed to cancel';
      return { success: false, message };
    }
  }

  /**
   * Pause a running workflow at next node boundary
   */
  async pauseExecution(operationId: number): Promise<{
    success: boolean;
    status?: string;
    message?: string;
  }> {
    try {
      const result = await api.post<{
        success: boolean;
        status: string;
        message: string;
        operation_id: number;
      }>(`/api/operations/${operationId}/pause`, {});
      return {
        success: result.success,
        status: result.status,
        message: result.message,
      };
    } catch (err) {
      console.error('Error pausing execution:', err);
      const message = err instanceof Error ? err.message : 'Failed to pause';
      return { success: false, message };
    }
  }

  /**
   * Resume a paused workflow - returns SSE stream
   * Note: This returns the raw fetch Response so caller can read the SSE stream
   */
  async resumeExecution(operationId: number): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const response = await fetch(`${baseUrl}/api/operations/${operationId}/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Resume failed: ${response.status}`);
    }

    return response;
  }

  // ==================== Operation Integration ====================

  /**
   * Create operation with workflow
   */
  async createOperationWithWorkflow(
    teamId: number,
    title: string,
    description: string,
    workflow: WorkflowDesign
  ): Promise<{ success: boolean; operationId?: number; error?: string }> {
    try {
      const result = await api.post<{ id: number }>('/api/operations', {
        team_id: teamId,
        title,
        description,
        status: 'pending',
        workflow_config: {
          title: workflow.title,
          description: workflow.description,
          nodes: workflow.steps.map((step) => ({
            id: step.id,
            name: step.name,
            description: step.description,
            agentRole: step.agent_role,
            inputs: step.inputs,
            outputs: step.outputs,
            dependsOn: step.depends_on,
          })),
          estimated_time: workflow.estimated_time_minutes,
          estimated_cost: workflow.estimated_cost,
        },
      });
      return { success: true, operationId: result.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create operation';
      return { success: false, error: message };
    }
  }

  // ==================== Utilities ====================

  /**
   * Convert WorkflowDesign to WorkflowGraph for UI display
   */
  designToGraph(design: WorkflowDesign): WorkflowGraph {
    return {
      goal: design.description || design.title,
      nodes: design.steps.map((step) => ({
        id: step.id,
        name: step.name,
        description: step.description,
        agent_role: step.agent_role,
        inputs: step.inputs,
        outputs: step.outputs,
        depends_on: step.depends_on,
        status: 'pending' as const,
        assigned_agent: undefined,
        result: undefined,
        error: undefined,
      })),
      context: {},
      is_complete: false,
      has_failed: false,
    };
  }

  /**
   * Calculate progress percentage from graph
   */
  calculateProgress(graph: WorkflowGraph): number {
    if (graph.nodes.length === 0) return 0;
    const completed = graph.nodes.filter(
      (n) => n.status === 'completed' || n.status === 'failed' || n.status === 'skipped'
    ).length;
    return Math.round((completed / graph.nodes.length) * 100);
  }

  /**
   * Get the currently running node
   */
  getCurrentNode(graph: WorkflowGraph): typeof graph.nodes[0] | undefined {
    return graph.nodes.find((n) => n.status === 'running');
  }

  /**
   * Get next nodes that are ready to run
   */
  getReadyNodes(graph: WorkflowGraph): typeof graph.nodes {
    return graph.nodes.filter((node) => {
      if (node.status !== 'pending') return false;

      // Check all dependencies are complete
      for (const depId of node.depends_on) {
        const dep = graph.nodes.find((n) => n.id === depId);
        if (!dep || (dep.status !== 'completed' && dep.status !== 'skipped')) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Estimate total cost from workflow
   */
  estimateCost(design: WorkflowDesign, agentRates: Record<string, number>): number {
    let totalCost = 0;
    const timePerStep = design.estimated_time_minutes / design.steps.length;

    for (const step of design.steps) {
      const rate = agentRates[step.agent_role] || 50; // Default $50/hr
      totalCost += (rate / 60) * timePerStep;
    }

    return Math.round(totalCost * 100) / 100;
  }
}

export const workflowService = new WorkflowService();
