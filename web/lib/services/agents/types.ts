/**
 * Agent Types
 *
 * TypeScript interfaces for agent-related data structures.
 */

// ==================== Shared Types ====================

export type SeniorityLevel = 'specialist' | 'practitioner' | 'manager';

// ==================== Marketplace Types ====================

export interface AgentTemplate {
  id: string;
  name: string;
  role: string;
  specialty: string;
  description: string;
  level: number;
  base_cost_per_hour: number;
  skills: string[];
  personality_traits: string[];
  category: string;
  rating: number;
  hires_count: number;
  is_featured: boolean;
  is_premium: boolean;
  avatar_url?: string;
  seniority_level: SeniorityLevel;
  can_delegate: boolean;
  can_ask_questions: boolean;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  agent_count: number;
}

export interface HireAgentRequest {
  team_id: number;
  template_id: string;
  custom_name?: string;
}

// ==================== Team Agent Types ====================

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'url' | 'document';
}

export interface Agent {
  id: number;
  team_id: number;
  name: string;
  role: string;
  specialty: string;
  level: number;
  photo_url?: string;
  avatar_seed?: string;
  rating: number;
  tasks_completed: number;
  accuracy: number;
  speed: number;
  cost_per_hour: number;
  status: 'available' | 'busy' | 'offline';
  is_online: boolean;
  skills: string[];
  personality_traits: string[];
  tools_access: string[];
  experience_points: number;
  evolution_history: EvolutionEvent[];
  hired_at: string;
  last_active_at?: string;
  // Intelligence
  system_prompt?: string;
  model_id?: string;
  seniority_level: SeniorityLevel;
  can_delegate: boolean;
  delegates_to: number[];
  can_ask_questions: boolean;
  knowledge_base: KnowledgeEntry[];
}

export interface AgentCreateRequest {
  team_id: number;
  name: string;
  role: string;
  specialty: string;
  level?: number;
  cost_per_hour?: number;
  skills?: string[];
  personality_traits?: string[];
  system_prompt?: string;
  model_id?: string;
  seniority_level?: SeniorityLevel;
  can_delegate?: boolean;
  delegates_to?: number[];
  can_ask_questions?: boolean;
  knowledge_base?: KnowledgeEntry[];
}

export interface EvolutionEvent {
  type: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// Extended agent with local UI state
export interface HiredAgent extends Agent {
  // UI-specific state
  isSelected?: boolean;
  isExpanded?: boolean;

  // Computed properties
  levelProgress: number; // 0-100 for progress bar
  nextLevelXp: number;
}

// ==================== Agent Operations ====================

export interface AgentFeedback {
  rating: number;
  feedback?: string;
}

export interface AgentUpdateRequest {
  name?: string;
  status?: 'available' | 'busy' | 'offline';
  is_online?: boolean;
  skills?: string[];
  tools_access?: string[];
}

export interface AgentExecuteRequest {
  task: string;
}

export interface AgentExecuteResponse {
  success: boolean;
  output?: string;
  error?: string;
  agent: string;
  tasks_completed?: number;
  level?: number;
}

// ==================== API Responses ====================

export interface AgentListResponse {
  agents: Agent[];
  total: number;
}

export interface MarketplaceResponse {
  templates: AgentTemplate[];
  categories: MarketplaceCategory[];
}
