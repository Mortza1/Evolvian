/**
 * Agent Services Module
 *
 * Provides API integration for agent marketplace and team agents.
 */

export { agentService } from './agent.service';
export { useAgents, useTeamAgents, useMarketplace } from './useAgents';
export type {
  Agent,
  AgentTemplate,
  HiredAgent,
  MarketplaceCategory,
  HireAgentRequest,
  AgentFeedback,
  AgentCreateRequest,
  KnowledgeEntry,
  SeniorityLevel,
} from './types';
