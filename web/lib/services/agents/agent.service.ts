/**
 * Agent Service
 *
 * API integration for agent marketplace and team agents.
 */

import { api } from '../api/client';
import type {
  Agent,
  AgentTemplate,
  MarketplaceCategory,
  HireAgentRequest,
  AgentFeedback,
  AgentUpdateRequest,
} from './types';

class AgentService {
  // ==================== Marketplace ====================

  /**
   * Get all agent templates from the marketplace
   */
  async getMarketplaceAgents(options?: {
    category?: string;
    featured?: boolean;
  }): Promise<AgentTemplate[]> {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.featured !== undefined) params.append('featured', String(options.featured));

    const queryString = params.toString();
    const url = queryString ? `/api/marketplace/agents?${queryString}` : '/api/marketplace/agents';

    return api.get<AgentTemplate[]>(url);
  }

  /**
   * Get a specific agent template
   */
  async getMarketplaceAgent(templateId: string): Promise<AgentTemplate> {
    return api.get<AgentTemplate>(`/api/marketplace/agents/${templateId}`);
  }

  /**
   * Get marketplace categories
   */
  async getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
    return api.get<MarketplaceCategory[]>('/api/marketplace/categories');
  }

  /**
   * Hire an agent from the marketplace
   */
  async hireAgent(request: HireAgentRequest): Promise<Agent> {
    return api.post<Agent>('/api/marketplace/agents/hire', request);
  }

  // ==================== Team Agents ====================

  /**
   * Get all agents for a team
   */
  async getTeamAgents(teamId: number | string): Promise<Agent[]> {
    return api.get<Agent[]>(`/api/teams/${teamId}/agents`);
  }

  /**
   * Get a specific agent
   */
  async getAgent(agentId: number | string): Promise<Agent> {
    return api.get<Agent>(`/api/agents/${agentId}`);
  }

  /**
   * Update an agent
   */
  async updateAgent(agentId: number | string, data: AgentUpdateRequest): Promise<Agent> {
    return api.put<Agent>(`/api/agents/${agentId}`, data);
  }

  /**
   * Delete/fire an agent
   */
  async fireAgent(agentId: number | string): Promise<void> {
    return api.delete(`/api/agents/${agentId}`);
  }

  /**
   * Submit feedback for an agent
   */
  async submitFeedback(agentId: number | string, feedback: AgentFeedback): Promise<void> {
    return api.post(`/api/agents/${agentId}/feedback`, feedback);
  }

  // ==================== Agent Execution ====================

  /**
   * Execute a task with an agent (placeholder for future implementation)
   */
  async executeTask(agentId: number | string, task: string): Promise<{ success: boolean; output?: string; error?: string }> {
    // This will connect to the agent execution system when ready
    // For now, use the Evo chat endpoint
    return api.post(`/api/agents/${agentId}/execute`, { task });
  }

  // ==================== Utilities ====================

  /**
   * Calculate level progress percentage
   */
  calculateLevelProgress(xp: number): { progress: number; nextLevelXp: number } {
    const xpPerLevel = 100;
    const currentLevelXp = xp % xpPerLevel;
    const progress = (currentLevelXp / xpPerLevel) * 100;
    const nextLevelXp = xpPerLevel - currentLevelXp;

    return { progress, nextLevelXp };
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'available':
        return 'bg-emerald-500';
      case 'busy':
        return 'bg-amber-500';
      case 'offline':
        return 'bg-slate-500';
      default:
        return 'bg-slate-500';
    }
  }

  /**
   * Format cost display
   */
  formatCost(costPerHour: number): string {
    return `$${costPerHour.toFixed(2)}/hr`;
  }
}

export const agentService = new AgentService();
