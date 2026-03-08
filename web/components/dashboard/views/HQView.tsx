'use client';

import TeamOverview from '../TeamOverview';
import ActiveOperations from '../ActiveOperations';
import { Team } from '@/lib/teams';

interface HQViewProps {
  team: Team;
  onViewOffice: () => void;
  onViewStore: () => void;
}

function StatBlock({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.02em' }}
        className={`text-[1.9rem] font-medium leading-none ${accent ? 'text-[#BF8A52]' : 'text-[#EAE6DF]'}`}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#4A6A72]">
          {sub}
        </span>
      )}
      <span className="text-[11px] uppercase tracking-[0.16em] text-[#4A6A72] font-medium mt-0.5">
        {label}
      </span>
    </div>
  );
}

export default function HQView({ team, onViewOffice, onViewStore }: HQViewProps) {
  return (
    <div
      className="h-full overflow-y-auto scrollbar-hide"
      style={{ background: '#0B1215', fontFamily: "'Syne', sans-serif" }}
    >
      {/* Subtle warm gradient top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background: 'radial-gradient(ellipse 70% 80% at 50% -20%, #18272B 0%, transparent 100%)',
        }}
      />

      {/* ── Team Header ────────────────────────────────────────────────────── */}
      <header className="relative border-b border-[#1A2A2D] px-14 pt-12 pb-10">
        <div className="mx-auto max-w-5xl">

          {/* Team identity */}
          <div className="mb-10 flex items-center gap-5 animate-evolve-in" style={{ animationDelay: '0ms' }}>
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-3xl"
              style={{ backgroundColor: team.color + '1A', border: `1px solid ${team.color}30` }}
            >
              {team.icon}
            </div>
            <div>
              <div className="flex items-baseline gap-3 mb-1">
                <h1
                  style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em', fontWeight: 800 }}
                  className="text-[2.2rem] text-[#EAE6DF] leading-none"
                >
                  {team.name}
                </h1>
                <span
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  className="text-sm text-[#3A5056] mb-1"
                >
                  HQ
                </span>
              </div>
              {team.description && (
                <p className="text-[13px] text-[#4A6A72]">{team.description}</p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div
            className="flex items-start gap-14 animate-evolve-in"
            style={{ animationDelay: '60ms' }}
          >
            <StatBlock
              label="Agents"
              value={`${team.stats.totalAgents}`}
              sub={`${team.stats.activeAgents} active`}
            />
            <div className="mt-1 h-10 w-px bg-[#1A2A2D]" />
            <StatBlock
              label="Ops / week"
              value={`${team.stats.operationsThisWeek}`}
              sub="this week"
            />
            <div className="mt-1 h-10 w-px bg-[#1A2A2D]" />
            <StatBlock
              label="Spend"
              value={`$${team.stats.spendThisMonth.toFixed(0)}`}
              sub="this month"
              accent
            />
            <div className="mt-1 h-10 w-px bg-[#1A2A2D]" />
            <StatBlock
              label="Avg cost"
              value={`$${team.stats.avgOperationCost.toFixed(0)}`}
              sub="per operation"
            />
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="relative mx-auto max-w-5xl px-14 py-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Agents */}
          <div className="animate-evolve-in" style={{ animationDelay: '100ms' }}>
            <SectionLabel label="Office" />
            <TeamOverview
              teamId={team.id.toString()}
              onViewOffice={onViewOffice}
              onViewStore={onViewStore}
            />
          </div>

          {/* Operations */}
          <div className="animate-evolve-in" style={{ animationDelay: '160ms' }}>
            <SectionLabel label="Active Operations" />
            <ActiveOperations teamId={team.id.toString()} />
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2
        style={{ fontFamily: "'Syne', sans-serif" }}
        className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3A5056]"
      >
        {label}
      </h2>
      <div className="flex-1 h-px bg-[#141E22]" />
    </div>
  );
}
