'use client';

import SpecialistChat from '../SpecialistChat';
import EvoChat from '../EvoChat';
import AriaChat from '../AriaChat';
import { useInbox } from '../hooks/useInbox';
import { PendingAssumptionsPanel } from '../components/PendingAssumptionsPanel';
import { SpecialistList } from '../components/SpecialistList';

interface InboxViewProps {
  teamId: string;
}

export default function InboxView({ teamId }: InboxViewProps) {
  const {
    specialists, selectedSpecialist, pendingAssumptions,
    totalPending, handleSelectSpecialist, handleAriaHired,
  } = useInbox(teamId);

  return (
    <div
      className="h-full w-full flex"
      style={{ background: '#0B1215', fontFamily: "'Syne', sans-serif" }}
    >
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className="flex w-[300px] shrink-0 flex-col border-r"
        style={{ background: '#080E11', borderColor: '#162025' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-5"
          style={{ borderColor: '#162025' }}
        >
          <div>
            <h2
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' }}
              className="text-[17px] text-[#D8D4CC]"
            >
              Messages
            </h2>
            <p className="mt-0.5 text-[12px] text-[#3A5056]">Team conversations</p>
          </div>
          {totalPending > 0 && (
            <span
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              className="flex h-6 min-w-[24px] items-center justify-center rounded border border-[#5A9E8F]/40 bg-[#5A9E8F]/10 px-1.5 text-[11px] font-semibold text-[#5A9E8F]"
            >
              {totalPending}
            </span>
          )}
        </div>

        {/* Pending assumptions */}
        <PendingAssumptionsPanel assumptions={pendingAssumptions} teamId={teamId} />

        {/* Specialist list */}
        <SpecialistList
          specialists={specialists}
          selectedId={selectedSpecialist?.id ?? null}
          onSelect={handleSelectSpecialist}
        />

        {/* Footer hint */}
        <div
          className="border-t px-5 py-3.5"
          style={{ borderColor: '#162025' }}
        >
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2A3E44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] leading-relaxed text-[#2A3E44]">
              Team members may ask clarifying questions during operations
            </span>
          </div>
        </div>
      </aside>

      {/* ── Chat area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: '#0B1215' }}>
        {selectedSpecialist ? (
          selectedSpecialist.id === 'evo-gm' ? (
            <EvoChat teamId={teamId} onAriaHired={handleAriaHired} />
          ) : selectedSpecialist.id === 'aria-manager' ? (
            <AriaChat
              teamId={teamId}
              userObjective={typeof window !== 'undefined' ? localStorage.getItem('userObjective') || '' : ''}
            />
          ) : (
            <SpecialistChat specialist={selectedSpecialist} teamId={teamId} />
          )
        ) : (
          /* Empty state */
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center max-w-sm animate-evolve-in">
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-md border border-[#1E2D30] bg-[#111A1D]"
              >
                <svg className="h-7 w-7 text-[#3A5056]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3
                style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                className="text-[16px] text-[#7A9EA6] mb-2"
              >
                Select a conversation
              </h3>
              <p className="text-[13px] text-[#2E4248] leading-relaxed">
                Choose a team member from the list to view your conversation
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
