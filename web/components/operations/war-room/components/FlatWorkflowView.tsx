'use client';

import type { WorkflowNode, NodeStatus } from '../types';

const NODE_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];

interface FlatWorkflowViewProps {
  workflowNodes: WorkflowNode[];
  nodeStatuses: NodeStatus[];
  getAgentPhoto: (name: string) => string | undefined;
}

export function FlatWorkflowView({ workflowNodes, nodeStatuses, getAgentPhoto }: FlatWorkflowViewProps) {
  return (
    <div className="flex items-center justify-center gap-6 min-w-max">
      {workflowNodes.map((node, idx) => {
        const status = nodeStatuses.find(s => s.nodeId === node.id);
        const baseColor = NODE_COLORS[idx % NODE_COLORS.length];
        const isActive = status?.status === 'active';
        const isCompleted = status?.status === 'completed';
        const isFailed = status?.status === 'failed';
        const isWaiting = status?.status === 'waiting_for_input';
        const displayColor = isFailed ? '#EF4444' : isWaiting ? '#F59E0B' : baseColor;
        const agentPhoto = node.agentPhoto || getAgentPhoto(node.agentName || node.agentRole);

        return (
          <div key={node.id} className="flex items-center">
            <div className="relative">
              {(isActive || isWaiting) && (
                <div className="absolute -inset-4 rounded-lg blur-2xl opacity-40 animate-pulse" style={{ backgroundColor: displayColor }} />
              )}
              <div
                className={`relative bg-[#0A0A0F] border rounded-lg p-5 w-64 transition-all ${isCompleted ? 'opacity-70' : ''}`}
                style={{ borderColor: (isActive || isWaiting) ? displayColor : '#334155' }}
              >
                {/* Badge */}
                <div
                  className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                    isCompleted ? 'bg-green-600' : isFailed ? 'bg-red-600' : isWaiting ? 'bg-amber-500 animate-pulse' : ''
                  }`}
                  style={{ backgroundColor: (isCompleted || isFailed || isWaiting) ? undefined : displayColor }}
                >
                  {isCompleted ? '✓' : isFailed ? '✕' : isWaiting ? '?' : node.order}
                </div>

                {/* Avatar */}
                <div className="mb-4">
                  {agentPhoto ? (
                    <img
                      src={agentPhoto}
                      alt={node.agentName || node.agentRole}
                      className={`w-16 h-16 rounded-full object-cover mx-auto border-2 ${isActive ? 'ring-2 ring-offset-2 ring-offset-[#0A0A0F]' : ''}`}
                      style={{ borderColor: displayColor }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold border-2"
                      style={{ backgroundColor: `${displayColor}40`, borderColor: displayColor }}
                    >
                      {(node.agentName || node.agentRole).substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <h3 className="text-base font-semibold text-white text-center mb-1">{node.agentName || node.agentRole}</h3>
                <div className="text-xs text-slate-500 text-center mb-3">{node.agentRole}</div>
                <p className="text-xs text-slate-400 text-center leading-relaxed mb-3">{node.name || node.action || node.description}</p>

                {isActive && status?.activeTool && (
                  <div className="flex items-center justify-center gap-2 p-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded mb-3">
                    <div className="w-3 h-3 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-[#6366F1] font-medium">{status.activeTool}</span>
                  </div>
                )}

                {(isActive || isCompleted) && status?.progress !== undefined && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{ width: `${status.progress}%`, backgroundColor: isCompleted ? '#22C55E' : baseColor }}
                    />
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-center">
                  {isCompleted && <span className="text-green-500">Completed</span>}
                  {isFailed && <span className="text-red-500">Failed</span>}
                  {isWaiting && <span className="text-amber-500 font-semibold">⚠️ Needs your input</span>}
                  {isActive && !isWaiting && <span className="text-[#6366F1]">In Progress</span>}
                  {status?.status === 'pending' && <span className="text-slate-500">Pending</span>}
                </div>

                {status?.output && (
                  <div className="mt-3 p-2 bg-slate-900 rounded text-xs text-slate-400 max-h-20 overflow-hidden">
                    {status.output.substring(0, 100)}...
                  </div>
                )}
              </div>
            </div>

            {idx < workflowNodes.length - 1 && (
              <div className="flex items-center mx-4">
                <div className="w-12 h-0.5 bg-slate-700" />
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
