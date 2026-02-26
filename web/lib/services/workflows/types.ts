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

// ==================== Execution Chat Types ====================

export interface ExecutionMessage {
  id: number;
  operation_id: number;
  sender_type: 'user' | 'manager' | 'agent' | 'system';
  sender_name: string;
  sender_id?: number;
  content: string;
  message_type: 'chat' | 'assumption' | 'answer' | 'status' | 'review' | 'instruction' | 'question';
  context?: Record<string, unknown>;
  created_at: string;
}

// ==================== Pending Assumptions (Phase 5.1) ====================

export interface PendingAssumption {
  operation_id: number;
  operation_title: string;
  operation_description: string;
  node_id: string;
  node_name: string;
  agent_name: string;
  agent_photo?: string;
  question: string;
  context?: string;
  options: string[];
  priority: string;
  assumption_index: number;
  waiting_since: string;
  waiting_duration_seconds: number;
}

// ==================== Agent Messages (Phase 5.2) ====================

export interface AgentMessageGroup {
  operation_id: number;
  operation_title: string;
  operation_status: string;
  messages: ExecutionMessage[];
  created_at: string;
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
