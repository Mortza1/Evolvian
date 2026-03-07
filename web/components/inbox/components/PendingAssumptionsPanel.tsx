'use client';

import { useRouter } from 'next/navigation';
import type { PendingAssumption } from '@/lib/services/workflows/types';

interface PendingAssumptionsPanelProps {
  assumptions: PendingAssumption[];
  teamId: string;
}

export function PendingAssumptionsPanel({ assumptions, teamId }: PendingAssumptionsPanelProps) {
  const router = useRouter();
  if (assumptions.length === 0) return null;

  return (
    <div className="border-b border-slate-800 bg-amber-500/5">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-sm font-semibold text-amber-400">Needs Your Input</h3>
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded">{assumptions.length}</span>
        </div>

        <div className="space-y-2">
          {assumptions.slice(0, 3).map((assumption) => {
            const waitingMinutes = Math.floor(assumption.waiting_duration_seconds / 60);
            const waitingHours = Math.floor(waitingMinutes / 60);
            return (
              <button
                key={`${assumption.operation_id}-${assumption.assumption_index}`}
                onClick={() => router.push(`/dashboard/${teamId}/operations/${assumption.operation_id}`)}
                className="w-full p-3 bg-slate-800/50 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-500/50 rounded-lg transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  {assumption.agent_photo ? (
                    <img src={assumption.agent_photo} alt={assumption.agent_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-amber-500/30" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                      <span className="text-xs text-amber-400">?</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-100 font-medium mb-1 line-clamp-2 group-hover:text-amber-50">{assumption.question}</p>
                    <p className="text-xs text-slate-500 mb-1 truncate">{assumption.operation_title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400">
                        {waitingHours > 0 ? `Waiting ${waitingHours}h ${waitingMinutes % 60}m` : `Waiting ${waitingMinutes}m`}
                      </span>
                      {(assumption.priority === 'high' || assumption.priority === 'critical') && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-semibold rounded uppercase">{assumption.priority}</span>
                      )}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-amber-500 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
          {assumptions.length > 3 && (
            <p className="text-xs text-slate-500 text-center pt-1">+{assumptions.length - 3} more pending</p>
          )}
        </div>
      </div>
    </div>
  );
}
