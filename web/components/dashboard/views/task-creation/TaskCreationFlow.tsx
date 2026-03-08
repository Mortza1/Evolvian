'use client';

import { useTaskCreation } from './hooks/useTaskCreation';
import { TaskInputStep } from './components/TaskInputStep';
import { OperationPreviewStep } from './components/OperationPreviewStep';
import { WorkflowDetailsStep } from './components/WorkflowDetailsStep';

interface TaskCreationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  userObjective: string;
  onTaskCreated?: (taskId: number) => void;
}

export default function TaskCreationFlow({ isOpen, onClose, teamId, onTaskCreated }: TaskCreationFlowProps) {
  const flow = useTaskCreation(teamId, onClose, onTaskCreated);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,9,12,0.88)' }}
    >
      {flow.step === 'input' && (
        <TaskInputStep
          taskDescription={flow.taskDescription}
          isGenerating={flow.isGenerating}
          error={flow.error}
          agentCount={flow.hiredAgents.length}
          loadingAgents={flow.loadingAgents}
          onDescriptionChange={flow.setTaskDescription}
          onSubmit={flow.handleSubmit}
          onClose={onClose}
        />
      )}

      {flow.step === 'operation' && flow.workflowDesign && (
        <OperationPreviewStep
          workflowDesign={flow.workflowDesign}
          workflowNodes={flow.workflowNodes}
          taskDescription={flow.taskDescription}
          evolutionContext={flow.evolutionContext}
          error={flow.error}
          onBack={flow.handleBack}
          onClose={onClose}
          onViewDetails={flow.goToWorkflow}
          onStart={flow.handleCommence}
        />
      )}

      {flow.step === 'workflow' && flow.workflowDesign && (
        <WorkflowDetailsStep
          workflowDesign={flow.workflowDesign}
          workflowNodes={flow.workflowNodes}
          analysis={flow.analysis}
          error={flow.error}
          onBack={flow.handleBack}
          onClose={onClose}
          onStart={flow.handleCommence}
        />
      )}
    </div>
  );
}
