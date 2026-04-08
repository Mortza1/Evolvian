'use client';

import { useState, useEffect } from 'react';
import { useTeamAgents, type HiredAgent } from '@/lib/services/agents';
import {
  useEvolutionStats,
  useAgentPerformance,
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

function fitnessHex(val: number): string {
  if (val >= 0.8) return '#5A9E8F';
  if (val >= 0.6) return '#7A9A6A';
  if (val >= 0.4) return '#BF8A52';
  return '#9E5A5A';
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
  const [evolutionExpanded, setEvolutionExpanded] = useState(true);

  const { agents: employees, isLoading, error, refresh: refreshEmployees } = useTeamAgents({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });
  const { taskTypes, statsByType, isLoading: evolutionLoading, refresh: refreshEvolution } = useEvolutionStats({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });
  const { performances, performanceByName } = useAgentPerformance({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });

  // Auto-select first task type so the workflows table is visible by default
  useEffect(() => {
    if (taskTypes.length > 0 && selectedTaskType === null) {
      setSelectedTaskType(taskTypes[0]);
    }
  }, [taskTypes]);

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

        {/* Collapsible header */}
        <div className="mb-0 flex items-center gap-4">
          <button
            onClick={() => setEvolutionExpanded(v => !v)}
            className="flex items-center gap-3 group"
          >
            <h2
              style={{ fontFamily: "'Syne', sans-serif" }}
              className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3A5056] group-hover:text-[#5A9E8F] transition-colors"
            >
              Evolution Insights
            </h2>
            <svg
              className="h-3 w-3 text-[#2A3E44] group-hover:text-[#5A9E8F] transition-all"
              style={{ transform: evolutionExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="flex-1 h-px bg-[#141E22]" />
          {taskTypes.length > 0 && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2A3E44]">
              {taskTypes.length} type{taskTypes.length !== 1 ? 's' : ''} · {Object.values(statsByType).reduce((a, s) => a + s.total_executions, 0)} runs
            </span>
          )}
          <button
            onClick={() => { refreshEvolution(); }}
            className="flex items-center gap-1.5 rounded border border-[#1A2A2D] px-2.5 py-1.5 text-[10px] text-[#2A3E44] transition-all hover:border-[#5A9E8F]/30 hover:text-[#5A9E8F]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Expandable body */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: evolutionExpanded ? '2000px' : '0px',
            opacity: evolutionExpanded ? 1 : 0,
            transition: 'max-height 0.35s ease, opacity 0.25s ease',
            marginTop: evolutionExpanded ? '24px' : '0px',
          }}
        >
          {evolutionLoading ? (
            <div className="rounded-md border border-[#1E2D30] bg-[#111A1D] p-6 animate-pulse">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded bg-[#1A2A2D]" />)}
              </div>
            </div>
          ) : taskTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#1A2A2D] py-10 text-center">
              <svg className="mb-3 h-5 w-5 text-[#1E2D30]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-[11px] text-[#2E4248]">No workflow data yet — run some operations to see evolution insights</p>
            </div>
          ) : (
            <div className="space-y-3">

              {/* Task type selector cards */}
              <div className={`grid gap-3 ${taskTypes.length === 1 ? 'grid-cols-1' : taskTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {taskTypes.map((type) => {
                  const stats = statsByType[type];
                  const isSelected = selectedTaskType === type;
                  const q = stats?.avg_quality ?? 0;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedTaskType(isSelected ? null : type)}
                      className="group relative overflow-hidden rounded-md border text-left transition-all duration-200"
                      style={{
                        borderColor: isSelected ? 'rgba(90,158,143,0.5)' : '#1E2D30',
                        background: isSelected ? 'rgba(90,158,143,0.06)' : '#0D1619',
                      }}
                    >
                      {/* Left accent bar */}
                      <div
                        className="absolute left-0 top-0 h-full w-[3px] transition-all duration-200"
                        style={{ backgroundColor: isSelected ? fitnessHex(q) : '#172025' }}
                      />
                      <div className="pl-4 pr-4 py-4">
                        <div className="mb-3 flex items-start justify-between">
                          <span
                            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
                            className="text-[13px] text-[#C8C4BC] group-hover:text-[#EAE6DF] transition-colors"
                          >
                            {formatTaskType(type)}
                          </span>
                          <span
                            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#3A5056' }}
                            className="rounded border border-[#172025] bg-[#0A1214] px-1.5 py-0.5 uppercase tracking-[0.1em]"
                          >
                            {stats?.total_executions ?? 0} runs
                          </span>
                        </div>
                        {/* Big quality number */}
                        <div className="flex items-end gap-2">
                          <span
                            style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.03em', color: fitnessHex(q), lineHeight: 1 }}
                            className="text-[2.2rem] font-semibold"
                          >
                            {Math.round(q * 100)}
                          </span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1 text-[13px] text-[#2A3E44]">%</span>
                          <span className="mb-1 ml-auto text-[10px] text-[#2A3E44]">avg quality</span>
                        </div>
                        {/* Quality bar */}
                        <div className="mt-2 h-[2px] overflow-hidden rounded-full bg-[#172025]">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.round(q * 100)}%`, backgroundColor: fitnessHex(q) }}
                          />
                        </div>
                        {/* Sub-stats */}
                        <div className="mt-3 flex items-center gap-4">
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2A3E44]">
                            {stats?.unique_workflows ?? 0} config{(stats?.unique_workflows ?? 0) !== 1 ? 's' : ''}
                          </span>
                          {(stats?.avg_latency_ms ?? 0) > 0 && (
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2A3E44]">
                              {((stats?.avg_latency_ms ?? 0) / 1000).toFixed(1)}s avg
                            </span>
                          )}
                          {isSelected && (
                            <span className="ml-auto text-[9px] uppercase tracking-[0.12em] text-[#5A9E8F]">expanded ↑</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Expanded detail panel */}
              {selectedTaskType && statsByType[selectedTaskType] && (() => {
                const stats = statsByType[selectedTaskType];
                const workflows = stats.top_workflows ?? [];
                return (
                  <div className="overflow-hidden rounded-md border border-[#1E2D30] bg-[#0D1619]">

                    {/* Metric strip */}
                    <div className="grid grid-cols-4 divide-x divide-[#172025] border-b border-[#172025]">
                      {[
                        { label: 'Avg Quality',  value: `${Math.round(stats.avg_quality * 100)}%`,  color: fitnessHex(stats.avg_quality) },
                        { label: 'Avg Cost',     value: `$${stats.avg_cost.toFixed(4)}`,            color: '#BF8A52' },
                        { label: 'Avg Latency',  value: stats.avg_latency_ms > 0 ? `${(stats.avg_latency_ms / 1000).toFixed(1)}s` : '—', color: '#7A9EA6' },
                        { label: 'Unique Configs', value: String(stats.unique_workflows),           color: '#EAE6DF' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="px-5 py-4">
                          <div
                            style={{ fontFamily: "'IBM Plex Mono', monospace", color, letterSpacing: '-0.02em' }}
                            className="mb-1 text-[1.4rem] font-semibold leading-none"
                          >
                            {value}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-[#2A3E44]">{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Workflow configs */}
                    {workflows.length > 0 && (
                      <div className="border-b border-[#172025] px-5 py-4">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2A3E44]">
                          Workflow Configs — ranked by fitness
                        </p>
                        <div className="space-y-2.5">
                          {workflows.map((wf, idx) => (
                            <div key={wf.signature} className="group flex items-center gap-4 rounded-md border border-transparent px-3 py-2.5 transition-all hover:border-[#1E2D30] hover:bg-[#111A1D]">
                              {/* Rank + star */}
                              <div
                                style={{ fontFamily: "'IBM Plex Mono', monospace", color: idx === 0 ? '#BF8A52' : '#2A3E44', minWidth: 20 }}
                                className="text-[11px] font-medium"
                              >
                                {idx === 0 ? '★' : `${idx + 1}`}
                              </div>
                              {/* Signature */}
                              <code style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#5A9E8F', minWidth: 80 }} className="text-[11px]">
                                {wf.signature.substring(0, 8)}…
                              </code>
                              {/* Agents */}
                              <div className="flex flex-1 flex-wrap gap-1">
                                {wf.agents.slice(0, 4).map((a) => (
                                  <span
                                    key={a}
                                    className="rounded border border-[#1A2A2D] bg-[#0A1214] px-1.5 py-0.5 text-[9px] text-[#4A6A72]"
                                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                  >
                                    {a}
                                  </span>
                                ))}
                                {wf.agents.length > 4 && (
                                  <span className="text-[9px] text-[#2A3E44]">+{wf.agents.length - 4}</span>
                                )}
                              </div>
                              {/* Quality bar + value */}
                              <div className="flex items-center gap-2" style={{ minWidth: 100 }}>
                                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#172025]">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.round(wf.avg_quality_score * 100)}%`, backgroundColor: fitnessHex(wf.avg_quality_score) }}
                                  />
                                </div>
                                <span
                                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: fitnessHex(wf.avg_quality_score), minWidth: 32, textAlign: 'right' }}
                                  className="text-[11px] font-medium"
                                >
                                  {Math.round(wf.avg_quality_score * 100)}%
                                </span>
                              </div>
                              {/* Fitness */}
                              <div style={{ minWidth: 56, textAlign: 'right' }}>
                                <span
                                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: fitnessHex(wf.fitness_score) }}
                                  className="text-[11px] font-semibold"
                                >
                                  {Math.round(wf.fitness_score * 100)}
                                </span>
                                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[9px] text-[#2A3E44]"> fit</span>
                              </div>
                              {/* Runs */}
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", minWidth: 36, textAlign: 'right' }} className="text-[10px] text-[#2A3E44]">
                                ×{wf.execution_count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agent leaderboard */}
                    {performances.length > 0 && (
                      <div className="px-5 py-4">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2A3E44]">Agent Performance</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {performances.slice(0, 6).map((p, idx) => (
                            <div key={p.agent_name} className="flex items-center gap-3 rounded-md border border-[#172025] bg-[#0A1214] px-3 py-2.5">
                              <span
                                style={{ fontFamily: "'IBM Plex Mono', monospace", color: idx === 0 ? '#BF8A52' : '#1E2D30', minWidth: 16 }}
                                className="text-[10px] font-semibold"
                              >
                                {idx === 0 ? '★' : `#${idx + 1}`}
                              </span>
                              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="flex-1 truncate text-[12px] text-[#C8C4BC]">
                                {p.agent_name}
                              </span>
                              {/* Bar */}
                              <div className="flex items-center gap-2">
                                <div className="h-[3px] w-16 overflow-hidden rounded-full bg-[#172025]">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${Math.round(p.avg_quality * 100)}%`, backgroundColor: fitnessHex(p.avg_quality) }}
                                  />
                                </div>
                                <span
                                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: fitnessHex(p.avg_quality), minWidth: 28, textAlign: 'right' }}
                                  className="text-[10px] font-semibold"
                                >
                                  {Math.round(p.avg_quality * 100)}%
                                </span>
                                <TrendIcon trend={p.trend} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
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
