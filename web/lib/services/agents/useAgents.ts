/**
 * Agent Hooks
 *
 * React hooks for agent data and operations.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { agentService } from './agent.service';
import type {
  Agent,
  AgentTemplate,
  MarketplaceCategory,
  HiredAgent,
  HireAgentRequest,
} from './types';

// ==================== Marketplace Hook ====================

interface UseMarketplaceOptions {
  category?: string;
  featured?: boolean;
  autoFetch?: boolean;
}

interface UseMarketplaceReturn {
  templates: AgentTemplate[];
  categories: MarketplaceCategory[];
  isLoading: boolean;
  error: string | null;
  fetchTemplates: (options?: { category?: string; featured?: boolean }) => Promise<void>;
  fetchCategories: () => Promise<void>;
  getTemplate: (templateId: string) => Promise<AgentTemplate | null>;
  hireAgent: (request: HireAgentRequest) => Promise<Agent | null>;
}

export function useMarketplace(options: UseMarketplaceOptions = {}): UseMarketplaceReturn {
  const { category, featured, autoFetch = true } = options;

  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (fetchOptions?: { category?: string; featured?: boolean }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await agentService.getMarketplaceAgents(fetchOptions);
      setTemplates(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(message);
      console.error('Error fetching marketplace templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await agentService.getMarketplaceCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const getTemplate = useCallback(async (templateId: string): Promise<AgentTemplate | null> => {
    try {
      return await agentService.getMarketplaceAgent(templateId);
    } catch (err) {
      console.error('Error fetching template:', err);
      return null;
    }
  }, []);

  const hireAgent = useCallback(async (request: HireAgentRequest): Promise<Agent | null> => {
    try {
      return await agentService.hireAgent(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to hire agent';
      setError(message);
      console.error('Error hiring agent:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchTemplates({ category, featured });
      fetchCategories();
    }
  }, [autoFetch, category, featured, fetchTemplates, fetchCategories]);

  return {
    templates,
    categories,
    isLoading,
    error,
    fetchTemplates,
    fetchCategories,
    getTemplate,
    hireAgent,
  };
}

// ==================== Team Agents Hook ====================

interface UseTeamAgentsOptions {
  teamId: number | string;
  autoFetch?: boolean;
}

interface UseTeamAgentsReturn {
  agents: HiredAgent[];
  isLoading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  getAgent: (agentId: number | string) => Promise<Agent | null>;
  updateAgent: (agentId: number | string, data: Partial<Agent>) => Promise<Agent | null>;
  fireAgent: (agentId: number | string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useTeamAgents(options: UseTeamAgentsOptions): UseTeamAgentsReturn {
  const { teamId, autoFetch = true } = options;

  const [agents, setAgents] = useState<HiredAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await agentService.getTeamAgents(teamId);

      // Enhance with computed properties
      const enhanced: HiredAgent[] = data.map((agent) => {
        const { progress, nextLevelXp } = agentService.calculateLevelProgress(agent.experience_points);
        return {
          ...agent,
          levelProgress: progress,
          nextLevelXp,
        };
      });

      setAgents(enhanced);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(message);
      console.error('Error fetching team agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const getAgent = useCallback(async (agentId: number | string): Promise<Agent | null> => {
    try {
      return await agentService.getAgent(agentId);
    } catch (err) {
      console.error('Error fetching agent:', err);
      return null;
    }
  }, []);

  const updateAgent = useCallback(async (agentId: number | string, data: Partial<Agent>): Promise<Agent | null> => {
    try {
      const updated = await agentService.updateAgent(agentId, data);
      // Refresh list
      await fetchAgents();
      return updated;
    } catch (err) {
      console.error('Error updating agent:', err);
      return null;
    }
  }, [fetchAgents]);

  const fireAgent = useCallback(async (agentId: number | string): Promise<boolean> => {
    try {
      await agentService.fireAgent(agentId);
      // Refresh list
      await fetchAgents();
      return true;
    } catch (err) {
      console.error('Error firing agent:', err);
      return false;
    }
  }, [fetchAgents]);

  useEffect(() => {
    if (autoFetch && teamId) {
      fetchAgents();
    }
  }, [autoFetch, teamId, fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    fetchAgents,
    getAgent,
    updateAgent,
    fireAgent,
    refresh: fetchAgents,
  };
}

// ==================== Single Agent Hook ====================

interface UseAgentsOptions {
  agentId?: number | string;
  autoFetch?: boolean;
}

interface UseAgentsReturn {
  agent: Agent | null;
  isLoading: boolean;
  error: string | null;
  fetchAgent: (id: number | string) => Promise<void>;
  submitFeedback: (rating: number, feedback?: string) => Promise<boolean>;
}

export function useAgents(options: UseAgentsOptions = {}): UseAgentsReturn {
  const { agentId, autoFetch = true } = options;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async (id: number | string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await agentService.getAgent(id);
      setAgent(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agent';
      setError(message);
      console.error('Error fetching agent:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitFeedback = useCallback(async (rating: number, feedback?: string): Promise<boolean> => {
    if (!agent) return false;

    try {
      await agentService.submitFeedback(agent.id, { rating, feedback });
      // Refresh agent data
      await fetchAgent(agent.id);
      return true;
    } catch (err) {
      console.error('Error submitting feedback:', err);
      return false;
    }
  }, [agent, fetchAgent]);

  useEffect(() => {
    if (autoFetch && agentId) {
      fetchAgent(agentId);
    }
  }, [autoFetch, agentId, fetchAgent]);

  return {
    agent,
    isLoading,
    error,
    fetchAgent,
    submitFeedback,
  };
}
