'use client';

import { useMemo } from 'react';
import type { WorkflowDesign, WorkflowGraph, WorkflowNode } from '@/lib/services/workflows';

interface WorkflowVisualizerProps {
  workflow?: WorkflowDesign;
  graph?: WorkflowGraph;
  title?: string;
  context?: string;
  onApprove: () => void;
  onCancel: () => void;
}

export default function WorkflowVisualizer({
  workflow,
  graph,
  title,
  context,
  onApprove,
  onCancel,
}: WorkflowVisualizerProps) {
  // Build display nodes from either workflow design or graph
  const displayNodes = useMemo(() => {
    if (graph) {
      return graph.nodes.map((node, index) => ({
        id: node.id,
        agent: node.assigned_agent || node.agent_role,
        action: node.description,
        input: node.inputs.join(', ') || 'Previous output',
        output: node.outputs.join(', ') || 'Results',
        status: node.status,
        isManager: node.agent_role.toLowerCase().includes('manager') || node.name.toLowerCase().includes('evo'),
      }));
    }

    if (workflow) {
      const nodes = [];

      // Add Evo start node
      nodes.push({
        id: 'start',
        agent: 'Evo (Manager)',
        action: 'Distribute task and coordinate team',
        input: 'Operation brief',
        output: 'Task assignments',
        status: 'pending' as const,
        isManager: true,
      });

      // Add workflow steps
      workflow.steps.forEach((step) => {
        nodes.push({
          id: step.id,
          agent: step.agent_role,
          action: step.description || step.name,
          input: step.inputs.join(', ') || nodes[nodes.length - 1]?.output || 'Previous output',
          output: step.outputs.join(', ') || 'Results',
          status: 'pending' as const,
          isManager: false,
        });
      });

      // Add Evo end node
      nodes.push({
        id: 'end',
        agent: 'Evo (Manager)',
        action: 'Review and present final deliverable',
        input: nodes[nodes.length - 1]?.output || 'All outputs',
        output: 'Executive summary',
        status: 'pending' as const,
        isManager: true,
      });

      return nodes;
    }

    return [];
  }, [workflow, graph]);

  // Calculate estimates
  const estimatedTime = workflow?.estimated_time_minutes || displayNodes.length * 2 + 3;
  const estimatedCost = workflow?.estimated_cost || displayNodes.length * 5;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'running':
        return 'bg-blue-500 animate-pulse';
      case 'failed':
        return 'bg-red-500';
      case 'skipped':
        return 'bg-slate-500';
      default:
        return 'bg-gradient-to-br from-[#6366F1] to-[#818CF8]';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
            Complete
          </span>
        );
      case 'running':
        return (
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full animate-pulse">
            Running
          </span>
        );
      case 'failed':
        return (
          <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">Workflow Plan</h1>
          <p className="text-slate-400 text-lg">
            Review your team's execution strategy before commencing
          </p>
        </div>

        {/* Operation Summary */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-1">Operation</div>
              <div className="text-lg font-bold text-white">
                {title || workflow?.title || graph?.goal || 'New Operation'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-1">Est. Time</div>
              <div className="text-lg font-bold text-[#6366F1]">~{estimatedTime} min</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-1">Est. Cost</div>
              <div className="text-lg font-bold text-[#FDE047]">${estimatedCost.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="glass rounded-xl p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-6">Execution Plan</h2>
          <div className="space-y-4">
            {displayNodes.map((node, index) => (
              <div key={node.id} className="relative">
                {/* Connection Line */}
                {index < displayNodes.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-gradient-to-b from-[#6366F1] to-transparent"></div>
                )}

                {/* Step Card */}
                <div className="flex items-start gap-4">
                  {/* Step Number */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 ${getStatusColor(
                      node.status
                    )} rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-[#6366F1]/30`}
                  >
                    {node.status === 'completed' ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : node.status === 'running' ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 bg-[#020617]/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-white mb-1">{node.agent}</div>
                        <div className="text-xs text-slate-400">{node.action}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(node.status)}
                        {!node.isManager && (
                          <div className="text-xs px-2 py-1 bg-[#6366F1]/20 text-[#6366F1] rounded-full font-medium">
                            Agent
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                      <div>
                        <div className="text-slate-500 mb-1">Input</div>
                        <div className="text-slate-300">{node.input}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1">Output</div>
                        <div className="text-slate-300">{node.output}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Context Display */}
        {context && (
          <div className="glass rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-white mb-2">Special Instructions</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{context}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onCancel}
            className="px-8 py-3 bg-[#1E293B] border border-slate-700 text-white rounded-lg hover:bg-[#2D3B52] transition-colors"
          >
            Modify Plan
          </button>
          <button
            onClick={onApprove}
            className="px-8 py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all"
          >
            Approve & Start Operation
          </button>
        </div>

        {/* Note */}
        <p className="text-center text-sm text-slate-500 mt-6">
          You'll be notified when agents need your input or when the operation completes
        </p>
      </div>
    </div>
  );
}
