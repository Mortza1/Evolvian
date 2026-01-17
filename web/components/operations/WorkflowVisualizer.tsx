'use client';

import type { Agent } from '@/lib/agents';
import type { OperationConfig } from './OperationDashboard';

interface WorkflowVisualizerProps {
  agents: Agent[];
  config: OperationConfig;
  onApprove: () => void;
  onCancel: () => void;
}

interface WorkflowStep {
  id: string;
  agent: string;
  action: string;
  input: string;
  output: string;
}

export default function WorkflowVisualizer({ agents, config, onApprove, onCancel }: WorkflowVisualizerProps) {
  // Generate workflow steps based on agents
  const generateWorkflow = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];

    // Always start with manager
    steps.push({
      id: 'start',
      agent: 'Evo (Manager)',
      action: 'Distribute task and coordinate team',
      input: config.document?.name || 'Operation brief',
      output: 'Task assignments',
    });

    // Add agent-specific steps
    agents.forEach((agent, index) => {
      if (agent.category === 'Compliance') {
        if (agent.role.toLowerCase().includes('scanner') || agent.role.toLowerCase().includes('analyst')) {
          steps.push({
            id: `agent-${index}`,
            agent: agent.name,
            action: 'Extract and analyze document structure',
            input: steps[steps.length - 1].output,
            output: 'Structured data & clauses',
          });
        } else if (agent.role.toLowerCase().includes('auditor')) {
          steps.push({
            id: `agent-${index}`,
            agent: agent.name,
            action: `Cross-reference against ${config.rulebook.toUpperCase()} standards`,
            input: steps[steps.length - 1].output,
            output: 'Compliance findings & risks',
          });
        } else if (agent.role.toLowerCase().includes('reporter') || agent.role.toLowerCase().includes('writer')) {
          steps.push({
            id: `agent-${index}`,
            agent: agent.name,
            action: 'Generate executive summary',
            input: steps[steps.length - 1].output,
            output: 'Final report',
          });
        } else {
          steps.push({
            id: `agent-${index}`,
            agent: agent.name,
            action: agent.specialization,
            input: steps[steps.length - 1].output,
            output: 'Analysis results',
          });
        }
      } else {
        // Generic workflow for other categories
        steps.push({
          id: `agent-${index}`,
          agent: agent.name,
          action: agent.specialization,
          input: steps[steps.length - 1].output,
          output: `${agent.role} deliverable`,
        });
      }
    });

    // End with manager summary
    steps.push({
      id: 'end',
      agent: 'Evo (Manager)',
      action: 'Review and present final deliverable',
      input: steps[steps.length - 1].output,
      output: 'Executive summary',
    });

    return steps;
  };

  const workflow = generateWorkflow();
  const estimatedTime = agents.length * 2 + 3; // Rough estimate in minutes
  const totalCost = ((agents.reduce((sum, a) => sum + a.price_per_hour, 0) / 60) * estimatedTime).toFixed(2);

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
              <div className="text-lg font-bold text-white">{config.title}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-1">Est. Time</div>
              <div className="text-lg font-bold text-[#6366F1]">~{estimatedTime} min</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-1">Est. Cost</div>
              <div className="text-lg font-bold text-[#FDE047]">${totalCost}</div>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="glass rounded-xl p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-6">Execution Plan</h2>
          <div className="space-y-4">
            {workflow.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connection Line */}
                {index < workflow.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-gradient-to-b from-[#6366F1] to-transparent"></div>
                )}

                {/* Step Card */}
                <div className="flex items-start gap-4">
                  {/* Step Number */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-[#6366F1]/30">
                    {index + 1}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 bg-[#020617]/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-white mb-1">{step.agent}</div>
                        <div className="text-xs text-slate-400">{step.action}</div>
                      </div>
                      {step.agent !== 'Evo (Manager)' && (
                        <div className="text-xs px-2 py-1 bg-[#6366F1]/20 text-[#6366F1] rounded-full font-medium">
                          Agent
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                      <div>
                        <div className="text-slate-500 mb-1">Input</div>
                        <div className="text-slate-300">{step.input}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1">Output</div>
                        <div className="text-slate-300">{step.output}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Context Display */}
        {config.context && (
          <div className="glass rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-white mb-2">Special Instructions</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{config.context}</p>
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
