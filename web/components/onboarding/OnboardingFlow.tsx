'use client';

import { useState } from 'react';
import WelcomeReception from './WelcomeReception';
import DepartmentSelection from './DepartmentSelection';
import CustomTeamBuilder from './CustomTeamBuilder';
import HiringReveal from './HiringReveal';
import OperationFlow from '../operations/OperationFlow';
import { type Agent } from '@/lib/agents';

type OnboardingStep = 'welcome' | 'department' | 'custom_team' | 'hiring' | 'operation';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [customTeam, setCustomTeam] = useState<Agent[]>([]);

  const handleWelcomeComplete = () => {
    setStep('department');
  };

  const handleDepartmentSelected = (dept: string, deptAgents?: Agent[]) => {
    setSelectedDepartment(dept);
    // If department agents are provided, use them as custom team
    if (deptAgents && deptAgents.length > 0) {
      setCustomTeam(deptAgents);
    }
    setStep('hiring');
  };

  const handleCustomTeamStart = () => {
    setStep('custom_team');
  };

  const handleCustomTeamComplete = (employees: Agent[]) => {
    setCustomTeam(employees);
    setSelectedDepartment('custom');
    setStep('hiring');
  };

  const handleCustomTeamBack = () => {
    setStep('department');
  };

  const handleHiringComplete = () => {
    setStep('operation');
  };

  const handleOperationComplete = () => {
    onComplete();
  };

  return (
    <>
      {step === 'welcome' && <WelcomeReception onComplete={handleWelcomeComplete} />}
      {step === 'department' && (
        <DepartmentSelection
          onSelect={handleDepartmentSelected}
          onCustomTeam={handleCustomTeamStart}
        />
      )}
      {step === 'custom_team' && (
        <CustomTeamBuilder
          onComplete={handleCustomTeamComplete}
          onBack={handleCustomTeamBack}
        />
      )}
      {step === 'hiring' && (
        <HiringReveal
          department={selectedDepartment!}
          customEmployees={customTeam}
          onComplete={handleHiringComplete}
        />
      )}
      {step === 'operation' && customTeam.length > 0 && (
        <OperationFlow
          agents={customTeam}
          onComplete={handleOperationComplete}
        />
      )}
    </>
  );
}
