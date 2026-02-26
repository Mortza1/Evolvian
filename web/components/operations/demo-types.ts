/**
 * Demo Operation Types
 *
 * Types that were used by legacy demo components (LiveOffice, OperationFlow, AssumptionDialog).
 * Kept for backward compatibility with any remaining code that references these types.
 *
 * @deprecated These types are from legacy demo components and should not be used for new code.
 * For real execution, use the types from @/lib/services/workflows/types.ts
 */

import type { Agent } from '@/lib/agents';

export interface Assumption {
  agent: Agent;
  question: string;
  context: string;
}

export interface OperationResult {
  summary: string;
  findings: string[];
  recommendations: string[];
  time_taken: number;
  cost: number;
}
