'use client';

import { useEffect, useRef } from 'react';
import { Team } from '@/lib/teams';

interface DeleteTeamModalProps {
  isOpen: boolean;
  team: Team | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteTeamModal({ isOpen, team, onClose, onConfirm }: DeleteTeamModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !team) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,14,17,0.80)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="w-full max-w-[440px] rounded-xl border shadow-2xl"
        style={{ background: '#0D1A1F', borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
            style={{ background: '#111A1D', borderColor: '#1E2D30' }}
          >
            <svg className="h-5 w-5" style={{ color: '#C47A7A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="delete-dialog-title"
              className="text-[15px] leading-snug"
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#EAE6DF' }}
            >
              Delete Team
            </h2>
            <p
              className="mt-1.5 text-[12px] leading-relaxed"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#4A6A72' }}
            >
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Team info */}
        <div className="px-6 pb-4 space-y-3">
          <div
            className="rounded-lg border p-4"
            style={{ background: '#0B1215', borderColor: '#1E2D30' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: team.color + '28', border: `1px solid ${team.color}30` }}
              >
                {team.icon}
              </div>
              <div className="min-w-0">
                <div
                  className="text-[14px] truncate"
                  style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, color: '#EAE6DF' }}
                >
                  {team.name}
                </div>
                <div
                  className="text-[11px] truncate mt-0.5"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#4A6A72' }}
                >
                  {team.description}
                </div>
              </div>
            </div>

            <div
              className="grid grid-cols-3 gap-2 pt-3"
              style={{ borderTop: '1px solid #1E2D30' }}
            >
              {[
                { label: 'Agents', value: team.stats.totalAgents },
                { label: 'Operations', value: team.stats.operationsThisWeek },
                { label: 'Spend', value: `$${team.stats.spendThisMonth.toFixed(0)}`, accent: true },
              ].map(({ label, value, accent }) => (
                <div key={label} className="text-center">
                  <div
                    className="text-[10px] mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#4A6A72' }}
                  >
                    {label}
                  </div>
                  <div
                    className="text-[13px]"
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 600,
                      color: accent ? '#BF8A52' : '#EAE6DF',
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning message */}
          <div
            className="rounded-lg border px-4 py-3"
            style={{ background: '#9E5A5A10', borderColor: '#9E5A5A40' }}
          >
            <p
              className="text-[12px] leading-relaxed"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#9E7A7A' }}
            >
              All agents, operations, and data associated with{' '}
              <span style={{ color: '#EAE6DF', fontWeight: 600 }}>{team.name}</span>{' '}
              will be permanently removed.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-2 border-t px-6 py-4"
          style={{ borderColor: '#162025' }}
        >
          <button
            ref={cancelRef}
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-[12px] transition-all"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              borderColor: '#1E2D30',
              background: 'transparent',
              color: '#4A6A72',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#111A1D'; e.currentTarget.style.color = '#EAE6DF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4A6A72'; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md border px-4 py-2 text-[12px] transition-all"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              borderColor: '#9E5A5A40',
              background: '#9E5A5A18',
              color: '#C47A7A',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#9E5A5A28'; e.currentTarget.style.borderColor = '#9E5A5A70'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#9E5A5A18'; e.currentTarget.style.borderColor = '#9E5A5A40'; }}
          >
            Delete Team
          </button>
        </div>
      </div>
    </div>
  );
}
