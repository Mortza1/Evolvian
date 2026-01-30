/**
 * Evo Service Module
 *
 * Export all Evo-related services, hooks, and types.
 */

// Service
export { evoService, chat, analyzeTask, designWorkflow, quickTask } from './evo.service';

// Hook
export { useEvo } from './useEvo';
export type { UseEvoOptions, UseEvoReturn } from './useEvo';

// Re-export types for convenience
export type {
  EvoChatRequest,
  EvoChatResponse,
  EvoTaskAnalysisRequest,
  EvoTaskAnalysisResponse,
  EvoWorkflowRequest,
  EvoWorkflowResponse,
  EvoQuickTaskResponse,
  EvoMessage,
  EvoConversation,
  EvoSubtask,
  EvoSuggestedAgent,
  EvoTaskAnalysis,
  EvoWorkflowStep,
  EvoWorkflowSuggestion,
  EvoState,
  EvoAction,
} from '../../types/evo';
