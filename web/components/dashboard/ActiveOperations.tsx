'use client';

import { useState, useEffect } from 'react';
import { getOperationsByTeam, StoredOperation } from '@/lib/operations-storage';

interface ActiveOperationsProps {
  teamId: string;
}

export default function ActiveOperations({ teamId }: ActiveOperationsProps) {
  const [operations, setOperations] = useState<StoredOperation[]>([]);

  useEffect(() => {
    // Get only in-progress operations for this team
    const teamOps = getOperationsByTeam(teamId);
    const activeOps = teamOps.filter(op => op.status === 'in_progress');
    setOperations(activeOps);
  }, [teamId]);

  if (operations.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Active Operations</h3>
        <p className="text-slate-400 text-sm">
          Start a new operation to see live progress here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Mission Control</h2>
        <span className="text-sm text-slate-400">{operations.length} active</span>
      </div>

      {operations.map((operation) => {
        // Calculate progress (simulate based on time)
        const elapsed = Date.now() - new Date(operation.timestamp).getTime();
        const estimatedDuration = operation.timeTaken * 60 * 1000; // convert minutes to ms
        const progress = Math.min(Math.floor((elapsed / estimatedDuration) * 100), 95);

        return (
          <div
            key={operation.id}
            className="glass rounded-xl p-5 transition-all duration-300"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{operation.config.title}</h3>
                <p className="text-sm text-slate-400">Processing operation...</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#FDE047]">${operation.cost.toFixed(2)}</div>
                <div className="text-xs text-slate-500">current cost</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Progress</span>
                <span className="text-xs text-slate-400">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Team Mini-Graph */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-slate-500">Team:</span>
              {operation.team.map((agent, index) => (
                <div key={agent.id} className="flex items-center">
                  <div className="relative w-8 h-8 rounded-full border-2 border-[#6366F1] ring-2 ring-[#6366F1]/30">
                    <img
                      src={agent.photo_url}
                      alt={agent.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#6366F1] rounded-full border-2 border-[#020617] animate-pulse" />
                  </div>
                  {index < operation.team.length - 1 && (
                    <div className="w-4 h-0.5 bg-slate-700 mx-1" />
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              <button className="flex-1 px-3 py-2 text-sm bg-[#020617]/50 border border-slate-700/50 rounded-lg text-slate-300 hover:bg-[#020617]/70 hover:border-slate-600 transition-all">
                View Details
              </button>
              <button className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Pause
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
