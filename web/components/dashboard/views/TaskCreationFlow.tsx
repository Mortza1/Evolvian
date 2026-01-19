'use client';

import { useState, useEffect } from 'react';
import { getHiredAgents, HiredAgent } from '@/lib/agents';

interface TaskCreationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  userObjective: string;
}

interface WorkflowNode {
  id: string;
  agent: HiredAgent;
  action: string;
  order: number;
}

export default function TaskCreationFlow({ isOpen, onClose, teamId, userObjective }: TaskCreationFlowProps) {
  const [step, setStep] = useState<'input' | 'operation' | 'workflow'>('input');
  const [taskDescription, setTaskDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);

  // Load hired agents and create workflow
  useEffect(() => {
    const hiredAgents = getHiredAgents(teamId);

    // For branding, use Atlas, Aurora, and Sage
    const atlas = hiredAgents.find(a => a.id === 'agent-032'); // Brand Strategist
    const aurora = hiredAgents.find(a => a.id === 'agent-031'); // Color Oracle
    const sage = hiredAgents.find(a => a.id === 'agent-034'); // Content Architect

    const nodes: WorkflowNode[] = [];

    if (atlas) {
      nodes.push({
        id: 'node-1',
        agent: atlas,
        action: 'Research AI consulting market positioning and competitive landscape',
        order: 1,
      });
    }

    if (aurora) {
      nodes.push({
        id: 'node-2',
        agent: aurora,
        action: 'Define color palette and visual identity based on brand strategy',
        order: 2,
      });
    }

    if (sage) {
      nodes.push({
        id: 'node-3',
        agent: sage,
        action: 'Create comprehensive brand messaging framework and manifesto',
        order: 3,
      });
    }

    setWorkflowNodes(nodes);
  }, [teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim()) return;

    setIsGenerating(true);

    // Simulate AI generating the operation card
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsGenerating(false);
    setStep('operation');
  };

  const handleViewWorkflow = () => {
    setStep('workflow');
  };

  const handleBack = () => {
    if (step === 'workflow') {
      setStep('operation');
    } else if (step === 'operation') {
      setStep('input');
    }
  };

  const handleCommence = () => {
    // TODO: Create the actual task
    console.log('Commencing operation:', taskDescription);
    onClose();
    // Reset state
    setStep('input');
    setTaskDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {step === 'input' && (
        <div className="bg-[#0A0A0F] rounded-lg max-w-2xl w-full border border-slate-800 shadow-2xl animate-fade-in">
          {/* Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">New Task</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Describe your objective and we'll build the workflow
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-3">
                Task Description
              </label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Create a complete Brand Identity Pack for my AI Consulting firm"
                rows={4}
                className="w-full px-4 py-3 bg-[#020617] border border-slate-800 rounded text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] transition-all resize-none"
                autoFocus
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!taskDescription.trim() || isGenerating}
                className="px-5 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing
                  </>
                ) : (
                  'Generate Plan'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'operation' && workflowNodes.length > 0 && (
        <div className="w-full max-w-4xl animate-fade-in">
          {/* Operation Card */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] rounded-lg blur-2xl opacity-20 animate-pulse"></div>

            {/* Card */}
            <div className="relative bg-[#0A0A0F] rounded-lg border border-slate-800 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-2">WORKFLOW GENERATED</div>
                    <h2 className="text-xl font-semibold text-white mb-2">Brand Identity Assembly</h2>
                    <p className="text-slate-400 text-sm max-w-xl">
                      {taskDescription}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                  >
                    ✕
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-[#020617] rounded border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Agents</div>
                    <div className="text-lg font-semibold text-white">{workflowNodes.length}</div>
                  </div>
                  <div className="p-3 bg-[#020617] rounded border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Est. Time</div>
                    <div className="text-lg font-semibold text-white">8 hours</div>
                  </div>
                  <div className="p-3 bg-[#020617] rounded border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Est. Cost</div>
                    <div className="text-lg font-semibold text-[#FDE047]">$120</div>
                  </div>
                </div>
              </div>

              {/* Workflow Preview */}
              <div className="p-6">
                <div className="text-xs text-slate-500 font-medium mb-4">EXECUTION SEQUENCE</div>
                <div className="space-y-3 mb-6">
                  {workflowNodes.map((node, idx) => (
                    <div key={node.id} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-400">
                        {node.order}
                      </div>
                      <img
                        src={node.agent.photo_url}
                        alt={node.agent.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{node.agent.name}</div>
                        <div className="text-xs text-slate-500">{node.action}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleViewWorkflow}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded border border-slate-700 transition-all"
                  >
                    View Details
                  </button>
                  <button
                    onClick={handleCommence}
                    className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-medium rounded transition-all"
                  >
                    Start Operation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'workflow' && workflowNodes.length > 0 && (
        <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto animate-fade-in">
          {/* Mission Map */}
          <div className="bg-[#0A0A0F] rounded-lg border border-slate-800 p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-1">Workflow Details</h2>
                  <p className="text-sm text-slate-500">
                    Sequential execution plan
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Workflow Graph */}
            <div className="relative mb-8">
              <div className="flex items-center justify-center gap-6">
                {workflowNodes.map((node, idx) => {
                  const colors = ['#6366F1', '#8B5CF6', '#EC4899'];
                  const nodeColor = colors[idx % colors.length];

                  return (
                    <div key={node.id} className="flex items-center">
                      {/* Node */}
                      <div className="relative group">
                        {/* Glow effect on hover */}
                        <div
                          className="absolute -inset-3 rounded-lg blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300"
                          style={{ backgroundColor: nodeColor }}
                        ></div>

                        {/* Node card */}
                        <div
                          className="relative bg-[#020617] border rounded-lg p-5 w-56 transition-all duration-300 group-hover:border-opacity-100"
                          style={{ borderColor: `${nodeColor}50` }}
                        >
                          {/* Order badge */}
                          <div
                            className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: nodeColor }}
                          >
                            {node.order}
                          </div>

                          {/* Agent Photo */}
                          <div className="mb-4">
                            <img
                              src={node.agent.photo_url}
                              alt={node.agent.name}
                              className="w-16 h-16 rounded-full object-cover mx-auto border-2"
                              style={{ borderColor: nodeColor }}
                            />
                          </div>

                          {/* Agent name */}
                          <h3 className="text-base font-semibold text-white text-center mb-1">
                            {node.agent.name}
                          </h3>
                          <div className="text-xs text-slate-500 text-center mb-3">{node.agent.role}</div>

                          {/* Action */}
                          <p className="text-xs text-slate-400 text-center leading-relaxed">
                            {node.action}
                          </p>
                        </div>
                      </div>

                      {/* Arrow connector */}
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

            {/* Detailed Breakdown */}
            <div className="space-y-3 mb-8">
              <h3 className="text-sm font-medium text-slate-400 mb-4">EXECUTION BREAKDOWN</h3>
              {workflowNodes.map((node, idx) => {
                const colors = ['#6366F1', '#8B5CF6', '#EC4899'];
                const nodeColor = colors[idx % colors.length];

                return (
                  <div
                    key={node.id}
                    className="p-4 bg-[#020617] rounded border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={node.agent.photo_url}
                        alt={node.agent.name}
                        className="flex-shrink-0 w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-sm font-semibold text-white">{node.agent.name}</h4>
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded"
                            style={{ backgroundColor: `${nodeColor}20`, color: nodeColor }}
                          >
                            Step {node.order}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{node.action}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>~2-3 hours</span>
                          <span>•</span>
                          <span>${node.agent.price_per_hour}/hr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCommence}
                className="px-5 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-medium rounded transition-all"
              >
                Start Operation
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
