'use client';

import type { SpecialistAgent } from '../hooks/useInbox';

const EVOLUTION_BADGE_STYLES: Record<string, string> = {
  specialization: 'bg-[#FDE047]/20 text-[#FDE047] border border-[#FDE047]/30',
  level_up: 'bg-green-500/20 text-green-400 border border-green-500/30',
  xp: 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30',
};

function formatTimeAgo(date?: Date): string {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface SpecialistListProps {
  specialists: SpecialistAgent[];
  selectedId: string | null;
  onSelect: (specialist: SpecialistAgent) => void;
}

export function SpecialistList({ specialists, selectedId, onSelect }: SpecialistListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {specialists.map(specialist => (
        <button
          key={specialist.id}
          onClick={() => onSelect(specialist)}
          className={`w-full p-4 border-b border-slate-800 hover:bg-slate-800/30 transition-all text-left ${
            selectedId === specialist.id ? 'bg-slate-800/50 border-l-2 border-l-[#6366F1]' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg border border-slate-700">
                {specialist.avatar}
              </div>
              {specialist.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0A0F]" />
              )}
              {specialist.pendingQuestions > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#6366F1] text-white text-xs font-semibold rounded-full flex items-center justify-center">
                  {specialist.pendingQuestions}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white truncate">{specialist.name}</h3>
                <span className="text-xs text-slate-500">{formatTimeAgo(specialist.lastMessageTime)}</span>
              </div>
              <p className="text-xs text-slate-500 mb-1 truncate">{specialist.role}</p>

              {specialist.evolutionNotification ? (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${EVOLUTION_BADGE_STYLES[specialist.evolutionNotification.type]}`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{specialist.evolutionNotification.message}</span>
                </div>
              ) : specialist.lastMessage ? (
                <p className="text-xs text-slate-600 truncate">{specialist.lastMessage}</p>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
