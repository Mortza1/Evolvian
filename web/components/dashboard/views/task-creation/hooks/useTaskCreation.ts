'use client';

import { useState } from 'react';
import { useTeamAgents, type Agent } from '@/lib/services/agents';
import { workflowService } from '@/lib/services/workflows';
import type { WorkflowDesign, WorkflowStep, TaskAnalysis } from '@/lib/services/workflows';

export interface WorkflowNodeWithAgent extends WorkflowStep {
  assignedAgent?: Agent;
  order: number;
}

export function useTaskCreation(teamId: string, onClose: () => void, onTaskCreated?: (id: number) => void) {
  const [step, setStep] = useState<'input' | 'operation' | 'workflow'>('input');
  const [taskDescription, setTaskDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [workflowDesign, setWorkflowDesign] = useState<WorkflowDesign | null>(null);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNodeWithAgent[]>([]);
  const [evolutionContext, setEvolutionContext] = useState<Record<string, unknown> | null>(null);

  const { agents: hiredAgents, isLoading: loadingAgents } = useTeamAgents({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });

  const findBestAgent = (agentRole: string): Agent | undefined => {
    if (!hiredAgents.length) return undefined;
    const lower = agentRole.toLowerCase();
    return (
      hiredAgents.find(a => a.role.toLowerCase() === lower) ||
      hiredAgents.find(a => a.role.toLowerCase().includes(lower) || lower.includes(a.role.toLowerCase())) ||
      hiredAgents.find(a => a.specialty.toLowerCase().includes(lower) || lower.includes(a.specialty.toLowerCase())) ||
      hiredAgents.find(a => a.skills.some(s => s.toLowerCase().includes(lower) || lower.includes(s.toLowerCase()))) ||
      hiredAgents[0]
    );
  };

  const buildNodes = (steps: WorkflowStep[]): WorkflowNodeWithAgent[] =>
    steps.map((s, idx) => ({ ...s, assignedAgent: findBestAgent(s.agent_role), order: idx + 1 }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const result = await workflowService.quickTask(taskDescription, parseInt(teamId, 10));
      if (!result.success) throw new Error(result.error || 'Failed to generate workflow');

      setAnalysis(result.analysis || null);
      setEvolutionContext(result.evolution_context || null);

      const steps = result.workflow?.steps?.length
        ? result.workflow.steps
        : (result.analysis?.subtasks || []).length > 0
          ? result.analysis!.subtasks.map((st: any, idx: number) => ({
              id: st.id || `step-${idx + 1}`,
              name: st.title || `Step ${idx + 1}`,
              description: st.description || '',
              agent_role: st.agent_type || 'General Agent',
              inputs: [],
              outputs: [],
              depends_on: idx > 0 ? [`step-${idx}`] : [],
            }))
          : [{ id: 'step-1', name: 'Execute Task', description: taskDescription, agent_role: 'General Agent', inputs: ['task_description'], outputs: ['result'], depends_on: [] }];

      const design: WorkflowDesign = {
        title: result.workflow?.title || 'Custom Workflow',
        description: result.workflow?.description || taskDescription,
        steps,
        estimated_time_minutes: result.workflow?.estimated_time_minutes || 30,
        estimated_cost: result.workflow?.estimated_cost || 10,
      };
      setWorkflowDesign(design);
      setWorkflowNodes(buildNodes(steps));
      setStep('operation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommence = async () => {
    if (!workflowDesign) return;
    try {
      const result = await workflowService.createOperationWithWorkflow(
        parseInt(teamId, 10),
        workflowDesign.title || 'New Operation',
        taskDescription,
        workflowDesign,
      );
      if (!result.success || !result.operationId) throw new Error(result.error || 'Failed to create operation');

      setStep('input');
      setTaskDescription('');
      setWorkflowDesign(null);
      setWorkflowNodes([]);
      setAnalysis(null);
      setEvolutionContext(null);
      setError(null);
      onClose();

      if (onTaskCreated) setTimeout(() => onTaskCreated(result.operationId!), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create operation');
    }
  };

  const handleBack = () => setStep(step === 'workflow' ? 'operation' : 'input');

  return {
    step, taskDescription, setTaskDescription, isGenerating, error,
    analysis, workflowDesign, workflowNodes, evolutionContext,
    hiredAgents, loadingAgents,
    handleSubmit, handleCommence, handleBack,
    goToWorkflow: () => setStep('workflow'),
  };
}
