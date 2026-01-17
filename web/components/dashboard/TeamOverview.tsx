'use client';

import { useState, useEffect } from 'react';
import { getAgents, Agent } from '@/lib/agents';

export default function TeamOverview() {
  const [team, setTeam] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const agents = getAgents();
    // Show top 6 agents for demo
    setTeam(agents.slice(0, 6));
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">The Office</h2>
        <span className="text-sm text-slate-400">{team.length} online</span>
      </div>

      <div className="space-y-4">
        {team.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center gap-4 p-3 bg-[#020617]/50 border border-slate-700/50 rounded-lg hover:bg-[#020617]/70 hover:border-slate-600 transition-all cursor-pointer"
          >
            {/* Avatar */}
            <div className="relative">
              <img
                src={agent.photo_url}
                alt={agent.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              {/* Online Status */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#10B981] rounded-full border-2 border-[#020617]" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-white truncate">{agent.name}</h3>
                <span className="px-2 py-0.5 text-xs bg-[#6366F1]/20 text-[#6366F1] rounded">
                  Lv {agent.level}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{agent.role}</p>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="text-xs text-slate-500">Rating</div>
              <div className="text-sm font-semibold text-[#FDE047]">
                {agent.rating?.toFixed(1) || '0.0'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All */}
      <button className="w-full mt-4 px-4 py-2 text-sm bg-[#020617]/50 border border-slate-700/50 rounded-lg text-slate-300 hover:bg-[#020617]/70 hover:border-slate-600 transition-all">
        View Full Roster →
      </button>
    </div>
  );
}
