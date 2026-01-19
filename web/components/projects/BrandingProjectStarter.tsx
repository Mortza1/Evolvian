'use client';

import { useState, useEffect } from 'react';
import { getHiredAgents, getAgents } from '@/lib/agents';

interface BrandingProjectStarterProps {
  teamId: string;
  onStartProject: () => void; // Navigate to inbox
  onHireSpecialists: () => void; // Navigate to store
}

export default function BrandingProjectStarter({
  teamId,
  onStartProject,
  onHireSpecialists,
}: BrandingProjectStarterProps) {
  const [requiredSpecialists, setRequiredSpecialists] = useState<Array<{
    id: string;
    name: string;
    role: string;
    isHired: boolean;
  }>>([]);

  useEffect(() => {
    const allAgents = getAgents();
    const hiredAgents = getHiredAgents(teamId);

    // Required branding specialists
    const brandingSpecialistIds = ['agent-031', 'agent-032', 'agent-033', 'agent-034'];

    const specialists = brandingSpecialistIds.map((id) => {
      const agent = allAgents.find((a) => a.id === id);
      const isHired = hiredAgents.some((h) => h.id === id);

      return {
        id,
        name: agent?.name || '',
        role: agent?.role || '',
        isHired,
      };
    });

    setRequiredSpecialists(specialists);
  }, [teamId]);

  const allHired = requiredSpecialists.every((s) => s.isHired);
  const hiredCount = requiredSpecialists.filter((s) => s.isHired).length;
  const totalCost = 7.40; // Sum of all specialist hourly rates

  return (
    <div className="glass rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-purple-900/40 border-b border-pink-500/20 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>

        <div className="relative flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/50 animate-pulse">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Branding Project
            </h3>
            <p className="text-sm text-pink-200/70">Complete brand identity development</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-pink-200 font-medium">Team Assembly</span>
            <span className="text-pink-400 font-bold animate-pulse">{hiredCount}/4 Specialists</span>
          </div>
          <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out relative"
              style={{ width: `${(hiredCount / 4) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Specialist Checklist */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-white mb-4">Required Specialists</h4>
        <div className="space-y-3">
          {requiredSpecialists.map((specialist) => (
            <div
              key={specialist.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                specialist.isHired
                  ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 shadow-lg shadow-pink-500/10 animate-pulse'
                  : 'bg-slate-800/50 border border-slate-700/50 hover:border-pink-500/30 hover:bg-slate-800/70'
              }`}
            >
              {/* Status Icon */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  specialist.isHired
                    ? 'bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/50 animate-bounce'
                    : 'bg-slate-700'
                }`}
              >
                {specialist.isHired ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </div>

              {/* Specialist Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{specialist.name}</div>
                <div className="text-xs text-slate-400">{specialist.role}</div>
              </div>

              {/* Status Badge */}
              {specialist.isHired ? (
                <span className="text-xs font-semibold text-pink-300 px-3 py-1 bg-gradient-to-r from-pink-500/30 to-purple-500/30 rounded-full border border-pink-500/30 animate-pulse">
                  ✓ Hired
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400 px-3 py-1 bg-slate-700/50 rounded-full border border-slate-600">
                  Needed
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-slate-300 mb-2">
                <strong className="text-white">How it works:</strong>
              </p>
              <ol className="text-xs text-slate-400 space-y-1">
                <li>1. Hire all 4 branding specialists from the Store</li>
                <li>2. Each specialist interviews you with expert questions</li>
                <li>3. Discovery phase builds alignment score to 80%</li>
                <li>4. Operation commences with full brand deliverable</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Team Cost:</span>
                <span className="text-purple-400 font-bold">${totalCost.toFixed(2)}/hour</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          {allHired ? (
            <button
              onClick={onStartProject}
              className="group w-full py-4 px-4 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 hover:shadow-2xl hover:shadow-pink-500/50 text-white rounded-lg font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="relative">Begin Discovery Interviews</span>
            </button>
          ) : (
            <button
              onClick={onHireSpecialists}
              className="group w-full py-4 px-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-pink-600 hover:via-purple-600 hover:to-pink-600 border border-slate-600 hover:border-pink-500 hover:shadow-xl hover:shadow-pink-500/30 text-white rounded-lg font-bold transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="relative">Go to Store - Hire Specialists ({4 - hiredCount} remaining)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
