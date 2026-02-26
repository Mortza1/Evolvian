'use client';

import { useState } from 'react';
import WelcomeReception from './WelcomeReception';
import DepartmentSelection from './DepartmentSelection';
import CustomTeamBuilder from './CustomTeamBuilder';
import HiringReveal from './HiringReveal';
import { type Agent } from '@/lib/agents';
import { createTeam } from '@/lib/teams';

type OnboardingStep = 'welcome' | 'department' | 'custom_team' | 'hiring';

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

  const handleDepartmentSelected = async (dept: string, deptAgents?: Agent[]) => {
    setSelectedDepartment(dept);

    // If Personal Branding is selected, create team and go directly to HQ
    if (dept === 'personal-branding') {
      const newTeam = await createTeam({
        name: 'Personal Branding',
        department: 'personal-branding',
        icon: '✨',
        color: '#EC4899',
      });
      // Mark as new team for HQ to detect
      localStorage.setItem('newTeamId', newTeam.id.toString());
      localStorage.setItem('isNewTeam', 'true');
      onComplete();
      return;
    }

    // For other departments, use the regular hiring flow
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
    // Skip demo operation and complete onboarding
    // User will be redirected to dashboard/HQ
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
    </>
  );
}
