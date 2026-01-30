/**
 * Evo Types
 *
 * Type definitions for Evo, the AI Chief Operating Officer.
 * These types match the backend schemas in schemas.py
 */

// ============== Chat Types ==============

export interface EvoChatRequest {
  message: string;
  team_id: number;
  context?: Record<string, unknown>;
}

export interface EvoChatResponse {
  success: boolean;
  response: string;
  team_id: number;
  timestamp?: string;
  error?: string;
}

// ============== Task Analysis Types ==============

export interface EvoSubtask {
  id: string;
  title: string;
  description: string;
  agent_type?: string;
}

export interface EvoSuggestedAgent {
  role: string;
  specialty: string;
  reason: string;
}

export interface EvoTaskAnalysis {
  understanding: string;
  subtasks: EvoSubtask[];
  suggested_agents: EvoSuggestedAgent[];
  assumptions: string[];
  questions: string[];
  estimated_complexity: 'simple' | 'moderate' | 'complex' | 'unknown';
  confidence: number;
}

export interface EvoTaskAnalysisRequest {
  task: string;
  team_id: number;
  context?: string;
}

export interface EvoTaskAnalysisResponse {
  success: boolean;
  analysis?: EvoTaskAnalysis;
  raw_response?: string;
  team_id: number;
  error?: string;
  parse_error?: boolean;
}

// ============== Workflow Types ==============

export interface EvoWorkflowStep {
  id: string;
  name: string;
  description: string;
  agent_role?: string;
  inputs: string[];
  outputs: string[];
  depends_on: string[];
}

export interface EvoWorkflowSuggestion {
  title: string;
  description: string;
  steps: EvoWorkflowStep[];
  estimated_cost: number;
  estimated_time_minutes: number;
}

export interface EvoWorkflowRequest {
  task: string;
  team_id: number;
  analysis?: EvoTaskAnalysis;
}

export interface EvoWorkflowResponse {
  success: boolean;
  workflow?: EvoWorkflowSuggestion;
  raw_response?: string;
  error?: string;
  parse_error?: boolean;
}

// ============== Quick Task Types ==============

export interface EvoQuickTaskResponse {
  success: boolean;
  task: string;
  team_id: number;
  analysis: EvoTaskAnalysis;
  workflow?: EvoWorkflowSuggestion;
  has_questions: boolean;
  questions: string[];
  assumptions: string[];
  suggested_agents: EvoSuggestedAgent[];
  ready_to_execute: boolean;
}

// ============== Conversation Types ==============

export interface EvoMessage {
  id?: string;
  role: 'user' | 'evo';
  content: string;
  timestamp: string;
  metadata?: {
    type?: 'chat' | 'analysis' | 'workflow' | 'question';
    analysis?: EvoTaskAnalysis;
    workflow?: EvoWorkflowSuggestion;
  };
}

export interface EvoConversation {
  team_id: number;
  messages: EvoMessage[];
  last_updated: string;
}

// ============== UI State Types ==============

export interface EvoState {
  isLoading: boolean;
  error: string | null;
  conversation: EvoMessage[];
  currentAnalysis: EvoTaskAnalysis | null;
  currentWorkflow: EvoWorkflowSuggestion | null;
  pendingQuestions: string[];
}

export type EvoAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_MESSAGE'; payload: EvoMessage }
  | { type: 'SET_ANALYSIS'; payload: EvoTaskAnalysis | null }
  | { type: 'SET_WORKFLOW'; payload: EvoWorkflowSuggestion | null }
  | { type: 'SET_PENDING_QUESTIONS'; payload: string[] }
  | { type: 'CLEAR_CONVERSATION' };
