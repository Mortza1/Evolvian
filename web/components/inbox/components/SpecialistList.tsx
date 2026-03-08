'use client';

import type { SpecialistAgent } from '../hooks/useInbox';

function formatTimeAgo(date?: Date): string {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const EVOLUTION_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  specialization: { bg: '#BF8A52/12', text: '#BF8A52', border: '#BF8A52/30' },
  level_up:       { bg: '#5A9E8F/12', text: '#5A9E8F', border: '#5A9E8F/30' },
  xp:             { bg: '#7A9EA6/12', text: '#7A9EA6', border: '#7A9EA6/30' },
};

interface SpecialistListProps {
  specialists: SpecialistAgent[];
  selectedId: string | null;
  onSelect: (specialist: SpecialistAgent) => void;
}

export function SpecialistList({ specialists, selectedId, onSelect }: SpecialistListProps) {
  if (specialists.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-[#1E2D30] bg-[#111A1D]">
          <svg className="h-4 w-4 text-[#2A3E44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p style={{ fontFamily: "'Syne', sans-serif" }} className="text-[13px] font-medium text-[#3A5056]">
          No team members yet
        </p>
        <p className="mt-1 text-[11px] text-[#2A3E44]">Hire agents to start collaborating</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {specialists.map((specialist, i) => {
        const isActive = selectedId === specialist.id;

        return (
          <button
            key={specialist.id}
            onClick={() => onSelect(specialist)}
            className={`animate-list-item relative w-full border-b text-left transition-all duration-150 ${
              isActive
                ? 'bg-[#0F1E1B]'
                : 'hover:bg-[#0F1719]'
            }`}
            style={{
              borderColor: '#162025',
              animationDelay: `${i * 40}ms`,
            }}
          >
            {/* Active left bar */}
            {isActive && (
              <div className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-[#5A9E8F]" />
            )}

            <div className="flex items-start gap-3 px-5 py-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md text-[18px] border"
                  style={{
                    background: '#111A1D',
                    borderColor: isActive ? '#5A9E8F30' : '#1E2D30',
                  }}
                >
                  {specialist.avatar}
                </div>
                {/* Online dot */}
                {specialist.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 bg-[#5A9E8F]" style={{ borderColor: '#080E11' }} />
                )}
                {/* Pending badge */}
                {specialist.pendingQuestions > 0 && (
                  <span
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    className="absolute -right-1.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border border-[#5A9E8F]/40 bg-[#5A9E8F] px-0.5 text-[9px] font-semibold text-[#07090A]"
                  >
                    {specialist.pendingQuestions}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                    className={`text-[14px] truncate transition-colors ${isActive ? 'text-[#EAE6DF]' : 'text-[#B8B2AA]'}`}
                  >
                    {specialist.name}
                  </span>
                  <span
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    className="ml-2 shrink-0 text-[10px] text-[#2E4248]"
                  >
                    {formatTimeAgo(specialist.lastMessageTime)}
                  </span>
                </div>

                <p className="mb-1.5 text-[11px] text-[#3A5056] truncate">{specialist.role}</p>

                {specialist.evolutionNotification ? (
                  <div
                    className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      background: '#5A9E8F12',
                      color: '#5A9E8F',
                      borderColor: '#5A9E8F30',
                    }}
                  >
                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {specialist.evolutionNotification.message}
                  </div>
                ) : specialist.lastMessage ? (
                  <p className="text-[11px] text-[#2E4248] truncate">{specialist.lastMessage}</p>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
