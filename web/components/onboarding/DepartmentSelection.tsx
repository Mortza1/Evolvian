'use client';

import { useState } from 'react';
import { PERSONAL_BRANDING_AGENTS } from '@/lib/personal-branding-agents';

import type { Agent } from '@/lib/agents';

interface DepartmentSelectionProps {
  onSelect: (department: string, agents?: Agent[]) => void;
  onCustomTeam: () => void;
}

export default function DepartmentSelection({ onSelect, onCustomTeam }: DepartmentSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const handleSelect = (dept: string, agents?: Agent[]) => {
    setIsSelecting(true);
    setSelectedDept(dept);
    // Brief delay for visual feedback
    setTimeout(() => {
      onSelect(dept, agents);
    }, 600);
  };

  const departments = [
    {
      id: 'personal-branding',
      name: 'Personal Branding',
      description: 'Build your digital presence with brand strategy, content, and design experts',
      icon: '✨',
      color: 'from-[#EC4899] to-[#F472B6]',
      agents: PERSONAL_BRANDING_AGENTS,
      agentCount: 4,
    },
    {
      id: 'sales',
      name: 'Sales',
      description: 'Drive revenue with outreach, lead generation, and closing specialists',
      icon: '💰',
      color: 'from-[#10B981] to-[#34D399]',
      agents: undefined,
      agentCount: 5,
    },
    {
      id: 'marketing',
      name: 'Marketing',
      description: 'Scale growth with SEO, ads, analytics, and campaign strategists',
      icon: '📈',
      color: 'from-[#8B5CF6] to-[#A78BFA]',
      agents: undefined,
      agentCount: 6,
    },
  ];

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#020617]">
      {/* Animated background gradient - same as login */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#1E293B] to-[#020617]">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6366F1] rounded-full filter blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FDE047] rounded-full filter blur-[128px] animate-pulse delay-1000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">
              Build Your First Team
            </h1>
            <p className="text-slate-400 text-lg">
              Choose a pre-built team or customize your own AI workforce
            </p>
          </div>

          {/* Department Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleSelect(dept.id, dept.agents)}
                disabled={isSelecting}
                className="glass rounded-xl p-6 hover:bg-slate-800/50 transition-all border border-slate-700/30 hover:border-slate-600/50 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${dept.color} rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                  {dept.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{dept.name}</h3>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  {dept.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{dept.agentCount} specialists</span>
                </div>

                {isSelecting && selectedDept === dept.id && (
                  <div className="mt-4 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom Team Option */}
          <div className="text-center">
            <button
              onClick={onCustomTeam}
              disabled={isSelecting}
              className="glass rounded-xl px-6 py-4 hover:bg-slate-800/50 transition-all border border-slate-700/30 hover:border-[#6366F1]/50 inline-flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-slate-400 group-hover:text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-white font-medium">Build Custom Team</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
