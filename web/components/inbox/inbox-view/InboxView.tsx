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
    <div className="h-full w-full flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-800 bg-[#0A0A0F] flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-white">Messages</h2>
            {totalPending > 0 && (
              <span className="px-2.5 py-1 bg-[#6366F1] text-white text-xs font-semibold rounded-md">{totalPending} new</span>
            )}
          </div>
          <p className="text-sm text-slate-500">Team conversations</p>
        </div>

        <PendingAssumptionsPanel assumptions={pendingAssumptions} teamId={teamId} />

        <SpecialistList
          specialists={specialists}
          selectedId={selectedSpecialist?.id ?? null}
          onSelect={handleSelectSpecialist}
        />

        <div className="p-4 border-t border-slate-800 bg-[#0A0A0F]">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Team members may ask clarifying questions</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#020617] min-w-0">
        {selectedSpecialist ? (
          selectedSpecialist.id === 'evo-gm' ? (
            <EvoChat teamId={teamId} onAriaHired={handleAriaHired} />
          ) : selectedSpecialist.id === 'aria-manager' ? (
            <AriaChat teamId={teamId} userObjective={typeof window !== 'undefined' ? localStorage.getItem('userObjective') || '' : ''} />
          ) : (
            <SpecialistChat specialist={selectedSpecialist} teamId={teamId} />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Specialist Selected</h3>
              <p className="text-sm text-slate-400">Select a specialist from the list to view their questions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
