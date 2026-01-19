'use client';

import { useState, useEffect } from 'react';
import SpecialistChat from './SpecialistChat';
import EvoChat from './EvoChat';
import AriaChat from './AriaChat';
import { getHiredAgents, HiredAgent, hireAgent, Agent } from '@/lib/agents';

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
  evolutionNotification?: {
    type: 'xp' | 'specialization' | 'level_up';
    message: string;
  };
}

interface InboxViewProps {
  teamId: string;
}

export default function InboxView({ teamId }: InboxViewProps) {
  const [specialists, setSpecialists] = useState<SpecialistAgent[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistAgent | null>(null);
  const [ariaHired, setAriaHired] = useState(false);

  // Handle specialist selection with localStorage persistence
  const handleSelectSpecialist = (specialist: SpecialistAgent) => {
    setSelectedSpecialist(specialist);
    localStorage.setItem(`selectedSpecialist_${teamId}`, specialist.id);
  };

  const handleAriaHired = () => {
    // Set flag to show Aria
    setAriaHired(true);

    // Create Aria as a hired agent (add to employees)
    const ariaAgent: Agent = {
      id: 'aria-manager',
      name: 'Aria Martinez',
      role: 'Senior Brand Lead',
      category: 'Management',
      specialization: 'Personal Branding & Executive Positioning',
      description: 'Senior Brand Lead specializing in personal branding for C-suite executives, thought leaders, and entrepreneurs. Expert in team coordination and brand strategy.',
      model: 'gpt-4',
      price_per_hour: 85,
      level: 10,
      rating: 4.9,
      total_reviews: 342,
      creator: 'Evolvian',
      creator_type: 'official',
      tools: ['brand_strategy', 'team_management', 'stakeholder_communication'],
      photo_url: 'https://i.pravatar.cc/150?img=45',
      tags: ['management', 'branding', 'strategy', 'leadership'],
    };

    // Add Aria to hired agents list
    hireAgent(ariaAgent, teamId, { isOnline: true });

    // Create Aria contact
    const ariaContact: SpecialistAgent = {
      id: 'aria-manager',
      name: 'Aria Martinez',
      role: 'Senior Brand Lead',
      specialty: 'Personal Branding & Executive Positioning',
      avatar: '👩‍💼',
      color: '#EC4899',
      pendingQuestions: 1,
      isOnline: true,
      lastMessage: "Hi CEO, I'm Aria. To start, I've identified we need...",
      lastMessageTime: new Date(),
    };

    // Add Aria to specialists and select her
    setSpecialists(prev => [...prev, ariaContact]);

    // Wait a moment then switch to Aria's chat
    setTimeout(() => {
      setSelectedSpecialist(ariaContact);
      localStorage.setItem(`selectedSpecialist_${teamId}`, ariaContact.id);
    }, 500);
  };

  useEffect(() => {
    const hiredAgents = getHiredAgents(teamId);

    // Check if Aria is hired FOR THIS SPECIFIC TEAM
    const ariaAgent = hiredAgents.find(a => a.id === 'aria-manager' && a.teamId === teamId);
    const isAriaHired = !!ariaAgent;

    // Add Evo (General Manager) as first contact
    const evoContact: SpecialistAgent = {
      id: 'evo-gm',
      name: 'Evo',
      role: 'General Manager AI',
      specialty: 'Team Coordination & Strategy',
      avatar: '🧠',
      color: '#6366F1',
      pendingQuestions: isAriaHired ? 0 : 1,
      isOnline: true,
      lastMessage: isAriaHired
        ? "Excellent. I'm handing the floor to Aria..."
        : 'Welcome to your new Branding Department...',
      lastMessageTime: new Date(),
    };

    const contacts: SpecialistAgent[] = [evoContact];

    // Add Aria if hired
    if (isAriaHired) {
      const ariaContact: SpecialistAgent = {
        id: 'aria-manager',
        name: 'Aria Martinez',
        role: 'Senior Brand Lead',
        specialty: 'Personal Branding & Executive Positioning',
        avatar: '👩‍💼',
        color: '#EC4899',
        pendingQuestions: 0,
        isOnline: true,
        lastMessage: "Let's build your perfect team together...",
        lastMessageTime: new Date(),
      };
      contacts.push(ariaContact);
      setAriaHired(true);
    }

    // Filter for all agents (Branding and Management)
    const teamSpecialists = hiredAgents.filter(a =>
      (a.category === 'Branding' || a.category === 'Management') &&
      a.id !== 'aria-manager' // Aria already added above
    );

    // Map hired agents to specialist format
    const mappedSpecialists: SpecialistAgent[] = teamSpecialists.map((agent) => {
      // Map agent IDs to specialist data
      const specialistMap: Record<string, { avatar: string; color: string; specialty: string; defaultQuestions: number; lastMessage: string }> = {
        'agent-031': { // Aurora
          avatar: '🎨',
          color: '#EC4899',
          specialty: 'Color Psychology & Brand Palettes',
          defaultQuestions: 0,
          lastMessage: 'Ready to collaborate on your brand!',
        },
        'agent-032': { // Atlas
          avatar: '🎯',
          color: '#8B5CF6',
          specialty: 'Positioning & Market Analysis',
          defaultQuestions: 0,
          lastMessage: 'Ready to map out your strategy!',
        },
        'agent-033': { // Lexis
          avatar: '✍️',
          color: '#10B981',
          specialty: 'Linguistic Strategy & Nomenclature',
          defaultQuestions: 0,
          lastMessage: 'Standing by for naming tasks',
        },
        'agent-034': { // Sage
          avatar: '📝',
          color: '#F59E0B',
          specialty: 'Voice, Tone & Messaging',
          defaultQuestions: 0,
          lastMessage: 'Ready to craft your message',
        },
      };

      const specialistData = specialistMap[agent.id] || {
        avatar: '👤',
        color: '#6366F1',
        specialty: agent.specialization,
        defaultQuestions: 0,
        lastMessage: 'Ready to assist you',
      };

      // Check for recent evolution (XP gain or specialization update)
      let evolutionNotification: { type: 'xp' | 'specialization' | 'level_up'; message: string } | undefined;

      // Check if specialization was recently updated (different from default)
      const defaultSpecialty = specialistMap[agent.id]?.specialty || agent.specialization;
      if (agent.specialization !== defaultSpecialty && agent.specialization) {
        evolutionNotification = {
          type: 'specialization',
          message: `Specialized in: ${agent.specialization}`,
        };
      }

      // Check for high XP (50+ means recent gain)
      if (agent.experience >= 50 && !evolutionNotification) {
        evolutionNotification = {
          type: 'xp',
          message: `Gained ${agent.experience} XP`,
        };
      }

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
        evolutionNotification,
      };
    });

    // Combine all contacts
    const allContacts = [...contacts, ...mappedSpecialists];
    setSpecialists(allContacts);

    // Restore selected specialist from localStorage or auto-select
    if (!selectedSpecialist) {
      const savedSpecialistId = localStorage.getItem(`selectedSpecialist_${teamId}`);

      if (savedSpecialistId) {
        // Try to restore the saved selection, but only if it exists in current contacts
        const savedSpecialist = allContacts.find(s => s.id === savedSpecialistId);
        if (savedSpecialist) {
          setSelectedSpecialist(savedSpecialist);
        } else {
          // Saved specialist no longer exists (e.g., Aria not hired yet)
          // Clear the saved selection and auto-select first pending
          localStorage.removeItem(`selectedSpecialist_${teamId}`);
          const firstPending = allContacts.find(s => s.pendingQuestions > 0);
          if (firstPending) {
            setSelectedSpecialist(firstPending);
          }
        }
      } else {
        // No saved selection, auto-select first contact with pending questions
        const firstPending = allContacts.find(s => s.pendingQuestions > 0);
        if (firstPending) {
          setSelectedSpecialist(firstPending);
        }
      }
    }
  }, [teamId, ariaHired]);

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
    <div className="h-full w-full flex">
      {/* Left Sidebar - Specialist List */}
      <div className="w-80 border-r border-slate-800 bg-[#0A0A0F] flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-white">
              Messages
            </h2>
            {totalPending > 0 && (
              <span className="px-2.5 py-1 bg-[#6366F1] text-white text-xs font-semibold rounded-md">
                {totalPending} new
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Team conversations
          </p>
        </div>

        {/* Specialist List */}
        <div className="flex-1 overflow-y-auto">
          {specialists.map((specialist) => (
            <button
              key={specialist.id}
              onClick={() => handleSelectSpecialist(specialist)}
              className={`w-full p-4 border-b border-slate-800 hover:bg-slate-800/30 transition-all text-left ${
                selectedSpecialist?.id === specialist.id
                  ? 'bg-slate-800/50 border-l-2 border-l-[#6366F1]'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg border border-slate-700">
                    {specialist.avatar}
                  </div>
                  {/* Online indicator */}
                  {specialist.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0A0F]"></div>
                  )}
                  {/* Pending badge */}
                  {specialist.pendingQuestions > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#6366F1] text-white text-xs font-semibold rounded-full flex items-center justify-center">
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
                  <p className="text-xs text-slate-500 mb-1 truncate">{specialist.role}</p>

                  {/* Evolution Notification */}
                  {specialist.evolutionNotification && (
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mb-1 ${
                      specialist.evolutionNotification.type === 'specialization'
                        ? 'bg-[#FDE047]/20 text-[#FDE047] border border-[#FDE047]/30'
                        : specialist.evolutionNotification.type === 'level_up'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30'
                    }`}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span>{specialist.evolutionNotification.message}</span>
                    </div>
                  )}

                  {specialist.lastMessage && !specialist.evolutionNotification && (
                    <p className="text-xs text-slate-600 truncate">
                      {specialist.lastMessage}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800 bg-[#0A0A0F]">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Team members may ask clarifying questions</span>
          </div>
        </div>
      </div>

      {/* Right Side - Chat */}
      <div className="flex-1 flex flex-col bg-[#020617] min-w-0">
        {selectedSpecialist ? (
          selectedSpecialist.id === 'evo-gm' ? (
            <EvoChat teamId={teamId} onAriaHired={handleAriaHired} />
          ) : selectedSpecialist.id === 'aria-manager' ? (
            <AriaChat teamId={teamId} userObjective={localStorage.getItem('userObjective') || ''} />
          ) : (
            <SpecialistChat
              specialist={selectedSpecialist}
              teamId={teamId}
            />
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
