'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeamAgents, agentService, type Agent } from '@/lib/services/agents';
import { workflowService } from '@/lib/services/workflows/workflow.service';
import type { PendingAssumption } from '@/lib/services/workflows/types';
import { useTeamEvents } from '@/lib/contexts/TeamEventsContext';
import { useToast } from '@/lib/contexts/ToastContext';

export interface SpecialistAgent {
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

const SPECIALIST_MAP: Record<string, { avatar: string; color: string; specialty: string; lastMessage: string }> = {
  'agent-031': { avatar: '🎨', color: '#EC4899', specialty: 'Color Psychology & Brand Palettes', lastMessage: 'Ready to collaborate on your brand!' },
  'agent-032': { avatar: '🎯', color: '#8B5CF6', specialty: 'Positioning & Market Analysis', lastMessage: 'Ready to map out your strategy!' },
  'agent-033': { avatar: '✍️', color: '#10B981', specialty: 'Linguistic Strategy & Nomenclature', lastMessage: 'Standing by for naming tasks' },
  'agent-034': { avatar: '📝', color: '#F59E0B', specialty: 'Voice, Tone & Messaging', lastMessage: 'Ready to craft your message' },
};

export function useInbox(teamId: string) {
  const router = useRouter();
  const [specialists, setSpecialists] = useState<SpecialistAgent[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistAgent | null>(null);
  const [ariaHired, setAriaHired] = useState(false);
  const [readSpecialists, setReadSpecialists] = useState<Set<string>>(new Set());
  const [pendingAssumptions, setPendingAssumptions] = useState<PendingAssumption[]>([]);
  const [loadingAssumptions, setLoadingAssumptions] = useState(false);

  const { subscribe: subscribeToTeamEvents } = useTeamEvents();
  const { showToast } = useToast();
  const { agents: hiredAgents, isLoading: loadingAgents, refresh: refreshAgents } = useTeamAgents({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem(`readSpecialists_${teamId}`);
    if (stored) setReadSpecialists(new Set(JSON.parse(stored)));
  }, [teamId]);

  const loadPendingAssumptions = async () => {
    setLoadingAssumptions(true);
    try {
      const result = await workflowService.getPendingAssumptions(parseInt(teamId, 10));
      if (result.success && result.assumptions) setPendingAssumptions(result.assumptions);
    } catch (err) {
      console.error('Error loading pending assumptions:', err);
    } finally {
      setLoadingAssumptions(false);
    }
  };

  useEffect(() => {
    loadPendingAssumptions();
    const interval = setInterval(loadPendingAssumptions, 30000);
    return () => clearInterval(interval);
  }, [teamId]);

  useEffect(() => {
    const unsubRaised = subscribeToTeamEvents('assumption_raised', (data: any) => {
      loadPendingAssumptions();
      showToast({
        type: 'assumption',
        title: 'New Question',
        message: `${data.operation_title || 'An operation'} needs your input`,
        action: {
          label: 'View',
          onClick: () => router.push(`/dashboard/${teamId}/operations/${data.operation_id}`),
        },
      });
    });
    const unsubAnswered = subscribeToTeamEvents('assumption_answered', () => loadPendingAssumptions());
    return () => { unsubRaised(); unsubAnswered(); };
  }, [teamId, subscribeToTeamEvents, showToast, router]);

  const handleSelectSpecialist = (specialist: SpecialistAgent) => {
    setSelectedSpecialist(specialist);
    localStorage.setItem(`selectedSpecialist_${teamId}`, specialist.id);
    const newRead = new Set(readSpecialists);
    newRead.add(specialist.id);
    setReadSpecialists(newRead);
    localStorage.setItem(`readSpecialists_${teamId}`, JSON.stringify([...newRead]));
  };

  const handleAriaHired = async () => {
    setAriaHired(true);
    try {
      await agentService.hireAgent({ team_id: parseInt(teamId, 10), template_id: 'agent-aria-martinez', custom_name: 'Aria Martinez' });
      await refreshAgents();
    } catch (err) {
      console.error('Failed to hire Aria:', err);
    }
    const ariaContact: SpecialistAgent = {
      id: 'aria-manager', name: 'Aria Martinez', role: 'Senior Brand Lead',
      specialty: 'Personal Branding & Executive Positioning', avatar: '👩‍💼', color: '#EC4899',
      pendingQuestions: 0, isOnline: true,
      lastMessage: "Hi CEO, I'm Aria. To start, I've identified we need...", lastMessageTime: new Date(),
    };
    setSpecialists(prev => [...prev, ariaContact]);
    setTimeout(() => {
      setSelectedSpecialist(ariaContact);
      localStorage.setItem(`selectedSpecialist_${teamId}`, ariaContact.id);
      const newRead = new Set(readSpecialists);
      newRead.add('aria-manager');
      setReadSpecialists(newRead);
      localStorage.setItem(`readSpecialists_${teamId}`, JSON.stringify([...newRead]));
    }, 500);
  };

  useEffect(() => {
    if (loadingAgents) return;

    const ariaAgent = hiredAgents.find(a => a.name === 'Aria Martinez' || a.avatar_seed === 'agent-aria-martinez');
    const isAriaHired = !!ariaAgent;

    const evoContact: SpecialistAgent = {
      id: 'evo-gm', name: 'Evo', role: 'General Manager AI',
      specialty: 'Team Coordination & Strategy', avatar: '🧠', color: '#6366F1',
      pendingQuestions: !isAriaHired && !readSpecialists.has('evo-gm') ? 1 : 0,
      isOnline: true,
      lastMessage: isAriaHired ? "Excellent. I'm handing the floor to Aria..." : 'Welcome to your new Branding Department...',
      lastMessageTime: new Date(),
    };

    const contacts: SpecialistAgent[] = [evoContact];
    if (isAriaHired) {
      contacts.push({
        id: 'aria-manager', name: 'Aria Martinez', role: 'Senior Brand Lead',
        specialty: 'Personal Branding & Executive Positioning', avatar: '👩‍💼', color: '#EC4899',
        pendingQuestions: 0, isOnline: true, lastMessage: "Let's build your perfect team together...", lastMessageTime: new Date(),
      });
      setAriaHired(true);
    }

    const teamSpecialists = hiredAgents.filter(a => a.name !== 'Aria Martinez' && a.avatar_seed !== 'agent-aria-martinez');
    const mappedSpecialists: SpecialistAgent[] = teamSpecialists.map(agent => {
      const templateKey = agent.avatar_seed || '';
      const data = SPECIALIST_MAP[templateKey] || { avatar: '👤', color: '#6366F1', specialty: agent.specialty, lastMessage: 'Ready to assist you' };

      let evolutionNotification: SpecialistAgent['evolutionNotification'];
      const defaultSpecialty = SPECIALIST_MAP[templateKey]?.specialty || agent.specialty;
      if (agent.specialty !== defaultSpecialty && agent.specialty) {
        evolutionNotification = { type: 'specialization', message: `Specialized in: ${agent.specialty}` };
      } else {
        const levelProgress = (agent as Agent & { levelProgress?: number }).levelProgress || 0;
        if (levelProgress >= 50) evolutionNotification = { type: 'xp', message: `Gained ${agent.experience_points} XP` };
      }

      return {
        id: String(agent.id), name: agent.name, role: agent.role,
        specialty: data.specialty, avatar: data.avatar, color: data.color,
        pendingQuestions: 0, isOnline: agent.is_online, lastMessage: data.lastMessage,
        lastMessageTime: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
        evolutionNotification,
      };
    });

    const allContacts = [...contacts, ...mappedSpecialists];
    setSpecialists(allContacts);

    if (!selectedSpecialist) {
      const savedId = localStorage.getItem(`selectedSpecialist_${teamId}`);
      const saved = savedId ? allContacts.find(s => s.id === savedId) : null;
      if (saved) {
        setSelectedSpecialist(saved);
      } else {
        if (savedId) localStorage.removeItem(`selectedSpecialist_${teamId}`);
        const firstPending = allContacts.find(s => s.pendingQuestions > 0);
        if (firstPending) setSelectedSpecialist(firstPending);
      }
    }
  }, [teamId, ariaHired, readSpecialists, hiredAgents, loadingAgents]);

  const totalPending = specialists.reduce((sum, s) => sum + s.pendingQuestions, 0) + pendingAssumptions.length;

  return {
    specialists, selectedSpecialist, pendingAssumptions, loadingAssumptions,
    totalPending, handleSelectSpecialist, handleAriaHired, router, teamId,
  };
}
