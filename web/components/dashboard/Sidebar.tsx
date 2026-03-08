'use client';

import { useState, useEffect } from 'react';
import { getTeams, getActiveTeam, Team } from '@/lib/teams';
import { getHiredAgents } from '@/lib/agents';
import { useTeamEvents } from '@/lib/contexts/TeamEventsContext';
import { TeamIcon } from '@/components/ui/TeamIcon';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  currentTeam: Team | null;
  onGoHome: () => void;
  onLogout?: () => void;
}

export default function Sidebar({ activeView, setActiveView, currentTeam, onGoHome, onLogout }: SidebarProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [baseUnreadCount, setBaseUnreadCount] = useState(0);
  const [inboxBadgeCount, setInboxBadgeCount] = useState(0);
  const [activeOperationsCount, setActiveOperationsCount] = useState(0);

  const teamEvents = currentTeam ? useTeamEvents() : null;

  useEffect(() => { setTeams(getTeams()); }, []);

  useEffect(() => {
    if (!currentTeam) { setBaseUnreadCount(0); return; }
    const calc = () => {
      try {
        const teamId = currentTeam.id.toString();
        const storedRead = localStorage.getItem(`readSpecialists_${teamId}`);
        const readSpecialists = storedRead ? new Set(JSON.parse(storedRead)) : new Set();
        const hiredAgents = getHiredAgents(teamId);
        const isAriaHired = !!hiredAgents.find(a => a.id === 'aria-manager' && a.teamId === teamId);
        let count = 0;
        if (!isAriaHired && !readSpecialists.has('evo-gm')) count++;
        if (isAriaHired && !readSpecialists.has('aria-manager')) count++;
        setBaseUnreadCount(count);
      } catch { setBaseUnreadCount(0); }
    };
    calc();
    const interval = setInterval(calc, 2000);
    return () => clearInterval(interval);
  }, [currentTeam]);

  useEffect(() => {
    if (teamEvents?.teamState) {
      setActiveOperationsCount(teamEvents.teamState.active_operations);
      setInboxBadgeCount(baseUnreadCount + teamEvents.teamState.pending_assumptions);
    } else {
      setInboxBadgeCount(baseUnreadCount);
    }
  }, [teamEvents, baseUnreadCount]);

  const navItems = [
    { id: 'hq',       label: 'HQ',       icon: HQIcon },
    { id: 'inbox',    label: 'Inbox',    icon: InboxIcon,    badge: inboxBadgeCount },
    { id: 'board',    label: 'Board',    icon: BoardIcon },
    { id: 'office',   label: 'Office',   icon: UsersIcon,    badge: activeOperationsCount },
    { id: 'store',    label: 'Store',    icon: StoreIcon },
    { id: 'vault',    label: 'Vault',    icon: VaultIcon },
    { id: 'workshop', label: 'Workshop', icon: WorkshopIcon },
  ];

  return (
    <aside
      className="relative flex w-[76px] shrink-0 flex-col items-center py-6 gap-1 border-r"
      style={{
        background: '#080E11',
        borderColor: '#162025',
        fontFamily: "'Syne', sans-serif",
      }}
    >
      {/* Wordmark / Home button */}
      <button
        onClick={onGoHome}
        title="Home"
        className="group mb-6 flex h-10 w-10 items-center justify-center rounded-md border border-[#1E2D30] bg-[#0F1719] transition-all duration-150 hover:border-[#5A9E8F]/60 hover:bg-[#0F1E1B]"
      >
        <span
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, letterSpacing: '-0.04em', fontSize: '18px' }}
          className="text-[#5A9E8F] transition-colors group-hover:text-[#7BBDAE] leading-none"
        >
          E
        </span>
      </button>

      {/* Team switcher */}
      {currentTeam && (
        <div className="relative mb-4 w-full px-3">
          <button
            onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
            title={currentTeam.name}
            className="flex h-10 w-full items-center justify-center rounded-md border border-[#1E2D30] transition-all duration-150 hover:border-[#5A9E8F]/30"
            style={{ backgroundColor: currentTeam.color + '18' }}
          >
            <TeamIcon icon={currentTeam.icon} name={currentTeam.name} color={currentTeam.color} size={28} />
          </button>

          {isTeamDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTeamDropdownOpen(false)} />
              <div
                className="absolute left-[calc(100%+10px)] top-0 z-50 w-64 rounded-md border border-[#1E2D30] py-1.5 shadow-2xl"
                style={{ background: '#0F1719' }}
              >
                <div className="px-4 py-2.5 border-b border-[#162025]">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#3A5056]">Switch Team</span>
                </div>
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => { setActiveView('hq'); setIsTeamDropdownOpen(false); }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#141E22] ${
                      currentTeam.id === team.id ? 'bg-[#141E22]' : ''
                    }`}
                  >
                    <TeamIcon icon={team.icon} name={team.name} color={team.color} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[14px] font-semibold text-[#D8D4CC]">{team.name}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#3A5056]">
                        {team.stats.activeAgents} agents
                      </div>
                    </div>
                    {currentTeam.id === team.id && (
                      <svg className="h-3.5 w-3.5 shrink-0 text-[#5A9E8F]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="mb-3 h-px w-9 bg-[#162025]" />

      {/* Navigation */}
      <nav className="flex flex-col gap-1 w-full px-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={item.label}
              className={`group relative flex flex-col items-center gap-2 rounded-md px-2 py-3 transition-all duration-150 ${
                isActive
                  ? 'bg-[#0F1E1B] text-[#5A9E8F]'
                  : 'text-[#3A5056] hover:bg-[#0F1719] hover:text-[#7A9EA6]'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#5A9E8F]" />
              )}

              {/* Icon + badge */}
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    className="absolute -right-1.5 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#5A9E8F] px-0.5 text-[8px] font-semibold text-[#07090A]"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className="text-[10px] font-medium uppercase tracking-[0.1em]">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="mb-3 h-px w-9 bg-[#162025]" />

      {/* Settings */}
      <button
        title="Settings"
        className="flex h-10 w-10 items-center justify-center rounded-md text-[#2A3E44] transition-all hover:bg-[#0F1719] hover:text-[#5A9E8F]"
      >
        <SettingsIcon className="h-[18px] w-[18px]" />
      </button>

      {/* Logout */}
      {onLogout && (
        <button
          onClick={onLogout}
          title="Logout"
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-md text-[#2A3E44] transition-all hover:bg-[#0F1719] hover:text-[#9E5A5A]"
        >
          <LogoutIcon className="h-[18px] w-[18px]" />
        </button>
      )}
    </aside>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function HQIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

function BoardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function WorkshopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
