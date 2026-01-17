'use client';

import { useState, useMemo } from 'react';
import type { Agent } from '@/lib/agents';
import OfficeReveal from './OfficeReveal';
import OperationDashboard, { type OperationConfig } from './OperationDashboard';
import WorkflowVisualizer from './WorkflowVisualizer';
import LiveOffice, { type Assumption, type OperationResult } from './LiveOffice';
import AssumptionDialog from './AssumptionDialog';
import OperationReview from './OperationReview';
import { generateOperationId, saveOperation, type StoredOperation, type AgentContribution } from '@/lib/operations-storage';

interface OperationFlowProps {
  agents: Agent[];
  onComplete: () => void;
}

type FlowStage = 'reveal' | 'dashboard' | 'workflow' | 'live' | 'review';

export default function OperationFlow({ agents, onComplete }: OperationFlowProps) {
  const [stage, setStage] = useState<FlowStage>('reveal');
  const [config, setConfig] = useState<OperationConfig | null>(null);
  const [currentAssumption, setCurrentAssumption] = useState<Assumption | null>(null);
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
  const [operationStartTime, setOperationStartTime] = useState<number>(0);

  // Generate a unique operation ID when flow starts
  const operationId = useMemo(() => generateOperationId(), []);

  // Phase 1: Office Reveal
  const handleRevealComplete = () => {
    setStage('dashboard');
  };

  // Phase 2: Operation Setup
  const handleStartOperation = (operationConfig: OperationConfig) => {
    setConfig(operationConfig);
    setStage('workflow');
  };

  // Phase 3: Workflow Visualization
  const handleWorkflowApprove = () => {
    setOperationStartTime(Date.now());
    setStage('live');
  };

  const handleWorkflowCancel = () => {
    setStage('dashboard');
  };

  // Phase 4: Live Office - Assumption Handler
  const handleAssumption = (assumption: Assumption) => {
    setCurrentAssumption(assumption);
  };

  const handleAssumptionResponse = (response: string) => {
    console.log('Assumption response:', response);
    setCurrentAssumption(null);
    // The LiveOffice component will continue automatically
  };

  // Phase 4: Live Office - Completion Handler
  const handleOperationComplete = (result: OperationResult) => {
    setOperationResult(result);
    setStage('review');
  };

  // Phase 5: Review Complete
  const handleReviewComplete = (feedbackData?: any[]) => {
    // Save the complete operation to storage
    if (config && operationResult) {
      // Generate mock agent contributions based on workflow
      const contributions: AgentContribution[] = agents.map((agent, index) => ({
        agent,
        task: agent.role.toLowerCase().includes('scanner')
          ? 'Document extraction and analysis'
          : agent.role.toLowerCase().includes('auditor')
          ? `${config.rulebook.toUpperCase()} compliance review`
          : 'Executive summary generation',
        input: index === 0 ? config.document?.name || 'Operation input' : 'Previous agent output',
        output: index === agents.length - 1 ? 'Final report' : 'Processed data',
        timeTaken: Math.floor(operationResult.time_taken * 60 / agents.length), // distribute time evenly
        status: 'completed' as const,
      }));

      const operation: StoredOperation = {
        id: operationId,
        timestamp: new Date(operationStartTime),
        config,
        team: agents,
        cost: operationResult.cost,
        timeTaken: operationResult.time_taken,
        status: 'completed',
        result: operationResult,
        agentContributions: contributions,
        userFeedback: feedbackData,
      };

      saveOperation(operation);
    }

    onComplete();
  };

  if (!config && stage !== 'reveal' && stage !== 'dashboard') {
    // Safety check - shouldn't happen, but just in case
    setStage('dashboard');
    return null;
  }

  return (
    <>
      {stage === 'reveal' && (
        <OfficeReveal
          agents={agents}
          onContinue={handleRevealComplete}
        />
      )}

      {stage === 'dashboard' && (
        <OperationDashboard
          agents={agents}
          onStartOperation={handleStartOperation}
          onBack={onComplete}
        />
      )}

      {stage === 'workflow' && config && (
        <WorkflowVisualizer
          agents={agents}
          config={config}
          onApprove={handleWorkflowApprove}
          onCancel={handleWorkflowCancel}
        />
      )}

      {stage === 'live' && config && (
        <>
          <LiveOffice
            agents={agents}
            config={config}
            onAssumption={handleAssumption}
            onComplete={handleOperationComplete}
          />

          {/* Assumption Dialog Overlay */}
          {currentAssumption && (
            <AssumptionDialog
              assumption={currentAssumption}
              onRespond={handleAssumptionResponse}
            />
          )}
        </>
      )}

      {stage === 'review' && operationResult && config && (
        <OperationReview
          result={operationResult}
          agents={agents}
          documentName={config.document?.name}
          onComplete={handleReviewComplete}
        />
      )}
    </>
  );
}
