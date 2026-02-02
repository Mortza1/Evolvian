/**
 * Evolution Hooks
 *
 * React hooks for evolution data and insights.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { evolutionService } from './evolution.service';
import type {
  EvolutionStatsResponse,
  EvolutionSuggestionsResponse,
  WorkflowStats,
  EvolutionSuggestion,
  WorkflowDNA,
} from './types';

// ==================== Evolution Stats Hook ====================

interface UseEvolutionStatsOptions {
  teamId: number | string;
  taskType?: string;
  autoFetch?: boolean;
}

interface UseEvolutionStatsReturn {
  stats: EvolutionStatsResponse | null;
  taskTypes: string[];
  statsByType: Record<string, WorkflowStats>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEvolutionStats(options: UseEvolutionStatsOptions): UseEvolutionStatsReturn {
  const { teamId, taskType, autoFetch = true } = options;

  const [stats, setStats] = useState<EvolutionStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await evolutionService.getStats(teamId, taskType);
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch evolution stats';
      setError(message);
      console.error('Error fetching evolution stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, taskType]);

  useEffect(() => {
    if (autoFetch && teamId) {
      fetchStats();
    }
  }, [autoFetch, teamId, fetchStats]);

  return {
    stats,
    taskTypes: stats?.task_types || [],
    statsByType: stats?.stats || {},
    isLoading,
    error,
    refresh: fetchStats,
  };
}

// ==================== Evolution Suggestions Hook ====================

interface UseEvolutionSuggestionsOptions {
  teamId: number | string;
  taskType: string;
  currentWorkflowSignature?: string;
  autoFetch?: boolean;
}

interface UseEvolutionSuggestionsReturn {
  suggestions: EvolutionSuggestion[];
  bestWorkflow: WorkflowDNA | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEvolutionSuggestions(
  options: UseEvolutionSuggestionsOptions
): UseEvolutionSuggestionsReturn {
  const { teamId, taskType, currentWorkflowSignature, autoFetch = true } = options;

  const [data, setData] = useState<EvolutionSuggestionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!teamId || !taskType) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await evolutionService.getSuggestions(
        teamId,
        taskType,
        currentWorkflowSignature
      );
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch suggestions';
      setError(message);
      console.error('Error fetching evolution suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, taskType, currentWorkflowSignature]);

  useEffect(() => {
    if (autoFetch && teamId && taskType) {
      fetchSuggestions();
    }
  }, [autoFetch, teamId, taskType, fetchSuggestions]);

  return {
    suggestions: data?.suggestions || [],
    bestWorkflow: data?.best_workflow || null,
    isLoading,
    error,
    refresh: fetchSuggestions,
  };
}

// ==================== Helper Functions ====================

/**
 * Format a fitness score as a percentage
 */
export function formatFitness(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get a color class based on fitness score
 */
export function getFitnessColor(score: number): string {
  if (score >= 0.8) return 'text-green-400';
  if (score >= 0.6) return 'text-yellow-400';
  if (score >= 0.4) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Format task type for display
 */
export function formatTaskType(taskType: string): string {
  return taskType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get suggestion type icon
 */
export function getSuggestionIcon(type: string): string {
  switch (type) {
    case 'use_proven_workflow':
      return '✓';
    case 'add_agent':
      return '+';
    case 'remove_agent':
      return '-';
    case 'optimize_cost':
      return '$';
    case 'need_more_data':
      return '?';
    default:
      return '→';
  }
}
