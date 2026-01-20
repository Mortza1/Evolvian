'use client';

import { useState, useEffect } from 'react';
import { getTeams, getGlobalMetrics, Team, setActiveTeamId, syncTeamsFromBackend } from '@/lib/teams';
import { teamAPI } from '@/lib/api';
import CreateTeamModal from './CreateTeamModal';
import PersonalBrandingFlow from '../personal-branding/PersonalBrandingFlow';
import DeleteTeamModal from './DeleteTeamModal';

interface HomeViewProps {
  onSelectTeam: (teamId: number) => void;
}

export default function HomeView({ onSelectTeam }: HomeViewProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [metrics, setMetrics] = useState({
    totalBurnRate: 0,
    totalActiveAgents: 0,
    totalAgents: 0,
    totalOperationsRunning: 0,
    totalSpend: 0,
    totalSpendThisMonth: 0,
    activeTeams: 0,
  });
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [personalBrandingTeam, setPersonalBrandingTeam] = useState<Team | null>(null);
  const [showPersonalBrandingFlow, setShowPersonalBrandingFlow] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    await syncTeamsFromBackend();
    setTeams(getTeams());
    setMetrics(getGlobalMetrics());
  };

  const handleSelectTeam = (teamId: number) => {
    setActiveTeamId(teamId);
    onSelectTeam(teamId);
  };

  const handleTeamCreated = (team: Team, isPersonalBranding?: boolean) => {
    // Team list is already synced in createTeam function
    // Just reload from cache
    setTeams(getTeams());
    setMetrics(getGlobalMetrics());

    // If personal branding, trigger the special flow
    if (isPersonalBranding) {
      setPersonalBrandingTeam(team);
      setShowPersonalBrandingFlow(true);
    }
  };

  const handlePersonalBrandingComplete = async () => {
    setShowPersonalBrandingFlow(false);

    // Reload teams to get updated stats
    await loadTeams();

    if (personalBrandingTeam) {
      handleSelectTeam(personalBrandingTeam.id);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    try {
      console.log('Attempting to delete team with ID:', team.id);

      // Try to delete from backend
      try {
        await teamAPI.deleteTeam(team.id);
      } catch (backendError) {
        console.warn('Backend delete failed, team may only exist locally:', backendError);
        // Continue anyway to clean up localStorage
      }

      // Clean up localStorage - remove hired agents for this team
      const hiredAgentsKey = `hired_agents_${team.id}`;
      localStorage.removeItem(hiredAgentsKey);

      // Also remove from teams cache manually if backend delete failed
      const teamsCache = localStorage.getItem('teams_cache');
      if (teamsCache) {
        try {
          const teams = JSON.parse(teamsCache);
          const filtered = teams.filter((t: Team) => t.id !== team.id);
          localStorage.setItem('teams_cache', JSON.stringify(filtered));
        } catch (e) {
          console.error('Error cleaning teams cache:', e);
        }
      }

      // Reload teams
      await loadTeams();

      // Close modal
      setTeamToDelete(null);
    } catch (error) {
      console.error('Failed to delete team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete team: ${errorMessage}`);
      setTeamToDelete(null);
    }
  };

  // Show Personal Branding flow if active
  if (showPersonalBrandingFlow && personalBrandingTeam) {
    return (
      <PersonalBrandingFlow
        team={personalBrandingTeam}
        onComplete={handlePersonalBrandingComplete}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0B0E14]">
      {/* Header */}
      <div className="border-b border-[#161B22] px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-semibold text-[#E2E8F0] mb-2 tracking-tight">Command Center</h1>
          </div>

          {/* Aggregated Metrics */}
          <div className="grid grid-cols-4 gap-8">
            <div className="flex flex-col gap-2 group cursor-default">
              <div className="text-xs text-slate-700 uppercase tracking-[0.1em] font-medium">Burn Rate</div>
              <div className="text-4xl font-semibold text-[#E2E8F0] transition-all group-hover:text-[#00F5FF]">
                ${metrics.totalBurnRate.toFixed(2)}<span className="text-lg text-slate-600 font-normal">/hr</span>
              </div>
              <div className="text-sm text-slate-700">
                ${metrics.totalSpendThisMonth.toFixed(2)} this month
              </div>
            </div>

            <div className="flex flex-col gap-2 group cursor-default">
              <div className="text-xs text-slate-700 uppercase tracking-[0.1em] font-medium">Workforce</div>
              <div className="text-4xl font-semibold text-[#E2E8F0] transition-all group-hover:text-[#A3FF12]">
                {metrics.totalActiveAgents}<span className="text-lg text-slate-600 font-normal">/{metrics.totalAgents}</span>
              </div>
              <div className="text-sm text-slate-700">
                {Math.round((metrics.totalActiveAgents / (metrics.totalAgents || 1)) * 100)}% active
              </div>
            </div>

            <div className="flex flex-col gap-2 group cursor-default">
              <div className="text-xs text-slate-700 uppercase tracking-[0.1em] font-medium">Operations</div>
              <div className="text-4xl font-semibold text-[#E2E8F0] transition-all group-hover:text-[#00F5FF]">
                {metrics.totalOperationsRunning}
              </div>
              <div className="text-sm text-slate-700">running now</div>
            </div>

            <div className="flex flex-col gap-2 group cursor-default">
              <div className="text-xs text-slate-700 uppercase tracking-[0.1em] font-medium">Teams</div>
              <div className="text-4xl font-semibold text-[#E2E8F0] transition-all group-hover:text-[#FFB800]">{metrics.activeTeams}</div>
              <div className="text-sm text-slate-700">active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-medium text-[#E2E8F0]">Teams</h2>
          <button
            onClick={() => setIsCreateTeamOpen(true)}
            className="group relative px-5 py-2.5 bg-gradient-to-r from-[#00F5FF] to-[#A3FF12] text-[#0B0E14] text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-[#00F5FF]/30 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#A3FF12] to-[#FFB800] opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Team
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onSelect={() => handleSelectTeam(team.id)}
              onDelete={() => setTeamToDelete(team)}
            />
          ))}
        </div>

        {/* Global Inbox */}
        <div className="mt-16 pt-12 border-t border-[#161B22]">
          <h2 className="text-xl font-medium text-[#E2E8F0] mb-6">Notifications</h2>
          <div className="relative p-12 border-2 border-[#161B22] rounded-2xl text-center hover:border-[#A3FF12]/30 transition-all bg-[#161B22]/30 group overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#A3FF12]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Checkmark icon with animation */}
            <div className="relative mb-4 inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#A3FF12]/10 border-2 border-[#A3FF12]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-[#A3FF12]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[#A3FF12]/20 animate-pulse-ripple" />
            </div>

            <div className="relative">
              <div className="text-base font-medium text-[#A3FF12] mb-1">All clear</div>
              <p className="text-sm text-slate-600">No pending actions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreated={handleTeamCreated}
      />

      {/* Delete Team Modal */}
      <DeleteTeamModal
        isOpen={!!teamToDelete}
        team={teamToDelete}
        onClose={() => setTeamToDelete(null)}
        onConfirm={() => teamToDelete && handleDeleteTeam(teamToDelete)}
      />
    </div>
  );
}

// Team Card Component (Mission Card)
function TeamCard({ team, onSelect, onDelete }: { team: Team; onSelect: () => void; onDelete: () => void }) {
  const hasActiveOperations = team.stats.operationsThisWeek > 0;

  return (
    <div
      onClick={onSelect}
      className={`
        relative p-6 border-2 rounded-2xl cursor-pointer group overflow-hidden
        transition-all
        ${hasActiveOperations
          ? 'border-[#00F5FF]/40 hover:border-[#00F5FF] bg-[#161B22]/80 hover:shadow-lg hover:shadow-[#00F5FF]/20'
          : 'border-[#161B22] hover:border-[#2D3748] bg-[#161B22]/50 hover:shadow-lg hover:shadow-[#2D3748]/10'
        }
      `}
    >
      {/* Topographical wave animation for active operations */}
      {hasActiveOperations && (
        <div className="absolute inset-0 animate-topo-wave opacity-40" />
      )}

      {/* Animated gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00F5FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Particle stream animation for active teams */}
      {hasActiveOperations && (
        <>
          <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-[#00F5FF] rounded-full animate-particle-stream" />
          <div className="absolute top-6 right-8 w-1 h-1 bg-[#A3FF12] rounded-full animate-particle-stream" style={{ animationDelay: '0.5s' }} />
        </>
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className="relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all group-hover:scale-110 shadow-lg"
              style={{
                backgroundColor: team.color + '30',
                boxShadow: `0 4px 14px ${team.color}20`
              }}
            >
              {team.icon}
              {/* Pulse ripple for active teams */}
              {hasActiveOperations && (
                <div className="absolute inset-0 rounded-xl">
                  <div
                    className="absolute inset-0 rounded-xl animate-pulse-ripple"
                    style={{
                      border: `2px solid ${team.color}40`
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#E2E8F0] group-hover:text-[#00F5FF] transition-colors">
                {team.name}
              </h3>
              <p className="text-sm text-slate-600">{team.description}</p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            title="Delete team"
          >
            <svg className="w-4 h-4 text-slate-600 hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Stats Grid with Neural Midnight colors */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-[#0B0E14]/60 border border-[#2D3748]/50 hover:border-[#A3FF12]/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-3.5 h-3.5 text-[#A3FF12]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs text-slate-600 uppercase tracking-wider">Agents</span>
            </div>
            <span className="text-lg font-semibold text-[#E2E8F0]">{team.stats.activeAgents}/{team.stats.totalAgents}</span>
          </div>

          <div className="p-3 rounded-lg bg-[#0B0E14]/60 border border-[#2D3748]/50 hover:border-[#00F5FF]/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-3.5 h-3.5 text-[#00F5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs text-slate-600 uppercase tracking-wider">Ops</span>
            </div>
            <span className="text-lg font-semibold text-[#E2E8F0]">{team.stats.operationsThisWeek}</span>
          </div>

          <div className="p-3 rounded-lg bg-[#0B0E14]/60 border border-[#2D3748]/50 hover:border-[#FFB800]/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-3.5 h-3.5 text-[#FFB800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-slate-600 uppercase tracking-wider">Spend</span>
            </div>
            <span className="text-lg font-semibold text-[#FFB800]">${team.stats.spendThisMonth.toFixed(0)}</span>
          </div>
        </div>

        {/* Arrow indicator on hover */}
        <div className="mt-4 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
          <span className="text-xs text-[#00F5FF] font-medium mr-2">Enter</span>
          <svg className="w-4 h-4 text-[#00F5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
