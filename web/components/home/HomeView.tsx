'use client';

import { useState, useEffect } from 'react';
import { getTeams, getGlobalMetrics, Team, setActiveTeamId, syncTeamsFromBackend } from '@/lib/teams';
import { teamAPI } from '@/lib/api';
import CreateTeamModal from './CreateTeamModal';
import PersonalBrandingFlow from '../personal-branding/PersonalBrandingFlow';
import DeleteTeamModal from './DeleteTeamModal';
import { TeamIcon } from '@/components/ui/TeamIcon';

interface HomeViewProps {
  onSelectTeam: (teamId: number) => void;
}

// ─── Background: warm radial + ultra-faint phylogenetic tree ─────────────────
function EvolutionBackground() {
  return (
    <>
      {/* Warm dark radial — gives depth without being a void */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, #18272B 0%, #0F1A1D 40%, #0B1215 100%)',
        }}
      />

      {/* Subtle noise grain */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {/* Phylogenetic tree — muted sage, barely visible */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <line x1="720" y1="900" x2="720" y2="680" stroke="#5A9E8F" strokeOpacity="0.08" strokeWidth="1.5" />
        <line x1="720" y1="680" x2="480" y2="500" stroke="#5A9E8F" strokeOpacity="0.07" strokeWidth="1.2" />
        <line x1="720" y1="680" x2="960" y2="500" stroke="#5A9E8F" strokeOpacity="0.07" strokeWidth="1.2" />
        <line x1="480" y1="500" x2="340" y2="350" stroke="#5A9E8F" strokeOpacity="0.055" strokeWidth="0.9" />
        <line x1="480" y1="500" x2="580" y2="350" stroke="#5A9E8F" strokeOpacity="0.055" strokeWidth="0.9" />
        <line x1="960" y1="500" x2="860" y2="350" stroke="#5A9E8F" strokeOpacity="0.055" strokeWidth="0.9" />
        <line x1="960" y1="500" x2="1100" y2="350" stroke="#5A9E8F" strokeOpacity="0.055" strokeWidth="0.9" />
        <line x1="340" y1="350" x2="270" y2="230" stroke="#5A9E8F" strokeOpacity="0.04" strokeWidth="0.7" />
        <line x1="340" y1="350" x2="390" y2="220" stroke="#5A9E8F" strokeOpacity="0.04" strokeWidth="0.7" />
        <line x1="580" y1="350" x2="530" y2="220" stroke="#5A9E8F" strokeOpacity="0.04" strokeWidth="0.7" />
        <line x1="580" y1="350" x2="625" y2="215" stroke="#5A9E8F" strokeOpacity="0.04" strokeWidth="0.7" />
        <line x1="860" y1="350" x2="815" y2="215" stroke="#5A9E8F" strokeOpacity="0.04" strokeWidth="0.7" />
        <line x1="860" y1="350" x2="905" y2="220" stroke="#5A9E8F" strokeOpacity="0.04" strokeWidth="0.7" />
        <line x1="1100" y1="350" x2="1055" y2="220" stroke="#5A9E8F" strokeOpacity="0.04" strokeWidth="0.7" />
        <line x1="1100" y1="350" x2="1148" y2="215" stroke="#5A9E8F" strokeOpacity="0.04" strokeWidth="0.7" />
        <circle cx="720" cy="680" r="3.5" fill="#5A9E8F" fillOpacity="0.1" className="animate-node-pulse" />
        <circle cx="480" cy="500" r="2.5" fill="#5A9E8F" fillOpacity="0.08" className="animate-node-pulse" style={{ animationDelay: '0.8s' }} />
        <circle cx="960" cy="500" r="2.5" fill="#5A9E8F" fillOpacity="0.08" className="animate-node-pulse" style={{ animationDelay: '1.6s' }} />
        <circle cx="340" cy="350" r="2" fill="#5A9E8F" fillOpacity="0.06" className="animate-node-pulse" style={{ animationDelay: '0.4s' }} />
        <circle cx="580" cy="350" r="2" fill="#5A9E8F" fillOpacity="0.06" className="animate-node-pulse" style={{ animationDelay: '1.2s' }} />
        <circle cx="860" cy="350" r="2" fill="#5A9E8F" fillOpacity="0.06" className="animate-node-pulse" style={{ animationDelay: '2.0s' }} />
        <circle cx="1100" cy="350" r="2" fill="#5A9E8F" fillOpacity="0.06" className="animate-node-pulse" style={{ animationDelay: '0.6s' }} />
      </svg>
    </>
  );
}

// ─── Global stat column ───────────────────────────────────────────────────────
function StatColumn({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.02em' }}
        className="text-[2rem] font-medium text-[#EAE6DF] leading-none"
      >
        {value}
      </span>
      {sub && (
        <span
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="text-[11px] text-[#4A6A72]"
        >
          {sub}
        </span>
      )}
      <span className="text-[11px] uppercase tracking-[0.16em] text-[#4A6A72] font-medium mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────
function TeamCard({
  team,
  onSelect,
  onDelete,
  index,
}: {
  team: Team;
  onSelect: () => void;
  onDelete: () => void;
  index: number;
}) {
  const hasActiveOps = team.stats.operationsThisWeek > 0;

  return (
    <div
      onClick={onSelect}
      className="group relative flex cursor-pointer flex-col gap-6 rounded-md border border-[#1E2D30] bg-[#111A1D] p-7 transition-all duration-200
                 hover:border-[#5A9E8F]/40 hover:bg-[#141E22]
                 animate-evolve-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Left accent bar on hover */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-full bg-[#5A9E8F] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      {/* Live indicator */}
      {hasActiveOps && (
        <div className="absolute right-6 top-6 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5A9E8F] opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5A9E8F]" />
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#5A9E8F]">
            live
          </span>
        </div>
      )}

      {/* Team identity */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <TeamIcon icon={team.icon} name={team.name} color={team.color} size={52} />
          <div>
            <h3
              style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.01em' }}
              className="text-[17px] font-semibold text-[#D8D4CC] transition-colors duration-200 group-hover:text-[#EAE6DF]"
            >
              {team.name}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[#4A6A72] max-w-[280px]">
              {team.description}
            </p>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="ml-4 rounded p-1.5 text-[#2A3E44] opacity-0 transition-all duration-150 hover:bg-red-900/20 hover:text-red-400/70 group-hover:opacity-100"
          title="Delete team"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Separator */}
      <div className="h-px w-full bg-[#172025]" />

      {/* Stats + enter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[15px] font-medium text-[#A8A29C]">
              {team.stats.activeAgents}
              <span className="text-[#2E4248]">/{team.stats.totalAgents}</span>
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#3A5056]">Agents</span>
          </div>
          <div className="h-7 w-px bg-[#1A2A2E]" />
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[15px] font-medium text-[#A8A29C]">
              {team.stats.operationsThisWeek}
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#3A5056]">Ops / wk</span>
          </div>
          <div className="h-7 w-px bg-[#1A2A2E]" />
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[15px] font-medium text-[#A8A29C]">
              ${team.stats.spendThisMonth.toFixed(0)}
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#3A5056]">Spend</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[#5A9E8F] opacity-0 transition-all duration-200 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0">
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[12px]">enter</span>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="col-span-2 flex flex-col items-center justify-center rounded-md border border-dashed border-[#1E2D30] py-24 text-center
                 hover:border-[#5A9E8F]/30 transition-colors duration-300 cursor-pointer animate-evolve-in bg-[#0F1719]/40"
      style={{ animationDelay: '80ms' }}
      onClick={onCreate}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-md border border-[#1E2D30] bg-[#111A1D]">
        <svg className="h-6 w-6 text-[#3A5056]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p style={{ fontFamily: "'Syne', sans-serif" }} className="text-base font-semibold text-[#4A6A72]">
        Create your first team
      </p>
      <p className="mt-2 text-sm text-[#2E4248]">Build and deploy your AI workforce</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeView({ onSelectTeam }: HomeViewProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [metrics, setMetrics] = useState({
    totalBurnRate: 0,
    totalActiveAgents: 0,
    totalAgents: 0,
    totalOperationsRunning: 0,
    totalSpend: 0,
    totalSpendThisMonth: 0,
    activeTeams: 0,
  });
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [personalBrandingTeam, setPersonalBrandingTeam] = useState<Team | null>(null);
  const [showPersonalBrandingFlow, setShowPersonalBrandingFlow] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  useEffect(() => { loadTeams(); }, []);

  const loadTeams = async () => {
    await syncTeamsFromBackend();
    setTeams(getTeams());
    setMetrics(getGlobalMetrics());
  };

  const handleSelectTeam = (teamId: number) => {
    setActiveTeamId(teamId);
    onSelectTeam(teamId);
  };

  const handleTeamCreated = (team: Team, isPersonalBranding?: boolean) => {
    setTeams(getTeams());
    setMetrics(getGlobalMetrics());
    if (isPersonalBranding) {
      setPersonalBrandingTeam(team);
      setShowPersonalBrandingFlow(true);
    }
  };

  const handlePersonalBrandingComplete = async () => {
    setShowPersonalBrandingFlow(false);
    await loadTeams();
    if (personalBrandingTeam) handleSelectTeam(personalBrandingTeam.id);
  };

  const handleDeleteTeam = async (team: Team) => {
    try {
      try { await teamAPI.deleteTeam(team.id); } catch (e) {
        console.warn('Backend delete failed:', e);
      }
      localStorage.removeItem(`hired_agents_${team.id}`);
      const cache = localStorage.getItem('teams_cache');
      if (cache) {
        try {
          localStorage.setItem('teams_cache', JSON.stringify(JSON.parse(cache).filter((t: Team) => t.id !== team.id)));
        } catch (e) { console.error(e); }
      }
      await loadTeams();
      setTeamToDelete(null);
    } catch (error) {
      alert(`Failed to delete team: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTeamToDelete(null);
    }
  };

  if (showPersonalBrandingFlow && personalBrandingTeam) {
    return <PersonalBrandingFlow team={personalBrandingTeam} onComplete={handlePersonalBrandingComplete} />;
  }

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-hide"
      style={{ background: '#0B1215', fontFamily: "'Syne', sans-serif" }}
    >
      <EvolutionBackground />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative border-b border-[#1A2A2D] px-14 pt-14 pb-12">
        <div className="mx-auto max-w-5xl">

          {/* Wordmark row */}
          <div className="mb-10 flex items-end justify-between animate-evolve-in" style={{ animationDelay: '0ms' }}>
            <div>
              <div className="flex items-baseline gap-4 mb-2">
                <h1
                  style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em', fontWeight: 800 }}
                  className="text-[2.6rem] text-[#EAE6DF] leading-none"
                >
                  Evolvian
                </h1>
                <span
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  className="text-sm text-[#3A5056] mb-1"
                >
                  Command Center
                </span>
              </div>
              <p className="text-[14px] text-[#4A6A72] leading-relaxed max-w-md">
                Monitor and manage your AI teams from a single place.
              </p>
            </div>

            <button
              onClick={() => setIsCreateTeamOpen(true)}
              className="group flex items-center gap-2.5 rounded-md border border-[#5A9E8F]/40 bg-[#5A9E8F]/8 px-5 py-3 text-[13px] text-[#5A9E8F] font-medium
                         transition-all duration-150 hover:border-[#5A9E8F]/70 hover:bg-[#5A9E8F]/14 hover:text-[#7BBDAE]"
              style={{ animationDelay: '40ms' }}
            >
              <svg className="h-4 w-4 transition-transform duration-150 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Team
            </button>
          </div>

          {/* Global metrics */}
          <div
            className="flex items-start gap-14 animate-evolve-in"
            style={{ animationDelay: '60ms' }}
          >
            <StatColumn
              label="Burn Rate"
              value={`$${metrics.totalBurnRate.toFixed(2)}/hr`}
              sub={`$${metrics.totalSpendThisMonth.toFixed(2)} this month`}
            />
            <div className="mt-1 h-10 w-px bg-[#1A2A2D]" />
            <StatColumn
              label="Workforce"
              value={`${metrics.totalActiveAgents} / ${metrics.totalAgents}`}
              sub={`${Math.round((metrics.totalActiveAgents / (metrics.totalAgents || 1)) * 100)}% active`}
            />
            <div className="mt-1 h-10 w-px bg-[#1A2A2D]" />
            <StatColumn
              label="Operations"
              value={`${metrics.totalOperationsRunning}`}
              sub="running now"
            />
            <div className="mt-1 h-10 w-px bg-[#1A2A2D]" />
            <StatColumn
              label="Teams"
              value={`${metrics.activeTeams}`}
              sub="active"
            />
          </div>
        </div>
      </header>

      {/* ── Teams ──────────────────────────────────────────────────────────── */}
      <main className="relative mx-auto max-w-5xl px-14 py-12">
        <div
          className="mb-6 flex items-center gap-3 animate-evolve-in"
          style={{ animationDelay: '120ms' }}
        >
          <h2
            style={{ fontFamily: "'Syne', sans-serif" }}
            className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3A5056]"
          >
            Your Teams
          </h2>
          <div className="flex-1 h-px bg-[#141E22]" />
          <span
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="text-[11px] text-[#2E4248]"
          >
            {teams.length} total
          </span>
        </div>

        {/* Team grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {teams.length === 0 ? (
            <EmptyState onCreate={() => setIsCreateTeamOpen(true)} />
          ) : (
            teams.map((team, i) => (
              <TeamCard
                key={team.id}
                team={team}
                onSelect={() => handleSelectTeam(team.id)}
                onDelete={() => setTeamToDelete(team)}
                index={i}
              />
            ))
          )}
        </div>

        {/* Status footer */}
        <div
          className="mt-16 flex items-center gap-3 animate-evolve-in"
          style={{ animationDelay: `${120 + teams.length * 80 + 80}ms` }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5A9E8F] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5A9E8F]" />
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[12px] text-[#2E4248]">
            All systems operational
          </span>
        </div>
      </main>

      <CreateTeamModal isOpen={isCreateTeamOpen} onClose={() => setIsCreateTeamOpen(false)} onCreated={handleTeamCreated} />
      <DeleteTeamModal isOpen={!!teamToDelete} team={teamToDelete} onClose={() => setTeamToDelete(null)} onConfirm={() => teamToDelete && handleDeleteTeam(teamToDelete)} />
    </div>
  );
}
