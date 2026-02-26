/**
 * Evolution Service
 *
 * API client for evolution endpoints.
 */

import { api } from '../api';
import type {
  EvolutionStatsResponse,
  EvolutionSuggestionsResponse,
  WorkflowComparisonResponse,
  AgentPerformanceResponse,
} from './types';

const API_BASE = '/api/operations/evolution';

export const evolutionService = {
  /**
   * Get evolution statistics for a team
   */
  async getStats(teamId: number | string, taskType?: string): Promise<EvolutionStatsResponse> {
    const params = new URLSearchParams();
    if (taskType) {
      params.append('task_type', taskType);
    }
    const queryString = params.toString();
    const url = `${API_BASE}/stats/${teamId}${queryString ? `?${queryString}` : ''}`;
    return api.get<EvolutionStatsResponse>(url);
  },

  /**
   * Get improvement suggestions for a workflow
   */
  async getSuggestions(
    teamId: number | string,
    taskType: string,
    currentWorkflowSignature?: string
  ): Promise<EvolutionSuggestionsResponse> {
    const params = new URLSearchParams({ task_type: taskType });
    if (currentWorkflowSignature) {
      params.append('current_workflow_signature', currentWorkflowSignature);
    }
    return api.get<EvolutionSuggestionsResponse>(
      `${API_BASE}/suggestions/${teamId}?${params.toString()}`
    );
  },

  /**
   * Get per-agent performance stats from execution history
   */
  async getAgentPerformance(
    teamId: number | string,
    agentName?: string
  ): Promise<AgentPerformanceResponse> {
    const params = new URLSearchParams();
    if (agentName) {
      params.append('agent_name', agentName);
    }
    const queryString = params.toString();
    const url = `${API_BASE}/agent-performance/${teamId}${queryString ? `?${queryString}` : ''}`;
    return api.get<AgentPerformanceResponse>(url);
  },

  /**
   * Compare two workflows head-to-head
   */
  async compareWorkflows(
    teamId: number | string,
    taskType: string,
    signatureA: string,
    signatureB: string
  ): Promise<WorkflowComparisonResponse> {
    const params = new URLSearchParams({
      task_type: taskType,
      signature_a: signatureA,
      signature_b: signatureB,
    });
    return api.get<WorkflowComparisonResponse>(
      `${API_BASE}/compare/${teamId}?${params.toString()}`
    );
  },
};
