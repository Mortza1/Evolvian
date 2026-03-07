export interface WarRoomLiveProps {
  taskId: number;
  teamId: string;
  workflowNodes: WorkflowNode[];
  taskDescription: string;
  initialStatus?: 'pending' | 'active' | 'completed' | 'failed' | 'paused' | 'cancelled';
  onClose?: () => void;
  hierarchical?: boolean;
}

export interface WorkflowNode {
  id: string;
  name?: string;
  description?: string;
  agentId?: string;
  agentName?: string;
  agentPhoto?: string;
  agentRole: string;
  action?: string;
  order: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  agent: string;
  message: string;
  type: 'info' | 'tool' | 'output' | 'complete' | 'file' | 'error' | 'llm';
}

export interface NodeStatus {
  nodeId: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'waiting' | 'waiting_for_input';
  activeTool?: string;
  progress?: number;
  output?: string;
}

export interface AssumptionData {
  operationId: number;
  nodeId: string;
  agentName: string;
  agentPhoto?: string;
  question: string;
  context: string;
  options: string[];
  priority: string;
  assumptionIndex: number;
}

export interface HierarchyTeam {
  supervisor: string;
  workers: string[];
  teamName: string;
}

export interface HierarchyMetrics {
  review_loops: number;
  escalations: number;
  revisions: number;
}
