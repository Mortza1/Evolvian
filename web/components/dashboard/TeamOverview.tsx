'use client';

import { useTeamAgents } from '@/lib/services/agents';

interface TeamOverviewProps {
  teamId: string;
  onViewOffice: () => void;
  onViewStore: () => void;
}

export default function TeamOverview({ teamId, onViewOffice, onViewStore }: TeamOverviewProps) {
  const { agents: allAgents, isLoading: loading } = useTeamAgents({ teamId: parseInt(teamId, 10), autoFetch: true });
  const team = allAgents.slice(0, 6);

  if (loading) {
    return (
      <div className="rounded-md border border-[#1E2D30] bg-[#111A1D] p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-10 w-10 shrink-0 rounded-md bg-[#1A2A2D]" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-[#1A2A2D] rounded w-2/3" />
              <div className="h-2.5 bg-[#1A2A2D] rounded w-1/2" />
            </div>
            <div className="h-3 w-8 bg-[#1A2A2D] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (team.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#1E2D30] bg-[#0F1719]/40 p-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[#1E2D30] bg-[#111A1D]">
          <svg className="h-5 w-5 text-[#3A5056]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p style={{ fontFamily: "'Syne', sans-serif" }} className="text-[14px] font-semibold text-[#4A6A72] mb-1">
          No agents yet
        </p>
        <p className="text-[12px] text-[#2E4248] mb-5">
          Hire agents to start running operations
        </p>
        <button
          onClick={onViewStore}
          className="flex items-center gap-2 rounded-md border border-[#5A9E8F]/40 bg-[#5A9E8F]/8 px-4 py-2 text-[12px] text-[#5A9E8F] font-medium transition-all hover:border-[#5A9E8F]/70 hover:bg-[#5A9E8F]/14"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Browse Agent Store
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  const onlineCount = team.filter(a => a.is_online).length;

  return (
    <div className="rounded-md border border-[#1E2D30] bg-[#111A1D] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#172025] px-5 py-4">
        <div className="flex items-center gap-2">
          {onlineCount > 0 && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5A9E8F] opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#5A9E8F]" />
            </span>
          )}
          <span
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="text-[11px] text-[#4A6A72]"
          >
            {onlineCount} online
          </span>
        </div>
        <span
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="text-[11px] text-[#2E4248]"
        >
          {team.length} shown
        </span>
      </div>

      {/* Agent list */}
      <div className="divide-y divide-[#141E22]">
        {team.map((agent) => (
          <div
            key={agent.id}
            className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-[#141E22] cursor-pointer"
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {agent.photo_url ? (
                <img
                  src={agent.photo_url}
                  alt={agent.name}
                  className="h-10 w-10 rounded-md object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-[#EAE6DF]"
                  style={{ background: '#1E2D30' }}
                >
                  {agent.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              {/* Online dot */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#111A1D] ${
                  agent.is_online ? 'bg-[#5A9E8F]' : 'bg-[#2A3E44]'
                }`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  style={{ fontFamily: "'Syne', sans-serif" }}
                  className="text-[14px] font-semibold text-[#C8C4BC] truncate group-hover:text-[#EAE6DF] transition-colors"
                >
                  {agent.name}
                </span>
                <span
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  className="shrink-0 rounded border border-[#1E2D30] bg-[#0F1719] px-1.5 py-px text-[9px] text-[#4A6A72]"
                >
                  Lv {agent.level}
                </span>
              </div>
              <p className="text-[12px] text-[#3A5056] truncate">{agent.role}</p>
            </div>

            {/* Rating */}
            <div className="shrink-0 text-right">
              <span
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                className="text-[14px] font-medium text-[#BF8A52]"
              >
                {agent.rating?.toFixed(1) || '—'}
              </span>
              <p className="text-[10px] text-[#2E4248] mt-0.5">rating</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#172025] px-5 py-3">
        <button
          onClick={onViewOffice}
          className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-[12px] text-[#3A5056] transition-all hover:text-[#5A9E8F]"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          View full roster
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
