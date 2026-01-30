/**
 * Evo Service
 *
 * Service for interacting with Evo, the AI Chief Operating Officer.
 * Handles all Evo-related API calls including chat, task analysis, and workflow design.
 */

import { api } from '../api/client';
import type {
  EvoChatRequest,
  EvoChatResponse,
  EvoTaskAnalysisRequest,
  EvoTaskAnalysisResponse,
  EvoWorkflowRequest,
  EvoWorkflowResponse,
  EvoQuickTaskResponse,
  EvoTaskAnalysis,
} from '../../types/evo';

/**
 * Evo API endpoints
 */
const EVO_ENDPOINTS = {
  CHAT: '/api/evo/chat',
  ANALYZE: '/api/evo/analyze',
  WORKFLOW: '/api/evo/workflow',
  QUICK_TASK: '/api/evo/quick-task',
} as const;

/**
 * Chat with Evo
 *
 * Send a message to Evo and get a conversational response.
 * Evo has context about the team and available agents.
 *
 * @param teamId - The team ID for context
 * @param message - User's message to Evo
 * @param context - Optional additional context
 * @returns Evo's response
 *
 * @example
 * ```ts
 * const response = await evoService.chat(1, "Help me plan a marketing campaign");
 * console.log(response.response); // Evo's reply
 * ```
 */
export async function chat(
  teamId: number,
  message: string,
  context?: Record<string, unknown>
): Promise<EvoChatResponse> {
  const request: EvoChatRequest = {
    message,
    team_id: teamId,
    context,
  };

  return api.post<EvoChatResponse>(EVO_ENDPOINTS.CHAT, request);
}

/**
 * Analyze a task with Evo
 *
 * Ask Evo to break down a task into subtasks, identify required agents,
 * list assumptions, and ask clarifying questions.
 *
 * @param teamId - The team ID for context
 * @param task - The task description to analyze
 * @param context - Optional previous context
 * @returns Task analysis with subtasks, agents, assumptions, and questions
 *
 * @example
 * ```ts
 * const analysis = await evoService.analyzeTask(1, "Create a brand style guide");
 * if (analysis.success) {
 *   console.log(analysis.analysis.subtasks); // List of subtasks
 *   console.log(analysis.analysis.questions); // Clarifying questions
 * }
 * ```
 */
export async function analyzeTask(
  teamId: number,
  task: string,
  context?: string
): Promise<EvoTaskAnalysisResponse> {
  const request: EvoTaskAnalysisRequest = {
    task,
    team_id: teamId,
    context,
  };

  return api.post<EvoTaskAnalysisResponse>(EVO_ENDPOINTS.ANALYZE, request);
}

/**
 * Design a workflow with Evo
 *
 * Ask Evo to design an executable workflow based on a task
 * and optional previous analysis.
 *
 * @param teamId - The team ID for context
 * @param task - The task description
 * @param analysis - Optional previous analysis to build upon
 * @returns Workflow with steps, dependencies, and estimates
 *
 * @example
 * ```ts
 * const workflow = await evoService.designWorkflow(1, "Write a blog post");
 * if (workflow.success) {
 *   console.log(workflow.workflow.steps); // Workflow steps
 *   console.log(workflow.workflow.estimated_cost); // Cost estimate
 * }
 * ```
 */
export async function designWorkflow(
  teamId: number,
  task: string,
  analysis?: EvoTaskAnalysis
): Promise<EvoWorkflowResponse> {
  const request: EvoWorkflowRequest = {
    task,
    team_id: teamId,
    analysis,
  };

  return api.post<EvoWorkflowResponse>(EVO_ENDPOINTS.WORKFLOW, request);
}

/**
 * Quick task processing with Evo
 *
 * One-call convenience method that analyzes a task AND designs a workflow.
 * Use this when you want the full planning in a single request.
 *
 * @param teamId - The team ID for context
 * @param task - The task description
 * @param context - Optional additional context
 * @returns Complete analysis and workflow, plus ready_to_execute flag
 *
 * @example
 * ```ts
 * const result = await evoService.quickTask(1, "Research competitor pricing");
 * if (result.ready_to_execute) {
 *   // No questions - can proceed to execution
 *   console.log(result.workflow);
 * } else {
 *   // Need to answer questions first
 *   console.log(result.questions);
 * }
 * ```
 */
export async function quickTask(
  teamId: number,
  task: string,
  context?: string
): Promise<EvoQuickTaskResponse> {
  const request: EvoTaskAnalysisRequest = {
    task,
    team_id: teamId,
    context,
  };

  return api.post<EvoQuickTaskResponse>(EVO_ENDPOINTS.QUICK_TASK, request);
}

/**
 * Evo Service namespace export
 *
 * Allows importing as: import { evoService } from '@/lib/services/evo'
 */
export const evoService = {
  chat,
  analyzeTask,
  designWorkflow,
  quickTask,
};

export default evoService;
