'use client';

import { useState, useEffect } from 'react';
import { getHiredAgents, HiredAgent } from '@/lib/agents';

interface TeamOverviewProps {
  teamId: string;
  onViewOffice: () => void;
  onViewStore: () => void;
}

export default function TeamOverview({ teamId, onViewOffice, onViewStore }: TeamOverviewProps) {
  const [team, setTeam] = useState<HiredAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get team-specific hired agents
    const teamAgents = getHiredAgents(teamId);
    setTeam(teamAgents.slice(0, 6));
    setLoading(false);
  }, [teamId]);

  if (loading) {
    return (
      <div className="glass rounded-xl p-6 border border-[#2D3748]/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[#2D3748] rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#2D3748] rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#2D3748] rounded w-3/4"></div>
                  <div className="h-3 bg-[#2D3748] rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no agents hired
  if (team.length === 0) {
    return (
      <div className="glass rounded-xl p-6 border border-[#2D3748]/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#E2E8F0]">The Office</h2>
          <span className="text-sm text-slate-600">0 online</span>
        </div>

        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#161B22] flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#E2E8F0] mb-2">No Agents Yet</h3>
          <p className="text-slate-600 text-sm mb-4">
            This team needs agents to start working on operations
          </p>
          <button
            onClick={onViewStore}
            className="px-4 py-2 bg-gradient-to-r from-[#00F5FF] to-[#A3FF12] text-[#0B0E14] font-semibold rounded-lg shadow-lg shadow-[#00F5FF]/30 hover:shadow-[#00F5FF]/50 transform hover:scale-[1.02] transition-all duration-200"
          >
            Browse Agent Store →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 border border-[#2D3748]/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#E2E8F0]">The Office</h2>
        <span className="text-sm text-slate-600">
          {team.filter(a => a.isOnline).length} online
        </span>
      </div>

      <div className="space-y-4">
        {team.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center gap-4 p-3 bg-[#0B0E14]/50 border border-[#2D3748]/50 rounded-lg hover:bg-[#161B22]/70 hover:border-[#00F5FF]/30 transition-all cursor-pointer group"
          >
            {/* Avatar */}
            <div className="relative">
              <img
                src={agent.photo_url}
                alt={agent.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              {/* Online Status */}
              {agent.isOnline ? (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#A3FF12] rounded-full border-2 border-[#0B0E14]">
                  <div className="absolute inset-0 rounded-full bg-[#A3FF12] animate-pulse-ripple"></div>
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-700 rounded-full border-2 border-[#0B0E14]" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-[#E2E8F0] truncate group-hover:text-[#00F5FF] transition-colors">{agent.name}</h3>
                <span className="px-2 py-0.5 text-xs bg-[#00F5FF]/10 text-[#00F5FF] rounded border border-[#00F5FF]/20">
                  Lv {agent.level}
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate">{agent.role}</p>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="text-xs text-slate-600">Rating</div>
              <div className="text-sm font-semibold text-[#FFB800]">
                {agent.rating?.toFixed(1) || '0.0'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All */}
      <button
        onClick={onViewOffice}
        className="w-full mt-4 px-4 py-2 text-sm bg-[#0B0E14]/50 border border-[#2D3748]/50 rounded-lg text-[#E2E8F0] hover:bg-[#161B22]/70 hover:border-[#00F5FF]/30 hover:text-[#00F5FF] transition-all"
      >
        View Full Roster →
      </button>
    </div>
  );
}
