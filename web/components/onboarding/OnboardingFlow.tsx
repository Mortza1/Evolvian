'use client';

import { useState } from 'react';
import WelcomeReception from './WelcomeReception';
import DepartmentSelection from './DepartmentSelection';
import HiringReveal from './HiringReveal';
import FirstMission from './FirstMission';

type OnboardingStep = 'welcome' | 'department' | 'hiring' | 'mission';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const handleWelcomeComplete = () => {
    setStep('department');
  };

  const handleDepartmentSelected = (dept: string) => {
    setSelectedDepartment(dept);
    setStep('hiring');
  };

  const handleHiringComplete = () => {
    setStep('mission');
  };

  const handleMissionComplete = () => {
    onComplete();
  };

  return (
    <>
      {step === 'welcome' && <WelcomeReception onComplete={handleWelcomeComplete} />}
      {step === 'department' && <DepartmentSelection onSelect={handleDepartmentSelected} />}
      {step === 'hiring' && (
        <HiringReveal department={selectedDepartment!} onComplete={handleHiringComplete} />
      )}
      {step === 'mission' && <FirstMission onComplete={handleMissionComplete} />}
    </>
  );
}
