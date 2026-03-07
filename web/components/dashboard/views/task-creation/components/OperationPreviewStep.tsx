'use client';

import type { WorkflowDesign } from '@/lib/services/workflows';
import type { WorkflowNodeWithAgent } from '../hooks/useTaskCreation';

interface OperationPreviewStepProps {
  workflowDesign: WorkflowDesign;
  workflowNodes: WorkflowNodeWithAgent[];
  taskDescription: string;
  evolutionContext: Record<string, unknown> | null;
  error: string | null;
  onBack: () => void;
  onClose: () => void;
  onViewDetails: () => void;
  onStart: () => void;
}

export function OperationPreviewStep({ workflowDesign, workflowNodes, taskDescription, evolutionContext, error, onBack, onClose, onViewDetails, onStart }: OperationPreviewStepProps) {
  return (
    <div className="w-full max-w-4xl animate-fade-in">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] rounded-lg blur-2xl opacity-20 animate-pulse" />
        <div className="relative bg-[#0A0A0F] rounded-lg border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-xs text-slate-500 font-medium mb-2">WORKFLOW GENERATED</div>
                {evolutionContext && (evolutionContext.total_past_executions as number) > 0 && (
                  <div className="mb-3 px-3 py-2 bg-indigo-950/40 border border-indigo-800/50 rounded flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <div>
                      <span className="text-xs font-medium text-indigo-300">Evolution-Informed Design</span>
                      <span className="text-xs text-indigo-400/70 ml-2">
                        Based on {evolutionContext.total_past_executions as number} past {evolutionContext.task_type as string} executions
                        {evolutionContext.avg_quality ? ` (avg quality: ${Math.round((evolutionContext.avg_quality as number) * 100)}%)` : ''}
                      </span>
                    </div>
                  </div>
                )}
                <h2 className="text-xl font-semibold text-white mb-2">{workflowDesign.title}</h2>
                <p className="text-slate-400 text-sm max-w-xl">{taskDescription}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Steps', value: workflowNodes.length },
                { label: 'Est. Time', value: workflowDesign.estimated_time_minutes < 60 ? `${workflowDesign.estimated_time_minutes} min` : `${Math.round(workflowDesign.estimated_time_minutes / 60)} hrs` },
                { label: 'Est. Cost', value: `$${workflowDesign.estimated_cost.toFixed(2)}`, className: 'text-[#FDE047]' },
              ].map(stat => (
                <div key={stat.label} className="p-3 bg-[#020617] rounded border border-slate-800">
                  <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
                  <div className={`text-lg font-semibold ${stat.className ?? 'text-white'}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="text-xs text-slate-500 font-medium mb-4">EXECUTION SEQUENCE</div>
            <div className="space-y-3 mb-6">
              {workflowNodes.map(node => (
                <div key={node.id} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-400">{node.order}</div>
                  {node.assignedAgent?.photo_url ? (
                    <img src={node.assignedAgent.photo_url} alt={node.assignedAgent.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : node.assignedAgent ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-white text-xs font-bold">{node.assignedAgent.name.substring(0, 2).toUpperCase()}</div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">?</div>
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{node.assignedAgent?.name || node.agent_role}</div>
                    <div className="text-xs text-slate-500">{node.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {workflowNodes.some(n => !n.assignedAgent) && (
              <div className="mb-4 p-3 bg-amber-900/20 border border-amber-800 rounded text-amber-400 text-sm">
                Some steps don't have matching agents. Consider hiring agents with these roles.
              </div>
            )}
            {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">{error}</div>}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={onBack} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Back</button>
              <button onClick={onViewDetails} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded border border-slate-700 transition-all">View Details</button>
              <button onClick={onStart} className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-medium rounded transition-all">Start Operation</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
