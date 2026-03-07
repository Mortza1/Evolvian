'use client';

import type { WorkflowDesign } from '@/lib/services/workflows';
import type { TaskAnalysis } from '@/lib/services/workflows';
import type { WorkflowNodeWithAgent } from '../hooks/useTaskCreation';

const NODE_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];

interface WorkflowDetailsStepProps {
  workflowDesign: WorkflowDesign;
  workflowNodes: WorkflowNodeWithAgent[];
  analysis: TaskAnalysis | null;
  error: string | null;
  onBack: () => void;
  onClose: () => void;
  onStart: () => void;
}

function AgentAvatar({ node, size = 'sm' }: { node: WorkflowNodeWithAgent; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm';
  if (node.assignedAgent?.photo_url) {
    return <img src={node.assignedAgent.photo_url} alt={node.assignedAgent.name} className={`${dim} rounded-full object-cover`} />;
  }
  if (node.assignedAgent) {
    return (
      <div className={`${dim} rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-white font-bold`}>
        {node.assignedAgent.name.substring(0, 2).toUpperCase()}
      </div>
    );
  }
  return <div className={`${dim} rounded-full bg-slate-700 flex items-center justify-center text-slate-400`}>?</div>;
}

export function WorkflowDetailsStep({ workflowDesign, workflowNodes, analysis, error, onBack, onClose, onStart }: WorkflowDetailsStepProps) {
  return (
    <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto animate-fade-in">
      <div className="bg-[#0A0A0F] rounded-lg border border-slate-800 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Workflow Details</h2>
            <p className="text-sm text-slate-500">{workflowDesign.description || 'Sequential execution plan'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        {/* Graph */}
        <div className="relative mb-8 overflow-x-auto">
          <div className="flex items-center justify-center gap-6 min-w-max px-4">
            {workflowNodes.map((node, idx) => {
              const color = NODE_COLORS[idx % NODE_COLORS.length];
              return (
                <div key={node.id} className="flex items-center">
                  <div className="relative group">
                    <div className="absolute -inset-3 rounded-lg blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" style={{ backgroundColor: color }} />
                    <div className="relative bg-[#020617] border rounded-lg p-5 w-56 transition-all duration-300" style={{ borderColor: `${color}50` }}>
                      <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: color }}>
                        {node.order}
                      </div>
                      <div className="mb-4 flex justify-center">
                        <AgentAvatar node={node} size="lg" />
                      </div>
                      <h3 className="text-base font-semibold text-white text-center mb-1">{node.assignedAgent?.name || node.agent_role}</h3>
                      <div className="text-xs text-slate-500 text-center mb-3">{node.assignedAgent?.role || 'Unassigned'}</div>
                      <p className="text-xs text-slate-400 text-center leading-relaxed">{node.name}</p>
                    </div>
                  </div>
                  {idx < workflowNodes.length - 1 && (
                    <svg className="w-8 h-8 text-slate-700 mx-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Execution Breakdown */}
        <div className="space-y-3 mb-8">
          <h3 className="text-sm font-medium text-slate-400 mb-4">EXECUTION BREAKDOWN</h3>
          {workflowNodes.map((node, idx) => {
            const color = NODE_COLORS[idx % NODE_COLORS.length];
            return (
              <div key={node.id} className="p-4 bg-[#020617] rounded border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0"><AgentAvatar node={node} /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-sm font-semibold text-white">{node.assignedAgent?.name || node.agent_role}</h4>
                      <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: `${color}20`, color }}>Step {node.order}</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{node.name}</p>
                    <p className="text-xs text-slate-500 mb-3">{node.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {node.assignedAgent && (
                        <><span>${node.assignedAgent.cost_per_hour}/hr</span><span>•</span><span>Level {node.assignedAgent.level}</span></>
                      )}
                      {node.inputs.length > 0 && (
                        <><span>•</span><span>Needs: {node.inputs.join(', ')}</span></>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Evo's Analysis */}
        {analysis && (
          <div className="mb-8 p-4 bg-[#020617] rounded border border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-3">EVO'S ANALYSIS</h3>
            <p className="text-sm text-slate-300 mb-3">{analysis.understanding}</p>
            {analysis.assumptions.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-slate-500 mb-1">Assumptions:</div>
                <ul className="list-disc list-inside text-xs text-slate-400">
                  {analysis.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs">
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">Complexity: {analysis.estimated_complexity}</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">Confidence: {Math.round(analysis.confidence * 100)}%</span>
            </div>
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">{error}</div>}

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
          <button onClick={onBack} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Back</button>
          <button onClick={onStart} className="px-5 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-medium rounded transition-all">Start Operation</button>
        </div>
      </div>
    </div>
  );
}
