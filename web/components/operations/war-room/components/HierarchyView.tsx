'use client';

import type { HierarchyTeam, HierarchyMetrics } from '../types';

interface HierarchyViewProps {
  hierarchyTeam: HierarchyTeam | null;
  hierarchyMetrics: HierarchyMetrics | null;
  isExecuting: boolean;
}

export function HierarchyView({ hierarchyTeam, hierarchyMetrics, isExecuting }: HierarchyViewProps) {
  if (!hierarchyTeam) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        {isExecuting ? (
          <>
            {/* Teal concentric ring loader */}
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border border-[#5A9E8F]/15" />
              <div className="absolute inset-0 rounded-full border border-[#5A9E8F]/30 border-t-[#5A9E8F] animate-spin" />
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', color: '#4A6A72' }}>Building hierarchy team…</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#2A3E44' }}>Analysing task and auto-generating specialist team</p>
          </>
        ) : (
          <>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-md border text-2xl"
              style={{ background: '#5A9E8F0A', borderColor: '#5A9E8F30', color: '#5A9E8F' }}
            >
              ◈
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', color: '#4A6A72' }}>Hierarchy mode enabled</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#2A3E44' }}>Team will be auto-built when execution starts</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[280px] py-4">

      {/* ── Supervisor node ───────────────────────────────────────────── */}
      <div className="relative">
        {/* Executing pulse ring */}
        {isExecuting && (
          <div className="absolute -inset-3 rounded-md opacity-10 bg-[#5A9E8F] animate-pulse" />
        )}
        <div
          className="relative w-72 rounded-md border px-7 py-5 text-center"
          style={{ background: '#111A1D', borderColor: '#5A9E8F50' }}
        >
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: '#5A9E8F70' }} />

          {/* Supervisor badge */}
          <div
            className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-sm px-3 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap"
            style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F', color: '#080E11', letterSpacing: '0.1em' }}
          >
            Supervisor
          </div>

          {/* Avatar */}
          <div
            className="flex h-14 w-14 items-center justify-center rounded-sm border mx-auto mt-3 mb-3 text-[16px] font-bold"
            style={{ background: '#5A9E8F', color: '#080E11', borderColor: '#5A9E8F', fontFamily: "'Syne', sans-serif" }}
          >
            {hierarchyTeam.supervisor.substring(0, 2).toUpperCase()}
          </div>

          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#EAE6DF' }}>
            {hierarchyTeam.supervisor}
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#5A9E8F' }} className="mt-0.5">
            Orchestrates · Reviews · Approves
          </p>

          {/* Executing dots */}
          {isExecuting && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vertical connector */}
      <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, #5A9E8F50, #5A9E8F15)' }} />

      {/* ── Workers ───────────────────────────────────────────────────── */}
      <div className="relative flex items-start gap-4">
        {/* Horizontal bar connecting worker tops */}
        {hierarchyTeam.workers.length > 1 && (
          <div
            className="absolute top-0 h-px"
            style={{
              background: '#5A9E8F25',
              left: `calc(${100 / (hierarchyTeam.workers.length * 2)}%)`,
              right: `calc(${100 / (hierarchyTeam.workers.length * 2)}%)`,
            }}
          />
        )}
        {hierarchyTeam.workers.map((worker, idx) => (
          <div key={worker} className="flex flex-col items-center">
            <div className="w-px h-8" style={{ background: '#5A9E8F25' }} />
            <div
              className="relative w-40 rounded-md border px-4 py-4 text-center transition-all"
              style={{ background: '#111A1D', borderColor: '#1E2D30' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5A9E8F30'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
            >
              {/* Accent per-worker top bar using step cycle */}
              <div
                className="absolute inset-x-0 top-0 h-[1px] rounded-t-md"
                style={{ background: idx % 2 === 0 ? '#5A9E8F40' : '#7BBDAE30' }}
              />
              <div
                className="flex h-10 w-10 items-center justify-center rounded-sm border mx-auto mb-2 text-[11px] font-bold"
                style={{ background: '#5A9E8F12', borderColor: '#5A9E8F28', color: '#5A9E8F', fontFamily: "'Syne', sans-serif" }}
              >
                {worker.substring(0, 2).toUpperCase()}
              </div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '12px', color: '#D8D4CC' }} className="truncate" title={worker}>
                {worker}
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }} className="mt-0.5">
                Specialist
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Metrics ───────────────────────────────────────────────────── */}
      <div className="mt-10 flex items-center gap-0">
        {[
          { value: hierarchyMetrics?.review_loops ?? 0, label: 'Review Loops', color: '#5A9E8F' },
          { value: hierarchyMetrics?.escalations ?? 0,  label: 'Escalations',  color: '#BF8A52' },
          { value: hierarchyMetrics?.revisions ?? 0,    label: 'Revisions',    color: '#7A8FA0' },
        ].map((metric, i) => (
          <div key={metric.label} className="flex items-center">
            {i > 0 && <div className="mx-8 h-10 w-px" style={{ background: '#1E2D30' }} />}
            <div className="text-center">
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '26px', fontWeight: 700, color: metric.color }}>
                {metric.value}
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }} className="mt-0.5">
                {metric.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Team name */}
      <div
        className="mt-5 rounded border px-4 py-1.5"
        style={{ background: '#5A9E8F08', borderColor: '#5A9E8F25' }}
      >
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5A9E8F' }}>
          {hierarchyTeam.teamName}
        </span>
      </div>
    </div>
  );
}
