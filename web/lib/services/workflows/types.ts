/**
 * Workflow Types
 *
 * TypeScript interfaces for workflow-related data structures.
 * Mirrors the backend core/workflows types.
 */

// ==================== Workflow Node Types ====================

export type WorkflowNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowNode {
  id: string;
  name: string;
  description: string;
  agent_role: string;
  inputs: string[];
  outputs: string[];
  depends_on: string[];
  status: WorkflowNodeStatus;
  assigned_agent?: string;
  result?: Record<string, unknown>;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

// ==================== Workflow Graph Types ====================

export interface WorkflowGraph {
  goal: string;
  nodes: WorkflowNode[];
  context: Record<string, unknown>;
  is_complete: boolean;
  has_failed: boolean;
}

// ==================== Workflow Design Types ====================

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agent_role: string;
  inputs: string[];
  outputs: string[];
  depends_on: string[];
}

export interface WorkflowDesign {
  title: string;
  description: string;
  steps: WorkflowStep[];
  estimated_time_minutes: number;
  estimated_cost: number;
}

// ==================== Execution Types ====================

export interface ExecutionResult {
  success: boolean;
  workflow_id: string;
  output?: unknown;
  all_outputs?: Record<string, unknown>;
  error?: string;
  duration_seconds: number;
  nodes_completed: number;
  nodes_failed: number;
  nodes_total: number;
}

export interface ExecutionStatus {
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  graph: WorkflowGraph;
  progress: number; // 0-100
  current_node?: WorkflowNode;
}

// ==================== Request Types ====================

export interface BuildWorkflowRequest {
  task: string;
  team_id: number;
  context?: Record<string, unknown>;
}

export interface ExecuteWorkflowRequest {
  operation_id: number;
  inputs?: Record<string, unknown>;
}

// ==================== Analysis Types (from Evo) ====================

export interface TaskAnalysis {
  understanding: string;
  subtasks: {
    id: string;
    title: string;
    description: string;
    agent_type: string;
  }[];
  suggested_agents: {
    role: string;
    specialty: string;
    reason: string;
  }[];
  assumptions: string[];
  questions: string[];
  estimated_complexity: 'simple' | 'moderate' | 'complex';
  confidence: number;
}

// ==================== UI Helper Types ====================

export interface WorkflowNodeUI extends WorkflowNode {
  // UI-specific properties
  isSelected?: boolean;
  isHighlighted?: boolean;
  progress?: number; // 0-100 for running nodes
}

export interface WorkflowGraphUI extends Omit<WorkflowGraph, 'nodes'> {
  nodes: WorkflowNodeUI[];
  // UI state
  selectedNodeId?: string;
  executionProgress?: number;
}
