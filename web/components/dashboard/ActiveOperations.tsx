'use client';

import { useState, useEffect } from 'react';
import { getOperationsByTeam, StoredOperation } from '@/lib/operations-storage';

interface ActiveOperationsProps {
  teamId: string;
}

export default function ActiveOperations({ teamId }: ActiveOperationsProps) {
  const [operations, setOperations] = useState<StoredOperation[]>([]);

  useEffect(() => {
    const teamOps = getOperationsByTeam(teamId);
    setOperations(teamOps.filter(op => op.status === 'in_progress'));
  }, [teamId]);

  if (operations.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#1E2D30] bg-[#0F1719]/40 flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[#1E2D30] bg-[#111A1D]">
          <svg className="h-5 w-5 text-[#3A5056]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p style={{ fontFamily: "'Syne', sans-serif" }} className="text-[14px] font-semibold text-[#4A6A72] mb-1">
          No active operations
        </p>
        <p className="text-[12px] text-[#2E4248]">
          Start a new operation to see live progress here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {operations.map((operation) => {
        const elapsed = Date.now() - new Date(operation.timestamp).getTime();
        const estimatedDuration = operation.timeTaken * 60 * 1000;
        const progress = Math.min(Math.floor((elapsed / estimatedDuration) * 100), 95);

        return (
          <OperationCard key={operation.id} operation={operation} progress={progress} />
        );
      })}
    </div>
  );
}

function OperationCard({ operation, progress }: { operation: StoredOperation; progress: number }) {
  return (
    <div className="rounded-md border border-[#1E2D30] bg-[#111A1D] overflow-hidden">
      {/* Top accent line — shows liveness */}
      <div className="h-[2px] w-full bg-[#172025] relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[#5A9E8F] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
        {/* Shimmer on the progress bar */}
        <div
          className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-[#7BBDAE]/60 to-transparent animate-shimmer"
          style={{ left: `${progress}%` }}
        />
      </div>

      <div className="px-5 py-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-4">
            <h3
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
              className="text-[15px] text-[#D8D4CC] mb-1 leading-snug"
            >
              {operation.config.title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5A9E8F] opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#5A9E8F]" />
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#4A6A72]">
                processing
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span
              style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.02em' }}
              className="text-[1.4rem] font-medium text-[#BF8A52] leading-none"
            >
              ${operation.cost.toFixed(2)}
            </span>
            <p className="text-[10px] text-[#2E4248] mt-1">current cost</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[#3A5056]">Progress</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#5A9E8F]">
              {progress}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-[#172025] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#5A9E8F] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Team agents */}
        {operation.team && operation.team.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[11px] text-[#2E4248] mr-1">Team</span>
            <div className="flex items-center">
              {operation.team.map((agent, idx) => (
                <div
                  key={agent.id}
                  className="relative"
                  style={{ marginLeft: idx > 0 ? '-8px' : '0' }}
                >
                  <img
                    src={agent.photo_url}
                    alt={agent.name}
                    className="h-7 w-7 rounded-md object-cover border-2 border-[#111A1D]"
                    title={agent.name}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className="flex-1 rounded-md border border-[#1E2D30] bg-[#0F1719] px-3 py-2 text-[12px] text-[#7A9EA6] transition-all hover:border-[#5A9E8F]/40 hover:text-[#5A9E8F]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            View details
          </button>
          <button
            className="rounded-md border border-[#1E2D30] px-3 py-2 text-[12px] text-[#2E4248] transition-all hover:border-red-800/40 hover:text-red-400/70"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Pause
          </button>
        </div>
      </div>
    </div>
  );
}
