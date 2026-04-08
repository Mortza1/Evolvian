import { apiRequest } from './api';
import type { WorkflowNode, WorkflowNodeStatus } from './services/workflows';

export interface TaskWorkflowNode {
  id: string;
  name: string;
  description: string;
  agentId?: string;
  agentName?: string;
  agentPhoto?: string;
  agentRole: string;
  action: string;
  inputs: string[];
  outputs: string[];
  dependsOn: string[];
  status: WorkflowNodeStatus;
  order: number;
}

export interface TaskHierarchyStep {
  id: string;
  team_id: string;
  name: string;
  agent: string;
  depends_on: string[];
}

export interface TaskHierarchyTeam {
  supervisor: string;
  workers: string[];
  teamName: string;
  stepTree?: TaskHierarchyStep[];
}

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
  estimatedTime?: number;
  estimatedCost?: number;
  workflowNodes: TaskWorkflowNode[];
  hierarchical?: boolean;
  hierarchyTeam?: TaskHierarchyTeam;
  vaultFileId?: number;
  vaultFileName?: string;
}

export async function getTasks(teamId: number): Promise<Task[]> {
  try {
    const response = await apiRequest(`/api/operations/?team_id=${teamId}`, {
      method: 'GET',
    });

    return response.map((op: any) => mapOperationToTask(op));
  } catch (error) {
    console.error('Failed to load tasks:', error);
    return [];
  }
}

function mapOperationToTask(op: any): Task {
  // Map workflow nodes from backend format
  const workflowNodes: TaskWorkflowNode[] = (op.workflow_config?.nodes || []).map(
    (node: any, index: number) => ({
      id: node.id || String(index + 1),
      name: node.name || `Step ${index + 1}`,
      description: node.description || node.action || '',
      agentId: node.agentId,
      agentName: node.agentName || node.agent_role,
      agentPhoto: node.agentPhoto,
      agentRole: node.agentRole || node.agent_role || 'Agent',
      action: node.action || node.description || '',
      inputs: node.inputs || [],
      outputs: node.outputs || [],
      dependsOn: node.dependsOn || node.depends_on || [],
      status: (node.status || 'pending') as WorkflowNodeStatus,
      order: node.order || index,
    })
  );

  // Calculate progress from node statuses
  const completedNodes = workflowNodes.filter(
    (n) => n.status === 'completed' || n.status === 'failed' || n.status === 'skipped'
  ).length;
  const progress = workflowNodes.length > 0 ? Math.round((completedNodes / workflowNodes.length) * 100) : 0;

  return {
    id: op.id,
    title: op.title,
    description: op.description,
    teamId: op.team_id,
    status: op.status,
    progress,
    createdAt: new Date(op.created_at),
    startedAt: op.started_at ? new Date(op.started_at) : undefined,
    completedAt: op.completed_at ? new Date(op.completed_at) : undefined,
    cost: op.actual_cost || 0,
    estimatedTime: op.workflow_config?.estimated_time,
    estimatedCost: op.workflow_config?.estimated_cost,
    workflowNodes,
    hierarchical: op.workflow_config?.hierarchy_mode === true,
    vaultFileId: op.workflow_config?.vault_file_id ?? undefined,
    vaultFileName: op.workflow_config?.vault_file_name ?? undefined,
    hierarchyTeam: op.workflow_config?.hierarchy_team
      ? {
          supervisor: typeof op.workflow_config.hierarchy_team.supervisor === 'string'
            ? op.workflow_config.hierarchy_team.supervisor
            : op.workflow_config.hierarchy_team.supervisor?.name ?? '',
          subSupervisors: op.workflow_config.hierarchy_team.sub_supervisors ?? [],
          workers: (op.workflow_config.hierarchy_team.workers ?? []).map((w: any) =>
            typeof w === 'string' ? w : w?.name ?? ''
          ),
          teamName: op.workflow_config.hierarchy_team.team_name ?? '',
          treeDepth: op.workflow_config.hierarchy_team.tree_depth ?? undefined,
          stepTree: op.workflow_config.hierarchy_team.step_tree ?? undefined,
        }
      : undefined,
  };
}

export async function getTask(taskId: number): Promise<Task | null> {
  try {
    const response = await apiRequest(`/api/operations/${taskId}`, {
      method: 'GET',
    });

    return mapOperationToTask(response);
  } catch (error) {
    console.error('Failed to load task:', error);
    return null;
  }
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  try {
    // Convert workflow nodes to backend format
    const workflowConfig = {
      title: task.title,
      description: task.description,
      nodes: task.workflowNodes.map((node) => ({
        id: node.id,
        name: node.name,
        description: node.description,
        agentId: node.agentId,
        agentName: node.agentName,
        agentRole: node.agentRole,
        action: node.action,
        inputs: node.inputs,
        outputs: node.outputs,
        dependsOn: node.dependsOn,
        status: node.status,
        order: node.order,
      })),
      estimated_time: task.estimatedTime,
      estimated_cost: task.estimatedCost,
    };

    const response = await apiRequest('/api/operations/', {
      method: 'POST',
      body: JSON.stringify({
        team_id: task.teamId,
        title: task.title,
        description: task.description,
        status: task.status,
        workflow_config: workflowConfig,
      }),
    });

    return mapOperationToTask(response);
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
