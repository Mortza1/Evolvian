'use client';

import { Team } from '@/lib/teams';

interface DeleteTeamModalProps {
  isOpen: boolean;
  team: Team | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteTeamModal({ isOpen, team, onClose, onConfirm }: DeleteTeamModalProps) {
  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0F172A] border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-b border-red-500/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Delete Team</h2>
              <p className="text-sm text-red-300">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="glass rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: team.color + '30' }}
              >
                {team.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                <p className="text-xs text-slate-400">{team.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700/50">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Agents</div>
                <div className="text-sm font-semibold text-white">{team.stats.totalAgents}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Operations</div>
                <div className="text-sm font-semibold text-white">{team.stats.operationsThisWeek}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Spend</div>
                <div className="text-sm font-semibold text-[#FDE047]">
                  ${team.stats.spendThisMonth.toFixed(0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-200">
              Are you sure you want to delete this team? All agents, operations, and data associated with{' '}
              <strong className="text-white">{team.name}</strong> will be permanently removed.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-[#020617]/50 border-t border-slate-800 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all"
          >
            Delete Team
          </button>
        </div>
      </div>
    </div>
  );
}
