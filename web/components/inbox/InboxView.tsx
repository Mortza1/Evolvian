'use client';

import { useState, useEffect } from 'react';
import SpecialistChat from './SpecialistChat';
import { getHiredAgents, HiredAgent } from '@/lib/agents';

interface SpecialistAgent {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatar: string;
  color: string;
  pendingQuestions: number;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
}

interface InboxViewProps {
  teamId: string;
}

export default function InboxView({ teamId }: InboxViewProps) {
  const [specialists, setSpecialists] = useState<SpecialistAgent[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistAgent | null>(null);

  useEffect(() => {
    const hiredAgents = getHiredAgents(teamId);

    // Filter for branding specialists only
    const brandingAgents = hiredAgents.filter(a => a.category === 'Branding');

    // Map hired agents to specialist format
    const mappedSpecialists: SpecialistAgent[] = brandingAgents.map((agent) => {
      // Map agent IDs to specialist data
      const specialistMap: Record<string, { avatar: string; color: string; specialty: string; defaultQuestions: number; lastMessage: string }> = {
        'agent-031': { // Aurora
          avatar: '🎨',
          color: '#EC4899',
          specialty: 'Color Psychology & Brand Palettes',
          defaultQuestions: 3,
          lastMessage: 'I have some questions about your brand palette preferences...',
        },
        'agent-032': { // Atlas
          avatar: '🎯',
          color: '#8B5CF6',
          specialty: 'Positioning & Market Analysis',
          defaultQuestions: 2,
          lastMessage: 'Need to clarify your target audience profile...',
        },
        'agent-033': { // Lexis
          avatar: '✍️',
          color: '#10B981',
          specialty: 'Linguistic Strategy & Nomenclature',
          defaultQuestions: 1,
          lastMessage: 'Ready to discuss name direction when you are',
        },
        'agent-034': { // Sage
          avatar: '📝',
          color: '#F59E0B',
          specialty: 'Voice, Tone & Messaging',
          defaultQuestions: 0,
          lastMessage: 'Standing by for your responses to Color and Strategy',
        },
      };

      const specialistData = specialistMap[agent.id] || {
        avatar: '👤',
        color: '#6366F1',
        specialty: agent.specialization,
        defaultQuestions: 0,
        lastMessage: 'Ready to assist you',
      };

      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        specialty: specialistData.specialty,
        avatar: specialistData.avatar,
        color: specialistData.color,
        pendingQuestions: specialistData.defaultQuestions,
        isOnline: agent.isOnline,
        lastMessage: specialistData.lastMessage,
        lastMessageTime: new Date(Date.now() - Math.random() * 60 * 60 * 1000), // Random time within last hour
      };
    });

    setSpecialists(mappedSpecialists);

    // Auto-select first specialist with pending questions
    const firstPending = mappedSpecialists.find(s => s.pendingQuestions > 0);
    if (firstPending) {
      setSelectedSpecialist(firstPending);
    }
  }, [teamId]);

  const totalPending = specialists.reduce((sum, s) => sum + s.pendingQuestions, 0);

  const formatTimeAgo = (date?: Date) => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Specialist List */}
      <div className="w-80 border-r border-slate-800 bg-[#0F172A] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white">Specialist Inbox</h2>
            {totalPending > 0 && (
              <span className="px-2 py-1 bg-[#6366F1] text-white text-xs font-bold rounded-full">
                {totalPending}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Direct messages from your consulting team
          </p>
        </div>

        {/* Specialist List */}
        <div className="flex-1 overflow-y-auto">
          {specialists.map((specialist) => (
            <button
              key={specialist.id}
              onClick={() => setSelectedSpecialist(specialist)}
              className={`w-full p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-all text-left ${
                selectedSpecialist?.id === specialist.id ? 'bg-slate-800/70' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: specialist.color + '30' }}
                  >
                    {specialist.avatar}
                  </div>
                  {/* Online indicator */}
                  {specialist.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0F172A]"></div>
                  )}
                  {/* Pending badge */}
                  {specialist.pendingQuestions > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#6366F1] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {specialist.pendingQuestions}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {specialist.name}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {formatTimeAgo(specialist.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">{specialist.role}</p>
                  {specialist.lastMessage && (
                    <p className="text-xs text-slate-500 truncate">
                      {specialist.lastMessage}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Specialists interview you to ensure perfect execution</span>
          </div>
        </div>
      </div>

      {/* Right Side - Chat */}
      <div className="flex-1 flex flex-col bg-[#020617]">
        {selectedSpecialist ? (
          <SpecialistChat
            specialist={selectedSpecialist}
            teamId={teamId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Specialist Selected</h3>
              <p className="text-sm text-slate-400">
                Select a specialist from the list to view their questions
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
