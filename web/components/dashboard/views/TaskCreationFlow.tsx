'use client';

import { useState } from 'react';
import { useTeamAgents, Agent } from '@/lib/services/agents';
import { workflowService } from '@/lib/services/workflows';
import type { WorkflowDesign, WorkflowStep, TaskAnalysis } from '@/lib/services/workflows';

interface TaskCreationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  userObjective: string;
  onTaskCreated?: (taskId: number) => void;
}

interface WorkflowNodeWithAgent extends WorkflowStep {
  assignedAgent?: Agent;
  order: number;
}

export default function TaskCreationFlow({ isOpen, onClose, teamId, userObjective, onTaskCreated }: TaskCreationFlowProps) {
  const [step, setStep] = useState<'input' | 'operation' | 'workflow'>('input');
  const [taskDescription, setTaskDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workflow data from Evo
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [workflowDesign, setWorkflowDesign] = useState<WorkflowDesign | null>(null);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNodeWithAgent[]>([]);
  const [evolutionContext, setEvolutionContext] = useState<Record<string, unknown> | null>(null);

  // Load hired agents from API
  const { agents: hiredAgents, isLoading: loadingAgents } = useTeamAgents({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });

  /**
   * Find the best matching agent for a workflow step based on role/specialty
   */
  const findBestAgent = (agentRole: string): Agent | undefined => {
    if (!hiredAgents.length) return undefined;

    const roleLower = agentRole.toLowerCase();

    // Try exact role match first
    let match = hiredAgents.find(a => a.role.toLowerCase() === roleLower);
    if (match) return match;

    // Try partial match on role
    match = hiredAgents.find(a =>
      a.role.toLowerCase().includes(roleLower) ||
      roleLower.includes(a.role.toLowerCase())
    );
    if (match) return match;

    // Try specialty match
    match = hiredAgents.find(a =>
      a.specialty.toLowerCase().includes(roleLower) ||
      roleLower.includes(a.specialty.toLowerCase())
    );
    if (match) return match;

    // Try skills match
    match = hiredAgents.find(a =>
      a.skills.some(skill =>
        skill.toLowerCase().includes(roleLower) ||
        roleLower.includes(skill.toLowerCase())
      )
    );
    if (match) return match;

    // Fallback: return first available agent
    return hiredAgents[0];
  };

  /**
   * Generate the workflow plan using Evo
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Call Evo's quick-task endpoint
      console.log('[TaskCreationFlow] Calling quickTask...');
      const result = await workflowService.quickTask(taskDescription, parseInt(teamId, 10));
      console.log('[TaskCreationFlow] quickTask result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate workflow');
      }

      setAnalysis(result.analysis || null);
      setEvolutionContext(result.evolution_context || null);

      // Handle case where workflow is missing or has no steps
      if (!result.workflow || !result.workflow.steps || result.workflow.steps.length === 0) {
        console.warn('[TaskCreationFlow] Workflow is empty, creating fallback');
        // Create a simple fallback workflow with one step per subtask from analysis
        const subtasks = result.analysis?.subtasks || [];
        const fallbackSteps = subtasks.length > 0 ? subtasks.map((st: any, idx: number) => ({
          id: st.id || `step-${idx + 1}`,
          name: st.title || `Step ${idx + 1}`,
          description: st.description || '',
          agent_role: st.agent_type || 'General Agent',
          inputs: [],
          outputs: [],
          depends_on: idx > 0 ? [`step-${idx}`] : [],
        })) : [{
          id: 'step-1',
          name: 'Execute Task',
          description: taskDescription,
          agent_role: 'General Agent',
          inputs: ['task_description'],
          outputs: ['result'],
          depends_on: [],
        }];

        const fallbackWorkflow: WorkflowDesign = {
          title: result.workflow?.title || 'Custom Workflow',
          description: result.workflow?.description || taskDescription,
          steps: fallbackSteps,
          estimated_time_minutes: result.workflow?.estimated_time_minutes || 30,
          estimated_cost: result.workflow?.estimated_cost || 10,
        };
        setWorkflowDesign(fallbackWorkflow);

        // Map workflow steps to hired agents
        const nodesWithAgents: WorkflowNodeWithAgent[] = fallbackWorkflow.steps.map((step, idx) => ({
          ...step,
          assignedAgent: findBestAgent(step.agent_role),
          order: idx + 1,
        }));
        setWorkflowNodes(nodesWithAgents);
      } else {
        setWorkflowDesign(result.workflow);

        // Map workflow steps to hired agents
        const nodesWithAgents: WorkflowNodeWithAgent[] = result.workflow.steps.map((step, idx) => ({
          ...step,
          assignedAgent: findBestAgent(step.agent_role),
          order: idx + 1,
        }));
        setWorkflowNodes(nodesWithAgents);
      }

      setStep('operation');
    } catch (err) {
      console.error('[TaskCreationFlow] Error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate plan';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
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

  const handleCommence = async () => {
    if (!workflowDesign) return;

    try {
      // Create the operation via workflow service
      const result = await workflowService.createOperationWithWorkflow(
        parseInt(teamId, 10),
        workflowDesign.title || 'New Operation',
        taskDescription,
        workflowDesign
      );

      if (!result.success || !result.operationId) {
        throw new Error(result.error || 'Failed to create operation');
      }

      // Reset state
      setStep('input');
      setTaskDescription('');
      setWorkflowDesign(null);
      setWorkflowNodes([]);
      setAnalysis(null);
      setEvolutionContext(null);
      setError(null);

      // Close modal
      onClose();

      // Notify parent (this will open Execution Theatre)
      if (onTaskCreated) {
        setTimeout(() => {
          onTaskCreated(result.operationId!);
        }, 100);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create operation';
      setError(message);
    }
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
                  Describe your objective and Evo will design the workflow
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
            <div className="mb-4">
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

            {/* Team Status */}
            <div className="mb-6 p-3 bg-[#020617] rounded border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Available Agents</span>
                <span className="text-sm font-medium text-white">
                  {loadingAgents ? '...' : hiredAgents.length}
                </span>
              </div>
              {hiredAgents.length === 0 && !loadingAgents && (
                <p className="text-xs text-amber-500 mt-2">
                  No agents hired yet. Hire agents from the marketplace to execute tasks.
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

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
                disabled={!taskDescription.trim() || isGenerating || hiredAgents.length === 0}
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

      {step === 'operation' && workflowDesign && (
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
                    {evolutionContext && (evolutionContext.total_past_executions as number) > 0 && (
                      <div className="mb-3 px-3 py-2 bg-indigo-950/40 border border-indigo-800/50 rounded flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
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
                    <div className="text-xs text-slate-500 mb-1">Steps</div>
                    <div className="text-lg font-semibold text-white">{workflowNodes.length}</div>
                  </div>
                  <div className="p-3 bg-[#020617] rounded border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Est. Time</div>
                    <div className="text-lg font-semibold text-white">
                      {workflowDesign.estimated_time_minutes < 60
                        ? `${workflowDesign.estimated_time_minutes} min`
                        : `${Math.round(workflowDesign.estimated_time_minutes / 60)} hrs`}
                    </div>
                  </div>
                  <div className="p-3 bg-[#020617] rounded border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Est. Cost</div>
                    <div className="text-lg font-semibold text-[#FDE047]">
                      ${workflowDesign.estimated_cost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Preview */}
              <div className="p-6">
                <div className="text-xs text-slate-500 font-medium mb-4">EXECUTION SEQUENCE</div>
                <div className="space-y-3 mb-6">
                  {workflowNodes.map((node) => (
                    <div key={node.id} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-400">
                        {node.order}
                      </div>
                      {node.assignedAgent ? (
                        node.assignedAgent.photo_url ? (
                          <img
                            src={node.assignedAgent.photo_url}
                            alt={node.assignedAgent.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-white text-xs font-bold">
                            {node.assignedAgent.name.substring(0, 2).toUpperCase()}
                          </div>
                        )
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">
                          ?
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {node.assignedAgent?.name || node.agent_role}
                        </div>
                        <div className="text-xs text-slate-500">{node.description}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unassigned Warning */}
                {workflowNodes.some(n => !n.assignedAgent) && (
                  <div className="mb-4 p-3 bg-amber-900/20 border border-amber-800 rounded text-amber-400 text-sm">
                    Some steps don't have matching agents. Consider hiring agents with these roles.
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                    {error}
                  </div>
                )}

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

      {step === 'workflow' && workflowDesign && (
        <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto animate-fade-in">
          {/* Mission Map */}
          <div className="bg-[#0A0A0F] rounded-lg border border-slate-800 p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-1">Workflow Details</h2>
                  <p className="text-sm text-slate-500">
                    {workflowDesign.description || 'Sequential execution plan'}
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
            <div className="relative mb-8 overflow-x-auto">
              <div className="flex items-center justify-center gap-6 min-w-max px-4">
                {workflowNodes.map((node, idx) => {
                  const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];
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
                            {node.assignedAgent ? (
                              node.assignedAgent.photo_url ? (
                                <img
                                  src={node.assignedAgent.photo_url}
                                  alt={node.assignedAgent.name}
                                  className="w-16 h-16 rounded-full object-cover mx-auto border-2"
                                  style={{ borderColor: nodeColor }}
                                />
                              ) : (
                                <div
                                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold border-2"
                                  style={{ backgroundColor: `${nodeColor}40`, borderColor: nodeColor }}
                                >
                                  {node.assignedAgent.name.substring(0, 2).toUpperCase()}
                                </div>
                              )
                            ) : (
                              <div
                                className="w-16 h-16 rounded-full mx-auto bg-slate-700 flex items-center justify-center text-slate-400 text-lg border-2"
                                style={{ borderColor: nodeColor }}
                              >
                                ?
                              </div>
                            )}
                          </div>

                          {/* Agent name */}
                          <h3 className="text-base font-semibold text-white text-center mb-1">
                            {node.assignedAgent?.name || node.agent_role}
                          </h3>
                          <div className="text-xs text-slate-500 text-center mb-3">
                            {node.assignedAgent?.role || 'Unassigned'}
                          </div>

                          {/* Step name */}
                          <p className="text-xs text-slate-400 text-center leading-relaxed">
                            {node.name}
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
                const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];
                const nodeColor = colors[idx % colors.length];

                return (
                  <div
                    key={node.id}
                    className="p-4 bg-[#020617] rounded border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {node.assignedAgent ? (
                        node.assignedAgent.photo_url ? (
                          <img
                            src={node.assignedAgent.photo_url}
                            alt={node.assignedAgent.name}
                            className="flex-shrink-0 w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-white text-sm font-bold">
                            {node.assignedAgent.name.substring(0, 2).toUpperCase()}
                          </div>
                        )
                      ) : (
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
                          ?
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-sm font-semibold text-white">
                            {node.assignedAgent?.name || node.agent_role}
                          </h4>
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded"
                            style={{ backgroundColor: `${nodeColor}20`, color: nodeColor }}
                          >
                            Step {node.order}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mb-2">{node.name}</p>
                        <p className="text-xs text-slate-500 mb-3">{node.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {node.assignedAgent && (
                            <>
                              <span>${node.assignedAgent.cost_per_hour}/hr</span>
                              <span>•</span>
                              <span>Level {node.assignedAgent.level}</span>
                            </>
                          )}
                          {node.inputs.length > 0 && (
                            <>
                              <span>•</span>
                              <span>Needs: {node.inputs.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Analysis Summary (if available) */}
            {analysis && (
              <div className="mb-8 p-4 bg-[#020617] rounded border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 mb-3">EVO'S ANALYSIS</h3>
                <p className="text-sm text-slate-300 mb-3">{analysis.understanding}</p>
                {analysis.assumptions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-slate-500 mb-1">Assumptions:</div>
                    <ul className="list-disc list-inside text-xs text-slate-400">
                      {analysis.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs">
                  <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">
                    Complexity: {analysis.estimated_complexity}
                  </span>
                  <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">
                    Confidence: {Math.round(analysis.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

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
