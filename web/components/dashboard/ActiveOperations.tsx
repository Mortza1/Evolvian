'use client';

import { useState, useEffect } from 'react';

interface ActiveOperation {
  id: string;
  title: string;
  status: string;
  currentAgent: string;
  progress: number;
  cost: number;
  needsIntervention: boolean;
  question?: string;
  team: Array<{
    id: string;
    name: string;
    photo_url: string;
    active: boolean;
  }>;
}

export default function ActiveOperations() {
  const [operations, setOperations] = useState<ActiveOperation[]>([
    {
      id: '1',
      title: 'GDPR Compliance Audit',
      status: 'Scanner is processing documents...',
      currentAgent: 'Scanner',
      progress: 45,
      cost: 0.23,
      needsIntervention: false,
      team: [
        { id: '1', name: 'Scanner', photo_url: 'https://i.pravatar.cc/150?img=1', active: true },
        { id: '2', name: 'Auditor', photo_url: 'https://i.pravatar.cc/150?img=2', active: false },
        { id: '3', name: 'Reporter', photo_url: 'https://i.pravatar.cc/150?img=3', active: false },
      ],
    },
  ]);

  // Simulate live cost ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setOperations((prev) =>
        prev.map((op) => ({
          ...op,
          cost: parseFloat((op.cost + 0.001).toFixed(3)),
          progress: Math.min(op.progress + 1, 100),
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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

      {operations.map((operation) => (
        <div
          key={operation.id}
          className={`glass rounded-xl p-5 transition-all duration-300 ${
            operation.needsIntervention
              ? 'ring-2 ring-[#FDE047] shadow-lg shadow-[#FDE047]/20 animate-pulse'
              : ''
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">{operation.title}</h3>
              <p className="text-sm text-slate-400">{operation.status}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#FDE047]">${operation.cost.toFixed(2)}</div>
              <div className="text-xs text-slate-500">live cost</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Progress</span>
              <span className="text-xs text-slate-400">{operation.progress}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-500"
                style={{ width: `${operation.progress}%` }}
              />
            </div>
          </div>

          {/* Team Mini-Graph */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-500">Team:</span>
            {operation.team.map((agent, index) => (
              <div key={agent.id} className="flex items-center">
                <div
                  className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                    agent.active
                      ? 'border-[#6366F1] ring-2 ring-[#6366F1]/30'
                      : 'border-slate-700'
                  }`}
                >
                  <img
                    src={agent.photo_url}
                    alt={agent.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                  {agent.active && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#6366F1] rounded-full border-2 border-[#020617] animate-pulse" />
                  )}
                </div>
                {index < operation.team.length - 1 && (
                  <div className="w-4 h-0.5 bg-slate-700 mx-1" />
                )}
              </div>
            ))}
          </div>

          {/* Intervention Alert */}
          {operation.needsIntervention && (
            <div className="mt-4 p-3 bg-[#FDE047]/10 border border-[#FDE047]/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FDE047]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#FDE047] text-sm">?</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-300 mb-2">{operation.question}</p>
                  <button className="text-xs text-[#FDE047] hover:text-[#FDE047]/80 font-medium transition-colors">
                    Answer Question →
                  </button>
                </div>
              </div>
            </div>
          )}

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
      ))}
    </div>
  );
}
