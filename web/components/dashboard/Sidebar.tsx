'use client';

import { useState, useEffect } from 'react';
import { getTeams, getActiveTeam, Team } from '@/lib/teams';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  currentTeam: Team | null;
  onGoHome: () => void;
}

export default function Sidebar({ activeView, setActiveView, currentTeam, onGoHome }: SidebarProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);

  useEffect(() => {
    setTeams(getTeams());
  }, []);

  const navItems = [
    { id: 'hq', label: 'HQ', icon: HQIcon },
    { id: 'office', label: 'Office', icon: UsersIcon },
    { id: 'store', label: 'Store', icon: StoreIcon },
    { id: 'operations', label: 'Operations', icon: OperationsIcon },
    { id: 'ledger', label: 'Ledger', icon: LedgerIcon },
    { id: 'vault', label: 'Vault', icon: VaultIcon },
    { id: 'workshop', label: 'Workshop', icon: WorkshopIcon },
  ];

  return (
    <aside className="w-20 bg-[#020617] border-r border-slate-800 flex flex-col items-center py-6 gap-4">
      {/* Logo / Home Button */}
      <button
        onClick={onGoHome}
        className="mb-2 group relative"
        title="Go to Home"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-[#6366F1]/50 transition-all">
          <span className="text-white font-bold text-lg">E</span>
        </div>
      </button>

      {/* Team Switcher - Only show when a team is selected */}
      {currentTeam && (
        <div className="mb-4 relative">
          <button
            onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all hover:ring-2 hover:ring-[#6366F1]"
            style={{ backgroundColor: currentTeam.color + '30' }}
            title={currentTeam.name}
          >
            {currentTeam.icon}
          </button>

          {/* Dropdown Menu */}
          {isTeamDropdownOpen && (
            <div className="absolute left-20 top-0 ml-2 w-64 glass rounded-xl shadow-xl border border-slate-700/50 py-2 z-50">
              <div className="px-3 py-2 border-b border-slate-700/50">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Switch Team</div>
              </div>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    setActiveView('hq');
                    setIsTeamDropdownOpen(false);
                    // Team switching will be handled by parent
                  }}
                  className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-[#1E293B]/60 transition-all ${
                    currentTeam.id === team.id ? 'bg-[#1E293B]/40' : ''
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: team.color + '30' }}
                  >
                    {team.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-white">{team.name}</div>
                    <div className="text-xs text-slate-500">
                      {team.stats.activeAgents} active agents
                    </div>
                  </div>
                  {currentTeam.id === team.id && (
                    <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-col gap-2 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`group relative flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-[#6366F1] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
              }`}
              title={item.label}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>

              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#6366F1] rounded-r-full -ml-2"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Settings */}
      <button className="p-3 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-lg transition-all">
        <SettingsIcon className="w-6 h-6" />
      </button>
    </aside>
  );
}

// Icon Components
function HQIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function OperationsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function LedgerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function WorkshopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}
