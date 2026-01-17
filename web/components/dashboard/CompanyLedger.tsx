'use client';

import { useState, useEffect } from 'react';
import { getOperationsByTeam, StoredOperation } from '@/lib/operations-storage';

interface CompanyLedgerProps {
  teamId: string;
  onViewAll: () => void;
  onViewOperation: (id: string) => void;
}

export default function CompanyLedger({ teamId, onViewAll, onViewOperation }: CompanyLedgerProps) {
  const [recentOps, setRecentOps] = useState<StoredOperation[]>([]);

  useEffect(() => {
    const ops = getOperationsByTeam(teamId);
    // Show last 5 completed operations for this team
    setRecentOps(ops.filter(op => op.status === 'completed').slice(0, 5));
  }, [teamId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-[#10B981] bg-[#10B981]/20';
      case 'failed':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-[#6366F1] bg-[#6366F1]/20';
    }
  };

  if (recentOps.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Operations Yet</h3>
        <p className="text-slate-400 text-sm">
          Completed operations will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Company Ledger</h2>
        <button
          onClick={onViewAll}
          className="text-sm text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors"
        >
          View All →
        </button>
      </div>

      <div className="space-y-3">
        {recentOps.map((operation) => (
          <div
            key={operation.id}
            onClick={() => onViewOperation(operation.id)}
            className="flex items-center gap-4 p-4 bg-[#020617]/50 border border-slate-700/50 rounded-lg hover:bg-[#020617]/70 hover:border-slate-600 transition-all cursor-pointer group"
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-[#6366F1]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1 truncate group-hover:text-[#6366F1] transition-colors">
                {operation.config.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {operation.team.length} agents
                </span>
                <span>•</span>
                <span>{new Date(operation.timestamp).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-slate-500">Cost</div>
                <div className="text-sm font-semibold text-[#FDE047]">
                  ${operation.cost.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Time</div>
                <div className="text-sm font-semibold text-slate-300">
                  {Math.floor(operation.timeTaken / 60)}m
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-md ${getStatusColor(operation.status)}`}>
                {operation.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
