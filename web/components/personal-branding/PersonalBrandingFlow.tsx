'use client';

import { useState, useEffect } from 'react';
import EvoGMChat from './EvoGMChat';
import AriaOnboarding from './AriaOnboarding';
import SpecialistRecruitment from './SpecialistRecruitment';
import { Team, updateTeam } from '@/lib/teams';
import { hireAgent } from '@/lib/agents';
import { PERSONAL_BRANDING_AGENTS } from '@/lib/personal-branding-agents';

interface PersonalBrandingFlowProps {
  team: Team;
  onComplete: () => void;
}

type FlowStep = 'evo-intro' | 'aria-hire' | 'aria-briefing' | 'specialist-recruitment' | 'complete';

export default function PersonalBrandingFlow({ team, onComplete }: PersonalBrandingFlowProps) {
  const [step, setStep] = useState<FlowStep>('evo-intro');
  const [discoveryDocument, setDiscoveryDocument] = useState<File | null>(null);

  const handleEvoComplete = () => {
    setStep('aria-hire');
  };

  const handleAriaHired = () => {
    setStep('aria-briefing');
  };

  const handleDiscoveryComplete = (doc: File | null) => {
    setDiscoveryDocument(doc);
    setStep('specialist-recruitment');
  };

  const handleSpecialistsHired = async () => {
    setStep('complete');

    // Hire all Personal Branding agents (they all start online)
    PERSONAL_BRANDING_AGENTS.forEach(agent => {
      hireAgent(agent, team.id.toString(), { isOnline: true });
    });

    // Calculate total burn rate (sum of all hourly rates)
    const totalHourlyBurn = PERSONAL_BRANDING_AGENTS.reduce(
      (sum, agent) => sum + agent.price_per_hour,
      0
    );

    // Update team stats
    const updatedStats = {
      ...team.stats,
      totalAgents: 4,
      activeAgents: 4,
    };

    await updateTeam(team.id, {
      stats: updatedStats,
    });

    // Wait a moment then complete
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#020617]">
      {step === 'evo-intro' && (
        <EvoGMChat
          teamName={team.name}
          onComplete={handleEvoComplete}
        />
      )}

      {step === 'aria-hire' && (
        <AriaOnboarding
          key="aria-hire-phase"
          teamName={team.name}
          onHired={handleAriaHired}
        />
      )}

      {step === 'aria-briefing' && (
        <AriaOnboarding
          key="aria-briefing-phase"
          teamName={team.name}
          onHired={handleAriaHired}
          showBriefing={true}
          onDiscoveryComplete={handleDiscoveryComplete}
        />
      )}

      {step === 'specialist-recruitment' && (
        <SpecialistRecruitment
          teamId={team.id.toString()}
          discoveryDoc={discoveryDocument}
          onComplete={handleSpecialistsHired}
        />
      )}

      {step === 'complete' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Team Setup Complete!</h2>
            <p className="text-slate-400">Entering your workspace...</p>
          </div>
        </div>
      )}
    </div>
  );
}
