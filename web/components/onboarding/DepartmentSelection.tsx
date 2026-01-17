'use client';

import { useState, useMemo } from 'react';
import { getAgents } from '@/lib/agents';

import type { Agent } from '@/lib/agents';

interface DepartmentSelectionProps {
  onSelect: (department: string, agents?: Agent[]) => void;
  onCustomTeam: () => void;
}

export default function DepartmentSelection({ onSelect, onCustomTeam }: DepartmentSelectionProps) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [mode, setMode] = useState<'choose' | 'custom'>('choose');

  const allAgents = useMemo(() => getAgents(), []);

  // Build departments from real agents
  const departments = useMemo(() => {
    // Compliance Department - top 3 compliance agents
    const complianceAgents = allAgents
      .filter(a => a.category === 'Compliance')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);

    // Sales Department - top 3 sales agents
    const salesAgents = allAgents
      .filter(a => a.category === 'Sales')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);

    // Marketing Department - top 3 marketing agents
    const marketingAgents = allAgents
      .filter(a => a.category === 'Marketing')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);

    return [
      {
        id: 'compliance',
        name: 'Compliance & Legal',
        description: 'Review documents for regulatory compliance, risk assessment, and legal requirements',
        agents: complianceAgents,
        salary: `$${complianceAgents.reduce((sum, a) => sum + a.price_per_hour, 0).toFixed(2)}/hr`,
        recommended: true,
        icon: ShieldIcon,
        color: 'from-emerald-500 to-teal-500',
      },
      {
        id: 'sales',
        name: 'Sales & Outreach',
        description: 'Generate leads, qualify prospects, and personalize outreach campaigns',
        agents: salesAgents,
        salary: `$${salesAgents.reduce((sum, a) => sum + a.price_per_hour, 0).toFixed(2)}/hr`,
        recommended: false,
        icon: RocketIcon,
        color: 'from-blue-500 to-indigo-500',
      },
      {
        id: 'marketing',
        name: 'Marketing & Content',
        description: 'Create content, manage social media, and analyze campaign performance',
        agents: marketingAgents,
        salary: `$${marketingAgents.reduce((sum, a) => sum + a.price_per_hour, 0).toFixed(2)}/hr`,
        recommended: false,
        icon: MegaphoneIcon,
        color: 'from-purple-500 to-pink-500',
      },
    ];
  }, [allAgents]);

  const handleSelect = (deptId: string) => {
    setSelectedDept(deptId);
    // Brief delay for visual feedback
    const selectedDepartment = departments.find(d => d.id === deptId);
    setTimeout(() => {
      onSelect(deptId, selectedDepartment?.agents);
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-6">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#6366F1] rounded-full filter blur-[128px] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Build Your First Team
          </h1>
          <p className="text-slate-400 text-lg">
            Choose a pre-built department for quick start, or build your own custom team
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-12">
          <div className="glass rounded-xl p-1.5 inline-flex gap-1">
            <button
              onClick={() => setMode('choose')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                mode === 'choose'
                  ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Quick Start Departments
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                mode === 'custom'
                  ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Build Custom Team
            </button>
          </div>
        </div>

        {/* Content based on mode */}
        {mode === 'choose' ? (
          <>
            {/* Department Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {departments.map((dept) => {
            const Icon = dept.icon;
            const isSelected = selectedDept === dept.id;

            return (
              <button
                key={dept.id}
                onClick={() => handleSelect(dept.id)}
                disabled={isSelected}
                className={`relative glass rounded-2xl p-6 text-left transition-all duration-300 hover:bg-[#1E293B]/80 ${
                  isSelected ? 'ring-2 ring-[#6366F1] scale-105' : 'hover:scale-105'
                }`}
              >
                {/* Recommended Badge */}
                {dept.recommended && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#FDE047] to-[#FACC15] text-[#020617] text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    RECOMMENDED
                  </div>
                )}

                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${dept.color} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-2">{dept.name}</h3>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  {dept.description}
                </p>

                {/* Team Members */}
                <div className="mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                    Team Members
                  </p>
                  <div className="space-y-2">
                    {dept.agents.map((agent, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs bg-[#020617]/30 p-2 rounded-lg"
                      >
                        <img
                          src={agent.photo_url}
                          alt={agent.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-200 truncate">{agent.name}</div>
                          <div className="text-slate-500 text-[10px] truncate">{agent.role}</div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-[10px] font-semibold text-white">{agent.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Salary */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <span className="text-sm text-slate-400">Combined Salary</span>
                  <span className="text-lg font-bold text-[#FDE047]">{dept.salary}</span>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute inset-0 bg-[#6366F1]/10 rounded-2xl flex items-center justify-center">
                    <div className="w-12 h-12 bg-[#6366F1] rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

            {/* Footer Note */}
            <p className="text-center text-slate-500 text-sm">
              Don't worry - you can hire individual employees or build custom teams later
            </p>
          </>
        ) : (
          /* Custom Team Builder */
          <div className="glass rounded-2xl p-12 text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Build Your Custom Team
            </h2>
            <p className="text-slate-300 mb-6 leading-relaxed">
              Browse our talent pool and handpick exactly the employees you need.
              Choose their roles, set their priorities, and create a team that fits your unique workflow.
            </p>
            <button
              onClick={onCustomTeam}
              className="px-8 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all duration-200"
            >
              Browse Talent Pool
            </button>
            <p className="text-sm text-slate-500 mt-4">
              You'll need at least 1 employee to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}
