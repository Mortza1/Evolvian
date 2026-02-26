/**
 * Evolution Types
 *
 * Types for workflow evolution data.
 */

export interface WorkflowDNA {
  signature: string;
  task_type: string;
  agents: string[];
  node_count: number;
  avg_cost: number;
  avg_latency_ms: number;
  avg_quality_score: number;
  execution_count: number;
  success_rate: number;
  fitness_score: number;
}

export interface EvolutionSuggestion {
  suggestion_type: string;
  description: string;
  confidence: number;
  expected_improvement: string;
  details: Record<string, unknown>;
}

export interface WorkflowStats {
  task_type: string;
  total_executions: number;
  unique_workflows: number;
  best_workflow: WorkflowDNA | null;
  avg_cost: number;
  avg_quality: number;
  avg_latency_ms: number;
  cost_quality_ratio: number;
  top_workflows: WorkflowDNA[];
}

export interface EvolutionStatsResponse {
  team_id: number;
  task_types: string[];
  stats: Record<string, WorkflowStats>;
  total_task_types: number;
}

export interface EvolutionSuggestionsResponse {
  team_id: number;
  task_type: string;
  current_signature: string | null;
  best_workflow: WorkflowDNA | null;
  suggestions: EvolutionSuggestion[];
}

export interface AgentPerformance {
  agent_name: string;
  agent_id: number;
  total_executions: number;
  avg_quality: number;
  best_quality: number;
  worst_quality: number;
  avg_cost: number;
  success_rate: number;
  user_avg_rating: number;
  rated_count: number;
  best_task_type: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface AgentPerformanceResponse {
  team_id: number;
  agents: AgentPerformance[];
  total_agents: number;
}

export interface WorkflowComparisonResponse {
  team_id: number;
  task_type: string;
  workflow_a: {
    signature: string;
    metrics: {
      execution_count: number;
      avg_cost: number;
      avg_quality: number;
      avg_latency_ms: number;
      agents: string[];
    } | null;
  };
  workflow_b: {
    signature: string;
    metrics: {
      execution_count: number;
      avg_cost: number;
      avg_quality: number;
      avg_latency_ms: number;
      agents: string[];
    } | null;
  };
  winner: 'A' | 'B' | 'Tie' | null;
}
