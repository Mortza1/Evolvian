/**
 * useEvo Hook
 *
 * React hook for interacting with Evo in components.
 * Provides state management, loading states, and error handling.
 */

'use client';

import { useState, useCallback, useReducer } from 'react';
import { evoService } from './evo.service';
import type {
  EvoMessage,
  EvoState,
  EvoAction,
  EvoTaskAnalysis,
  EvoWorkflowSuggestion,
  EvoChatResponse,
  EvoTaskAnalysisResponse,
  EvoWorkflowResponse,
  EvoQuickTaskResponse,
} from '../../types/evo';

/**
 * Initial state for Evo
 */
const initialState: EvoState = {
  isLoading: false,
  error: null,
  conversation: [],
  currentAnalysis: null,
  currentWorkflow: null,
  pendingQuestions: [],
};

/**
 * Reducer for Evo state management
 */
function evoReducer(state: EvoState, action: EvoAction): EvoState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'ADD_MESSAGE':
      return { ...state, conversation: [...state.conversation, action.payload] };
    case 'SET_ANALYSIS':
      return { ...state, currentAnalysis: action.payload };
    case 'SET_WORKFLOW':
      return { ...state, currentWorkflow: action.payload };
    case 'SET_PENDING_QUESTIONS':
      return { ...state, pendingQuestions: action.payload };
    case 'CLEAR_CONVERSATION':
      return {
        ...state,
        conversation: [],
        currentAnalysis: null,
        currentWorkflow: null,
        pendingQuestions: [],
      };
    default:
      return state;
  }
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new Evo message
 */
function createMessage(
  role: 'user' | 'evo',
  content: string,
  metadata?: EvoMessage['metadata']
): EvoMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

/**
 * Hook options
 */
export interface UseEvoOptions {
  teamId: number;
  onError?: (error: string) => void;
  onMessage?: (message: EvoMessage) => void;
}

/**
 * Hook return type
 */
export interface UseEvoReturn {
  // State
  state: EvoState;
  isLoading: boolean;
  error: string | null;
  conversation: EvoMessage[];
  currentAnalysis: EvoTaskAnalysis | null;
  currentWorkflow: EvoWorkflowSuggestion | null;
  pendingQuestions: string[];

  // Actions
  sendMessage: (message: string, context?: Record<string, unknown>) => Promise<EvoChatResponse | null>;
  analyzeTask: (task: string, context?: string) => Promise<EvoTaskAnalysisResponse | null>;
  designWorkflow: (task: string, analysis?: EvoTaskAnalysis) => Promise<EvoWorkflowResponse | null>;
  quickTask: (task: string, context?: string) => Promise<EvoQuickTaskResponse | null>;
  clearConversation: () => void;
  clearError: () => void;
}

/**
 * useEvo Hook
 *
 * @param options - Hook configuration options
 * @returns Evo state and action methods
 *
 * @example
 * ```tsx
 * function EvoChat({ teamId }: { teamId: number }) {
 *   const { sendMessage, conversation, isLoading } = useEvo({ teamId });
 *
 *   const handleSend = async (message: string) => {
 *     await sendMessage(message);
 *   };
 *
 *   return (
 *     <div>
 *       {conversation.map(msg => (
 *         <div key={msg.id}>{msg.content}</div>
 *       ))}
 *       {isLoading && <div>Evo is thinking...</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEvo(options: UseEvoOptions): UseEvoReturn {
  const { teamId, onError, onMessage } = options;
  const [state, dispatch] = useReducer(evoReducer, initialState);

  /**
   * Send a chat message to Evo
   */
  const sendMessage = useCallback(
    async (message: string, context?: Record<string, unknown>): Promise<EvoChatResponse | null> => {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Add user message to conversation
      const userMessage = createMessage('user', message);
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
      onMessage?.(userMessage);

      try {
        const response = await evoService.chat(teamId, message, context);

        if (response.success) {
          const evoMessage = createMessage('evo', response.response, { type: 'chat' });
          dispatch({ type: 'ADD_MESSAGE', payload: evoMessage });
          onMessage?.(evoMessage);
        } else {
          const errorMsg = response.error || 'Failed to get response from Evo';
          dispatch({ type: 'SET_ERROR', payload: errorMsg });
          onError?.(errorMsg);
        }

        dispatch({ type: 'SET_LOADING', payload: false });
        return response;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        onError?.(errorMsg);
        return null;
      }
    },
    [teamId, onError, onMessage]
  );

  /**
   * Analyze a task with Evo
   */
  const analyzeTask = useCallback(
    async (task: string, context?: string): Promise<EvoTaskAnalysisResponse | null> => {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Add user message
      const userMessage = createMessage('user', task);
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
      onMessage?.(userMessage);

      try {
        const response = await evoService.analyzeTask(teamId, task, context);

        if (response.success && response.analysis) {
          dispatch({ type: 'SET_ANALYSIS', payload: response.analysis });

          // Set pending questions if any
          if (response.analysis.questions.length > 0) {
            dispatch({ type: 'SET_PENDING_QUESTIONS', payload: response.analysis.questions });
          }

          // Add Evo's analysis as a message
          const analysisContent = formatAnalysisMessage(response.analysis);
          const evoMessage = createMessage('evo', analysisContent, {
            type: 'analysis',
            analysis: response.analysis,
          });
          dispatch({ type: 'ADD_MESSAGE', payload: evoMessage });
          onMessage?.(evoMessage);
        } else {
          const errorMsg = response.error || 'Failed to analyze task';
          dispatch({ type: 'SET_ERROR', payload: errorMsg });
          onError?.(errorMsg);
        }

        dispatch({ type: 'SET_LOADING', payload: false });
        return response;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        onError?.(errorMsg);
        return null;
      }
    },
    [teamId, onError, onMessage]
  );

  /**
   * Design a workflow with Evo
   */
  const designWorkflow = useCallback(
    async (task: string, analysis?: EvoTaskAnalysis): Promise<EvoWorkflowResponse | null> => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const response = await evoService.designWorkflow(teamId, task, analysis);

        if (response.success && response.workflow) {
          dispatch({ type: 'SET_WORKFLOW', payload: response.workflow });

          // Add workflow as a message
          const workflowContent = formatWorkflowMessage(response.workflow);
          const evoMessage = createMessage('evo', workflowContent, {
            type: 'workflow',
            workflow: response.workflow,
          });
          dispatch({ type: 'ADD_MESSAGE', payload: evoMessage });
          onMessage?.(evoMessage);
        } else {
          const errorMsg = response.error || 'Failed to design workflow';
          dispatch({ type: 'SET_ERROR', payload: errorMsg });
          onError?.(errorMsg);
        }

        dispatch({ type: 'SET_LOADING', payload: false });
        return response;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        onError?.(errorMsg);
        return null;
      }
    },
    [teamId, onError, onMessage]
  );

  /**
   * Quick task - analyze and design workflow in one call
   */
  const quickTask = useCallback(
    async (task: string, context?: string): Promise<EvoQuickTaskResponse | null> => {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Add user message
      const userMessage = createMessage('user', task);
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
      onMessage?.(userMessage);

      try {
        const response = await evoService.quickTask(teamId, task, context);

        if (response.success) {
          // Set analysis
          dispatch({ type: 'SET_ANALYSIS', payload: response.analysis });

          // Set workflow if available
          if (response.workflow) {
            dispatch({ type: 'SET_WORKFLOW', payload: response.workflow });
          }

          // Set pending questions
          if (response.questions.length > 0) {
            dispatch({ type: 'SET_PENDING_QUESTIONS', payload: response.questions });
          }

          // Format combined response
          const combinedContent = formatQuickTaskMessage(response);
          const evoMessage = createMessage('evo', combinedContent, {
            type: 'analysis',
            analysis: response.analysis,
            workflow: response.workflow,
          });
          dispatch({ type: 'ADD_MESSAGE', payload: evoMessage });
          onMessage?.(evoMessage);
        }

        dispatch({ type: 'SET_LOADING', payload: false });
        return response;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        onError?.(errorMsg);
        return null;
      }
    },
    [teamId, onError, onMessage]
  );

  /**
   * Clear conversation
   */
  const clearConversation = useCallback(() => {
    dispatch({ type: 'CLEAR_CONVERSATION' });
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  return {
    state,
    isLoading: state.isLoading,
    error: state.error,
    conversation: state.conversation,
    currentAnalysis: state.currentAnalysis,
    currentWorkflow: state.currentWorkflow,
    pendingQuestions: state.pendingQuestions,
    sendMessage,
    analyzeTask,
    designWorkflow,
    quickTask,
    clearConversation,
    clearError,
  };
}

// ============== Helper Functions ==============

/**
 * Format analysis into a readable message
 */
function formatAnalysisMessage(analysis: EvoTaskAnalysis): string {
  let message = `**Understanding:** ${analysis.understanding}\n\n`;

  if (analysis.subtasks.length > 0) {
    message += `**Subtasks:**\n`;
    analysis.subtasks.forEach((subtask, i) => {
      message += `${i + 1}. **${subtask.title}** - ${subtask.description}\n`;
    });
    message += '\n';
  }

  if (analysis.suggested_agents.length > 0) {
    message += `**Suggested Team Members:**\n`;
    analysis.suggested_agents.forEach(agent => {
      message += `- **${agent.role}** (${agent.specialty}): ${agent.reason}\n`;
    });
    message += '\n';
  }

  if (analysis.assumptions.length > 0) {
    message += `**Assumptions I'm making:**\n`;
    analysis.assumptions.forEach(assumption => {
      message += `- ${assumption}\n`;
    });
    message += '\n';
  }

  if (analysis.questions.length > 0) {
    message += `**Questions I need answered:**\n`;
    analysis.questions.forEach((question, i) => {
      message += `${i + 1}. ${question}\n`;
    });
  }

  message += `\n*Complexity: ${analysis.estimated_complexity} | Confidence: ${Math.round(analysis.confidence * 100)}%*`;

  return message;
}

/**
 * Format workflow into a readable message
 */
function formatWorkflowMessage(workflow: EvoWorkflowSuggestion): string {
  let message = `**Workflow: ${workflow.title}**\n\n`;
  message += `${workflow.description}\n\n`;

  message += `**Steps:**\n`;
  workflow.steps.forEach((step, i) => {
    message += `${i + 1}. **${step.name}**\n`;
    message += `   ${step.description}\n`;
    if (step.agent_role) {
      message += `   *Assigned to: ${step.agent_role}*\n`;
    }
  });

  message += `\n**Estimates:**\n`;
  message += `- Cost: $${workflow.estimated_cost.toFixed(2)}\n`;
  message += `- Time: ${workflow.estimated_time_minutes} minutes\n`;

  return message;
}

/**
 * Format quick task response into a readable message
 */
function formatQuickTaskMessage(response: EvoQuickTaskResponse): string {
  let message = formatAnalysisMessage(response.analysis);

  if (response.workflow) {
    message += '\n---\n\n';
    message += formatWorkflowMessage(response.workflow);
  }

  if (response.ready_to_execute) {
    message += '\n\n**Ready to execute!** All information gathered.';
  } else {
    message += '\n\n**Awaiting your input** before I can proceed.';
  }

  return message;
}

export default useEvo;
