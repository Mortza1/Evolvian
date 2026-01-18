'use client';

import { useState, useEffect } from 'react';
import { getTeams, getGlobalMetrics, getTeamActivity, Team, TeamActivity, setActiveTeamId, syncTeamsFromBackend } from '@/lib/teams';
import CreateTeamModal from './CreateTeamModal';

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

  const handleTeamCreated = (team: Team) => {
    // Team list is already synced in createTeam function
    // Just reload from cache
    setTeams(getTeams());
    setMetrics(getGlobalMetrics());
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Command Center</h1>
            <p className="text-slate-400">Manage your AI workforce across all departments</p>
          </div>

          {/* Aggregated Metrics - The "Burn" Header */}
          <div className="grid grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Total Burn Rate</div>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${metrics.totalBurnRate.toFixed(2)}/hr
              </div>
              <div className="text-xs text-slate-400">
                ${metrics.totalSpendThisMonth.toFixed(2)} this month
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Active Workforce</div>
              <div className="text-2xl font-bold text-white mb-1">
                {metrics.totalActiveAgents} / {metrics.totalAgents}
              </div>
              <div className="text-xs text-[#10B981]">
                {Math.round((metrics.totalActiveAgents / metrics.totalAgents) * 100)}% clocked in
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">System Health</div>
              <div className="text-2xl font-bold text-white mb-1">
                {metrics.totalOperationsRunning}
              </div>
              <div className="text-xs text-slate-400">operations running</div>
            </div>

            <div className="glass rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Active Teams</div>
              <div className="text-2xl font-bold text-white mb-1">{metrics.activeTeams}</div>
              <div className="text-xs text-slate-400">departments operational</div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Your Teams</h2>
          <button
            onClick={() => setIsCreateTeamOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-medium rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200"
          >
            + Create New Team
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} onSelect={() => handleSelectTeam(team.id)} />
          ))}
        </div>

        {/* Global Inbox - Coming Soon */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Global Inbox</h2>
          <div className="glass rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">All clear!</h3>
            <p className="text-slate-400 text-sm">No agents waiting for your input across all teams</p>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreated={handleTeamCreated}
      />
    </div>
  );
}

// Team Card Component
function TeamCard({ team, onSelect }: { team: Team; onSelect: () => void }) {
  const [activity, setActivity] = useState<TeamActivity[]>([]);
  const hasUrgentIssues = false; // TODO: Implement urgency detection

  useEffect(() => {
    setActivity(getTeamActivity(team.id, 7));
  }, [team.id]);

  // Calculate budget usage percentage
  const budgetUsagePercent = team.settings.dailyBudgetCap
    ? (team.stats.spendThisMonth / 30 / team.settings.dailyBudgetCap) * 100
    : 0;

  const isNearBudgetCap = budgetUsagePercent > 80;

  return (
    <div
      onClick={onSelect}
      className="glass rounded-xl p-6 hover:bg-[#1E293B]/60 transition-all cursor-pointer group border border-slate-700/50 hover:border-slate-600"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: team.color + '30' }}
          >
            {team.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-[#6366F1] transition-colors">
              {team.name}
            </h3>
            <p className="text-xs text-slate-500">{team.description}</p>
          </div>
        </div>

        {hasUrgentIssues && (
          <span className="px-2 py-1 bg-[#FDE047]/20 text-[#FDE047] text-xs font-semibold uppercase rounded-md animate-pulse">
            Urgent
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2 bg-[#020617]/50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Agents</div>
          <div className="text-sm font-semibold text-white">
            {team.stats.activeAgents}/{team.stats.totalAgents}
          </div>
        </div>
        <div className="p-2 bg-[#020617]/50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Operations</div>
          <div className="text-sm font-semibold text-white">{team.stats.operationsThisWeek}</div>
        </div>
        <div className="p-2 bg-[#020617]/50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Spend</div>
          <div className="text-sm font-semibold text-[#FDE047]">
            ${team.stats.spendThisMonth.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Activity Sparkline */}
      <div className="mb-3">
        <div className="text-xs text-slate-500 mb-2">Activity (7 days)</div>
        <div className="flex items-end gap-1 h-12">
          {activity.map((point, idx) => {
            const maxValue = Math.max(...activity.map((p) => p.value));
            const heightPercent = (point.value / maxValue) * 100;
            return (
              <div
                key={idx}
                className="flex-1 bg-gradient-to-t from-[#6366F1] to-[#818CF8] rounded-sm transition-all hover:opacity-80"
                style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                title={`${point.value.toFixed(1)} operations`}
              />
            );
          })}
        </div>
      </div>

      {/* Budget Warning */}
      {team.settings.dailyBudgetCap && isNearBudgetCap && (
        <div className="p-2 bg-[#FDE047]/10 border border-[#FDE047]/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#FDE047]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-xs text-[#FDE047]">
              {budgetUsagePercent.toFixed(0)}% of daily budget used
            </span>
          </div>
        </div>
      )}

      {/* Enter Button */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <button className="w-full px-4 py-2 bg-[#020617]/50 border border-slate-700/50 text-white text-sm font-medium rounded-lg hover:bg-[#020617]/70 hover:border-slate-600 transition-all group-hover:border-[#6366F1] group-hover:text-[#6366F1]">
          Enter Team →
        </button>
      </div>
    </div>
  );
}
