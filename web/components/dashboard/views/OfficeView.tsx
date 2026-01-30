'use client';

import { useState } from 'react';
import { useTeamAgents, type HiredAgent } from '@/lib/services/agents';
import AgentEvolutionModal from '@/components/office/AgentEvolutionModal';

interface OfficeViewProps {
  teamId: string;
}

export default function OfficeView({ teamId }: OfficeViewProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [evolvingAgent, setEvolvingAgent] = useState<HiredAgent | null>(null);

  // Fetch team agents from API
  const {
    agents: employees,
    isLoading,
    error,
    refresh: refreshEmployees,
  } = useTeamAgents({ teamId: parseInt(teamId, 10), autoFetch: true });

  const handleEvolveAgent = (agent: HiredAgent) => {
    setEvolvingAgent(agent);
  };

  const handleEvolutionComplete = () => {
    refreshEmployees(); // Refresh the list from API
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">The Office</h1>
          <p className="text-slate-400">Manage your workforce</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-slate-700 rounded-xl" />
                <div className="w-16 h-6 bg-slate-700 rounded-full" />
              </div>
              <div className="h-6 bg-slate-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-4" />
              <div className="h-2 bg-slate-700 rounded mb-4" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="h-16 bg-slate-700 rounded-lg" />
                <div className="h-16 bg-slate-700 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">The Office</h1>
          <p className="text-slate-400">Manage your workforce</p>
        </div>
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => refreshEmployees()}
            className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#5558E3] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state - no agents hired for this team
  if (employees.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">The Office</h1>
          <p className="text-slate-400">Manage your workforce</p>
        </div>

        <div className="glass rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3">Your Office is Empty</h3>
          <p className="text-slate-400 text-base mb-6 max-w-md mx-auto">
            You haven't hired any agents yet. Head to the Agent Store to build your team and start running operations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">The Office</h1>
        <p className="text-slate-400">Manage your workforce</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-white mb-1">{employees.length}</div>
          <div className="text-sm text-slate-400">Total Employees</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {employees.filter(e => e.is_online).length}
          </div>
          <div className="text-sm text-slate-400">Currently Online</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-[#FDE047] mb-1">
            ${employees.reduce((acc, e) => acc + e.cost_per_hour, 0).toFixed(2)}
          </div>
          <div className="text-sm text-slate-400">Total Hourly Cost</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-[#6366F1] mb-1">
            {employees.reduce((acc, e) => acc + (e.skills?.length || 0), 0)}
          </div>
          <div className="text-sm text-slate-400">Skills Learned</div>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((employee) => (
          <div
            key={employee.id}
            className="glass rounded-xl p-6 hover:bg-[#1E293B]/80 transition-all cursor-pointer"
            onClick={() => setSelectedEmployee(employee.id)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {employee.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#FDE047] rounded-full flex items-center justify-center text-xs font-bold text-[#020617]">
                  {employee.level || 1}
                </div>
              </div>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  employee.is_online
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    employee.is_online ? 'bg-green-500 animate-pulse' : 'bg-slate-600'
                  }`}
                ></div>
                {employee.is_online ? 'online' : 'offline'}
              </div>
            </div>

            {/* Info */}
            <h3 className="text-lg font-bold text-white mb-1">{employee.name}</h3>
            <p className="text-sm text-slate-400 mb-4">{employee.role}</p>

            {/* XP Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Level Progress</span>
                <span>{Math.round(employee.levelProgress || 0)}%</span>
              </div>
              <div className="w-full h-2 bg-[#020617]/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-500"
                  style={{ width: `${employee.levelProgress || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#020617]/30 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-white">{employee.tasks_completed}</div>
                <div className="text-xs text-slate-400">Tasks</div>
              </div>
              <div className="bg-[#020617]/30 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-[#6366F1]">{employee.skills?.length || 0}</div>
                <div className="text-xs text-slate-400">Skills</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEvolveAgent(employee);
                }}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-[#FDE047] to-[#F59E0B] hover:shadow-lg hover:shadow-[#FDE047]/30 text-[#020617] rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Adjust & Evolve
              </button>
              <button className="px-3 py-2 bg-[#1E293B] hover:bg-[#2D3B52] text-white border border-slate-700 rounded-lg text-sm transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            {/* Salary */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
              <span className="text-xs text-slate-400">Hourly Rate</span>
              <span className="text-sm font-bold text-[#FDE047]">${employee.cost_per_hour.toFixed(2)}/hr</span>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Evolution Modal */}
      {evolvingAgent && (
        <AgentEvolutionModal
          agent={evolvingAgent}
          teamId={teamId}
          isOpen={!!evolvingAgent}
          onClose={() => setEvolvingAgent(null)}
          onSuccess={handleEvolutionComplete}
        />
      )}
    </div>
  );
}
