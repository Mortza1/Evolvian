'use client';

import { useState } from 'react';
import { useTeamAgents, type HiredAgent } from '@/lib/services/agents';
import {
  useEvolutionStats,
  useAgentPerformance,
  formatFitness,
  getFitnessColor,
  formatTaskType,
} from '@/lib/services/evolution';
import AgentEvolutionModal from '@/components/office/AgentEvolutionModal';

interface OfficeViewProps {
  teamId: string;
}

// ─── Trend icon ───────────────────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return (
    <span className="text-[#5A9E8F]">↑</span>
  );
  if (trend === 'declining') return (
    <span className="text-[#9E5A5A]">↓</span>
  );
  return <span className="text-[#3A5056]">→</span>;
}

// ─── Fitness color (override to match palette) ─────────────────────────────
function fitnessClass(val: number): string {
  if (val >= 0.8) return 'text-[#5A9E8F]';
  if (val >= 0.6) return 'text-[#7A9A6A]';
  if (val >= 0.4) return 'text-[#BF8A52]';
  return 'text-[#9E5A5A]';
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <h2
        style={{ fontFamily: "'Syne', sans-serif" }}
        className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3A5056]"
      >
        {label}
      </h2>
      <div className="flex-1 h-px bg-[#141E22]" />
      {action}
    </div>
  );
}

// ─── Stat block ───────────────────────────────────────────────────────────────
function StatBlock({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-[#1E2D30] bg-[#111A1D] px-5 py-4">
      <span
        style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.02em', color: accent || '#EAE6DF' }}
        className="text-[1.6rem] font-medium leading-none"
      >
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-[0.14em] text-[#4A6A72]">{label}</span>
    </div>
  );
}

// ─── Agent card ───────────────────────────────────────────────────────────────
function AgentCard({
  employee,
  perf,
  isMvp,
  onEvolve,
  index,
}: {
  employee: HiredAgent;
  perf?: any;
  isMvp: boolean;
  onEvolve: () => void;
  index: number;
}) {
  return (
    <div
      className="group relative flex flex-col rounded-md border border-[#1E2D30] bg-[#111A1D] p-6 transition-all duration-150 hover:border-[#5A9E8F]/30 hover:bg-[#141E22] animate-evolve-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top: avatar row */}
      <div className="mb-5 flex items-start justify-between">
        <div className="relative">
          {employee.photo_url ? (
            <img
              src={employee.photo_url}
              alt={employee.name}
              className="h-14 w-14 rounded-md object-cover border border-[#1E2D30]"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-md border border-[#1E2D30] text-[17px] font-bold text-[#7BBDAE]"
              style={{ background: '#1A2E2B' }}
            >
              {employee.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          {/* Level badge */}
          <div
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#111A1D] text-[9px] font-bold"
            style={{ background: '#BF8A52', color: '#07090A', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {employee.level || 1}
          </div>
        </div>

        {/* Online + MVP */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${employee.is_online ? 'bg-[#5A9E8F]' : 'bg-[#2A3E44]'}`}
            />
            <span
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              className={`text-[10px] ${employee.is_online ? 'text-[#5A9E8F]' : 'text-[#2A3E44]'}`}
            >
              {employee.is_online ? 'online' : 'offline'}
            </span>
          </div>
          {isMvp && (
            <span
              className="rounded border border-[#BF8A52]/40 bg-[#BF8A52]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#BF8A52]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              MVP
            </span>
          )}
        </div>
      </div>

      {/* Name + role */}
      <h3
        style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' }}
        className="mb-0.5 text-[16px] text-[#D8D4CC] group-hover:text-[#EAE6DF] transition-colors"
      >
        {employee.name}
      </h3>
      <p className="mb-5 text-[12px] text-[#3A5056]">{employee.role}</p>

      {/* Level progress */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#2E4248]">Level progress</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#5A9E8F]">
            {Math.round(employee.levelProgress || 0)}%
          </span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-[#172025]">
          <div
            className="h-full rounded-full bg-[#5A9E8F] transition-all duration-700"
            style={{ width: `${employee.levelProgress || 0}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { value: String(employee.tasks_completed), label: 'Tasks' },
          { value: employee.rating.toFixed(1),       label: 'Rating', color: ratingColor(employee.rating) },
          { value: `${Math.round(employee.accuracy)}%`, label: 'Success', color: '#5A9E8F' },
        ].map(({ value, label, color }) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-md border border-[#172025] bg-[#0F1719] py-3 gap-1"
          >
            <span
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: color || '#C8C4BC' }}
              className="text-[15px] font-semibold leading-none"
            >
              {value}
            </span>
            <span className="text-[9px] uppercase tracking-[0.12em] text-[#2E4248]">{label}</span>
          </div>
        ))}
      </div>

      {/* Performance trend */}
      {perf && perf.total_executions > 0 && (
        <div className="mb-4 flex items-center gap-2 text-[11px]">
          <TrendIcon trend={perf.trend} />
          <span className="text-[#3A5056] capitalize">{perf.trend}</span>
          <span className="text-[#1E2D30]">·</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[#3A5056]">
            {Math.round(perf.avg_quality * 100)}% quality
          </span>
          {perf.rated_count > 0 && (
            <>
              <span className="text-[#1E2D30]">·</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[#BF8A52]">
                {perf.user_avg_rating.toFixed(1)} avg
              </span>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onEvolve(); }}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[#5A9E8F]/40 bg-[#5A9E8F]/8 px-4 py-2.5 text-[12px] font-medium text-[#5A9E8F] transition-all hover:border-[#5A9E8F]/70 hover:bg-[#5A9E8F]/14 hover:text-[#7BBDAE]"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Evolve
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#1E2D30] text-[#2A3E44] transition-all hover:border-[#2A3E44] hover:text-[#4A6A72]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Hourly rate footer */}
      <div className="mt-4 flex items-center justify-between border-t border-[#172025] pt-4">
        <span className="text-[11px] text-[#2E4248]">Hourly rate</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[13px] font-medium text-[#BF8A52]">
          ${employee.cost_per_hour.toFixed(2)}/hr
        </span>
      </div>
    </div>
  );
}

function ratingColor(r: number) {
  if (r >= 4.0) return '#5A9E8F';
  if (r >= 3.0) return '#BF8A52';
  return '#9E5A5A';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OfficeView({ teamId }: OfficeViewProps) {
  const [evolvingAgent, setEvolvingAgent] = useState<HiredAgent | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);

  const { agents: employees, isLoading, error, refresh: refreshEmployees } = useTeamAgents({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });
  const { taskTypes, statsByType, isLoading: evolutionLoading, refresh: refreshEvolution } = useEvolutionStats({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });
  const { performanceByName } = useAgentPerformance({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });

  // Determine MVP (highest avg quality among agents with executions)
  const mvpName = (() => {
    const sorted = Object.entries(performanceByName)
      .filter(([, p]) => p.total_executions > 0)
      .sort(([, a], [, b]) => b.avg_quality - a.avg_quality);
    return sorted[0]?.[0];
  })();

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-8" style={{ fontFamily: "'Syne', sans-serif" }}>
        <div className="h-8 w-48 rounded-md bg-[#111A1D] animate-pulse" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-md border border-[#1E2D30] bg-[#111A1D] p-6 animate-pulse space-y-4">
              <div className="flex items-start justify-between">
                <div className="h-14 w-14 rounded-md bg-[#1A2A2D]" />
                <div className="h-4 w-16 rounded bg-[#1A2A2D]" />
              </div>
              <div className="h-5 w-32 rounded bg-[#1A2A2D]" />
              <div className="h-3 w-24 rounded bg-[#1A2A2D]" />
              <div className="h-[3px] w-full rounded-full bg-[#1A2A2D]" />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((j) => <div key={j} className="h-14 rounded-md bg-[#1A2A2D]" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center" style={{ fontFamily: "'Syne', sans-serif" }}>
        <p className="mb-5 text-[13px] text-[#9E5A5A]">{error}</p>
        <button
          onClick={() => refreshEmployees()}
          className="rounded-md border border-[#5A9E8F]/40 bg-[#5A9E8F]/8 px-5 py-2.5 text-[13px] text-[#5A9E8F] transition-all hover:border-[#5A9E8F]/70"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Empty ──
  if (employees.length === 0) {
    return (
      <div style={{ fontFamily: "'Syne', sans-serif" }}>
        <header className="mb-8 animate-evolve-in">
          <h1
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}
            className="mb-2 text-[2rem] leading-none text-[#EAE6DF]"
          >
            The Office
          </h1>
          <p className="text-[13px] text-[#4A6A72]">Manage and evolve your AI workforce</p>
        </header>
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#1E2D30] py-24 text-center animate-evolve-in" style={{ animationDelay: '60ms' }}>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-md border border-[#1E2D30] bg-[#111A1D]">
            <svg className="h-6 w-6 text-[#3A5056]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="mb-2 text-[16px] text-[#4A6A72]">
            Your office is empty
          </h3>
          <p className="max-w-sm text-[13px] leading-relaxed text-[#2E4248]">
            Head to the Agent Store to hire your first team members and start running operations.
          </p>
        </div>
      </div>
    );
  }

  const activeTypes = selectedTaskType ? [selectedTaskType] : taskTypes;

  return (
    <div style={{ fontFamily: "'Syne', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-10 animate-evolve-in" style={{ animationDelay: '0ms' }}>
        <h1
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}
          className="mb-2 text-[2rem] leading-none text-[#EAE6DF]"
        >
          The Office
        </h1>
        <p className="text-[13px] text-[#4A6A72]">Manage and evolve your AI workforce</p>
      </header>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div
        className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4 animate-evolve-in"
        style={{ animationDelay: '60ms' }}
      >
        <StatBlock value={String(employees.length)} label="Employees" />
        <StatBlock
          value={String(employees.filter(e => e.is_online).length)}
          label="Online now"
          accent="#5A9E8F"
        />
        <StatBlock
          value={`$${employees.reduce((a, e) => a + e.cost_per_hour, 0).toFixed(2)}/hr`}
          label="Hourly cost"
          accent="#BF8A52"
        />
        <StatBlock
          value={String(employees.reduce((a, e) => a + (e.skills?.length || 0), 0))}
          label="Skills learned"
        />
      </div>

      {/* ── Evolution Insights ─────────────────────────────────────────────── */}
      <section className="mb-10 animate-evolve-in" style={{ animationDelay: '100ms' }}>
        <SectionLabel
          label="Evolution Insights"
          action={
            <button
              onClick={() => refreshEvolution()}
              className="flex items-center gap-1.5 rounded border border-[#1E2D30] px-3 py-1.5 text-[11px] text-[#3A5056] transition-all hover:border-[#5A9E8F]/30 hover:text-[#5A9E8F]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          }
        />

        {evolutionLoading ? (
          <div className="rounded-md border border-[#1E2D30] bg-[#111A1D] p-6 animate-pulse">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded bg-[#1A2A2D]" />)}
            </div>
          </div>
        ) : taskTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#1E2D30] py-12 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-[#1E2D30] bg-[#111A1D]">
              <svg className="h-4 w-4 text-[#2A3E44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-[12px] text-[#2E4248]">No workflow data yet — run some operations to see evolution insights</p>
          </div>
        ) : (
          <div className="rounded-md border border-[#1E2D30] bg-[#111A1D] overflow-hidden">
            {/* Type filter tabs */}
            <div className="flex items-center gap-1 border-b border-[#172025] px-4 py-3 overflow-x-auto scrollbar-hide">
              {[{ id: null, label: 'All Types' }, ...taskTypes.map(t => ({ id: t, label: formatTaskType(t) }))].map(({ id, label }) => (
                <button
                  key={String(id)}
                  onClick={() => setSelectedTaskType(id)}
                  className={`shrink-0 rounded px-3 py-1.5 text-[11px] font-medium transition-all ${
                    selectedTaskType === id
                      ? 'bg-[#5A9E8F]/15 text-[#5A9E8F] border border-[#5A9E8F]/40'
                      : 'text-[#3A5056] hover:text-[#7A9EA6] border border-transparent hover:border-[#1E2D30]'
                  }`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 gap-px bg-[#172025] md:grid-cols-3 p-px">
              {activeTypes.map((type) => {
                const stats = statsByType[type];
                if (!stats) return null;
                return (
                  <div key={type} className="bg-[#111A1D] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                        className="text-[13px] text-[#C8C4BC]"
                      >
                        {formatTaskType(type)}
                      </span>
                      <span
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        className="rounded border border-[#1E2D30] bg-[#0F1719] px-2 py-0.5 text-[10px] text-[#3A5056]"
                      >
                        {stats.total_executions} runs
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Avg Quality', value: formatFitness(stats.avg_quality), color: fitnessClass(stats.avg_quality) },
                        { label: 'Avg Cost',    value: `$${stats.avg_cost.toFixed(2)}`,  color: 'text-[#BF8A52]' },
                        { label: 'Workflows',  value: String(stats.unique_workflows),     color: 'text-[#EAE6DF]' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-[12px] text-[#3A5056]">{label}</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className={`text-[12px] font-medium ${color}`}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                    {stats.best_workflow && (
                      <div className="mt-4 border-t border-[#172025] pt-4">
                        <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[#2E4248]">Best workflow</p>
                        <div className="flex items-center justify-between">
                          <code
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            className="text-[11px] text-[#5A9E8F]"
                          >
                            {stats.best_workflow.signature.substring(0, 8)}…
                          </code>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className={`text-[11px] font-medium ${fitnessClass(stats.best_workflow.fitness_score)}`}>
                            {formatFitness(stats.best_workflow.fitness_score)} fit
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-[#2A3E44]">
                          {stats.best_workflow.agents.length} agents · {stats.best_workflow.execution_count} runs
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Top workflows table */}
            {selectedTaskType && statsByType[selectedTaskType]?.top_workflows?.length > 0 && (
              <div className="border-t border-[#172025] p-5">
                <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#3A5056]">
                  Top performing workflows
                </p>
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#172025]">
                        {['Signature', 'Agents', 'Quality', 'Cost', 'Fitness', 'Runs'].map((h, i) => (
                          <th
                            key={h}
                            className={`pb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2E4248] ${i > 1 ? 'text-right' : 'text-left'}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#172025]">
                      {statsByType[selectedTaskType].top_workflows.map((wf, idx) => (
                        <tr key={wf.signature} className="hover:bg-[#0F1719] transition-colors">
                          <td className="py-3">
                            <code style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#5A9E8F]">
                              {idx === 0 ? '★ ' : ''}{wf.signature.substring(0, 8)}…
                            </code>
                          </td>
                          <td className="py-3 text-[12px] text-[#7A9EA6]">
                            {wf.agents.slice(0, 2).join(', ')}{wf.agents.length > 2 ? ` +${wf.agents.length - 2}` : ''}
                          </td>
                          <td className={`py-3 text-right text-[12px] font-medium ${fitnessClass(wf.avg_quality_score)}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            {formatFitness(wf.avg_quality_score)}
                          </td>
                          <td className="py-3 text-right text-[12px] text-[#BF8A52]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            ${wf.avg_cost.toFixed(2)}
                          </td>
                          <td className={`py-3 text-right text-[12px] font-semibold ${fitnessClass(wf.fitness_score)}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            {formatFitness(wf.fitness_score)}
                          </td>
                          <td className="py-3 text-right text-[12px] text-[#3A5056]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            {wf.execution_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Agent roster ────────────────────────────────────────────────────── */}
      <section className="animate-evolve-in" style={{ animationDelay: '140ms' }}>
        <SectionLabel label="Roster" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee, i) => (
            <AgentCard
              key={employee.id}
              employee={employee}
              perf={performanceByName[employee.name]}
              isMvp={employee.name === mvpName}
              onEvolve={() => setEvolvingAgent(employee)}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* Evolution modal */}
      {evolvingAgent && (
        <AgentEvolutionModal
          agent={evolvingAgent}
          teamId={teamId}
          isOpen={!!evolvingAgent}
          onClose={() => setEvolvingAgent(null)}
          onSuccess={() => { refreshEmployees(); setEvolvingAgent(null); }}
        />
      )}
    </div>
  );
}
