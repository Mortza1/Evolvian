import type { Agent } from './agents';
import type { OperationConfig } from '@/components/operations/OperationDashboard';
import type { OperationResult } from '@/components/operations/demo-types';

export interface AgentContribution {
  agent: Agent;
  task: string;
  input: string;
  output: string;
  timeTaken: number; // in seconds
  status: 'completed' | 'failed' | 'skipped';
}

export interface StoredOperation {
  id: string;
  teamId: string;
  timestamp: Date;
  config: OperationConfig;
  team: Agent[];
  cost: number;
  timeTaken: number; // in minutes
  status: 'completed' | 'failed' | 'in_progress';
  result: OperationResult;
  agentContributions: AgentContribution[];
  userFeedback?: {
    agentId: string;
    rating: number;
    comment: string;
    evolutionTrigger?: string;
  }[];
}

const STORAGE_KEY = 'evolvian_operations';

export function saveOperation(operation: StoredOperation): void {
  if (typeof window === 'undefined') return;

  const operations = getAllOperations();
  operations.push(operation);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
  } catch (error) {
    console.error('Failed to save operation:', error);
  }
}

export function getAllOperations(): StoredOperation[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const operations = JSON.parse(data);
    // Convert timestamp strings back to Date objects
    return operations.map((op: any) => ({
      ...op,
      timestamp: new Date(op.timestamp),
    }));
  } catch (error) {
    console.error('Failed to load operations:', error);
    return [];
  }
}

export function getOperationById(id: string): StoredOperation | null {
  const operations = getAllOperations();
  return operations.find(op => op.id === id) || null;
}

export function getOperationsByTeam(teamId: string): StoredOperation[] {
  const operations = getAllOperations();
  return operations.filter(op => op.teamId === teamId);
}

export function getOperationsByAgent(agentId: string): StoredOperation[] {
  const operations = getAllOperations();
  return operations.filter(op =>
    op.team.some(agent => agent.id === agentId)
  );
}

export function getOperationsByDateRange(startDate: Date, endDate: Date): StoredOperation[] {
  const operations = getAllOperations();
  return operations.filter(op => {
    const opDate = new Date(op.timestamp);
    return opDate >= startDate && opDate <= endDate;
  });
}

export function getOperationsByStatus(status: StoredOperation['status']): StoredOperation[] {
  const operations = getAllOperations();
  return operations.filter(op => op.status === status);
}

export function generateOperationId(): string {
  return `OP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function clearAllOperations(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
