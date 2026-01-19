import { apiRequest } from './api';

export interface Task {
  id: number;
  title: string;
  description: string;
  teamId: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cost: number;
  workflowNodes: {
    id: string;
    agentId: string;
    agentName: string;
    agentPhoto: string;
    agentRole: string;
    action: string;
    order: number;
  }[];
}

export async function getTasks(teamId: number): Promise<Task[]> {
  try {
    const response = await apiRequest(`/api/operations?team_id=${teamId}`, {
      method: 'GET',
    });

    return response.map((op: any) => ({
      id: op.id,
      title: op.title,
      description: op.description,
      teamId: op.team_id,
      status: op.status,
      progress: 0, // We'll calculate this based on current phase
      createdAt: new Date(op.created_at),
      startedAt: op.started_at ? new Date(op.started_at) : undefined,
      completedAt: op.completed_at ? new Date(op.completed_at) : undefined,
      cost: op.actual_cost || 0,
      workflowNodes: op.workflow_config?.nodes || [],
    }));
  } catch (error) {
    console.error('Failed to load tasks:', error);
    return [];
  }
}

export async function getTask(taskId: number): Promise<Task | null> {
  try {
    const response = await apiRequest(`/api/operations/${taskId}`, {
      method: 'GET',
    });

    return {
      id: response.id,
      title: response.title,
      description: response.description,
      teamId: response.team_id,
      status: response.status,
      progress: 0,
      createdAt: new Date(response.created_at),
      startedAt: response.started_at ? new Date(response.started_at) : undefined,
      completedAt: response.completed_at ? new Date(response.completed_at) : undefined,
      cost: response.actual_cost || 0,
      workflowNodes: response.workflow_config?.nodes || [],
    };
  } catch (error) {
    console.error('Failed to load task:', error);
    return null;
  }
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  try {
    const response = await apiRequest('/api/operations', {
      method: 'POST',
      body: JSON.stringify({
        team_id: task.teamId,
        title: task.title,
        description: task.description,
        status: task.status,
        progress: task.progress || 0,
        cost: task.cost,
        workflowNodes: task.workflowNodes,
      }),
    });

    return {
      id: response.id,
      title: response.title,
      description: response.description,
      teamId: response.team_id,
      status: response.status,
      progress: 0,
      createdAt: new Date(response.created_at),
      startedAt: response.started_at ? new Date(response.started_at) : undefined,
      completedAt: response.completed_at ? new Date(response.completed_at) : undefined,
      cost: response.actual_cost || 0,
      workflowNodes: response.workflow_config?.nodes || [],
    };
  } catch (error) {
    console.error('Failed to create task:', error);
    throw error;
  }
}

export async function updateTask(taskId: number, updates: Partial<Task>): Promise<boolean> {
  try {
    await apiRequest(`/api/operations/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: updates.title,
        description: updates.description,
        status: updates.status,
        progress: updates.progress,
        cost: updates.cost,
      }),
    });

    return true;
  } catch (error) {
    console.error('Failed to update task:', error);
    return false;
  }
}

export async function deleteTask(taskId: number): Promise<boolean> {
  try {
    await apiRequest(`/api/operations/${taskId}`, {
      method: 'DELETE',
    });

    return true;
  } catch (error) {
    console.error('Failed to delete task:', error);
    return false;
  }
}
