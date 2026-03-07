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
      <div className="flex flex-col items-center gap-4 py-16">
        {isExecuting ? (
          <>
            <div className="relative">
              <div className="w-16 h-16 border-2 border-purple-500/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-slate-400 text-sm">Building hierarchy team...</div>
            <div className="text-xs text-slate-600">Analysing task and auto-generating specialist team</div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center justify-center">
              <span className="text-2xl text-purple-400">◈</span>
            </div>
            <div className="text-slate-400 text-sm">Hierarchy mode enabled</div>
            <div className="text-xs text-slate-600">Team will be auto-built when execution starts</div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[280px] py-4">
      {/* Supervisor */}
      <div className="relative">
        {isExecuting && <div className="absolute -inset-3 rounded-xl blur-xl opacity-20 bg-purple-500 animate-pulse" />}
        <div className="relative px-8 py-5 bg-[#0A0A0F] border-2 border-purple-500/60 rounded-xl w-72 text-center shadow-lg shadow-purple-500/10">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] rounded-full text-[10px] text-white font-bold uppercase tracking-widest whitespace-nowrap">
            Supervisor
          </div>
          <div className="w-14 h-14 bg-gradient-to-br from-[#7C3AED] to-[#6366F1] rounded-full flex items-center justify-center mx-auto mt-2 mb-3 ring-2 ring-purple-500/30">
            <span className="text-white font-bold text-xl">{hierarchyTeam.supervisor.substring(0, 2).toUpperCase()}</span>
          </div>
          <div className="text-white font-semibold text-sm">{hierarchyTeam.supervisor}</div>
          <div className="text-xs text-purple-300 mt-0.5">Orchestrates · Reviews · Approves</div>
          {isExecuting && (
            <div className="mt-2.5 flex items-center justify-center gap-1">
              {[0, 150, 300].map(delay => (
                <div key={delay} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-px h-6 bg-gradient-to-b from-purple-500/60 to-purple-500/20" />

      {/* Workers */}
      <div className="relative flex items-start gap-3">
        {hierarchyTeam.workers.length > 1 && (
          <div
            className="absolute top-0 h-px bg-purple-500/30"
            style={{
              left: `calc(${100 / (hierarchyTeam.workers.length * 2)}%)`,
              right: `calc(${100 / (hierarchyTeam.workers.length * 2)}%)`,
            }}
          />
        )}
        {hierarchyTeam.workers.map(worker => (
          <div key={worker} className="flex flex-col items-center">
            <div className="w-px h-6 bg-purple-500/30" />
            <div className="px-4 py-4 bg-[#0A0A0F] border border-indigo-500/40 hover:border-indigo-400/60 rounded-xl w-44 text-center transition-colors">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-indigo-300 font-semibold text-sm">{worker.substring(0, 2).toUpperCase()}</span>
              </div>
              <div className="text-white text-xs font-semibold truncate" title={worker}>{worker}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Specialist</div>
            </div>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="mt-8 flex items-center gap-8">
        {[
          { value: hierarchyMetrics?.review_loops ?? 0, label: 'Review Loops', color: 'text-purple-400' },
          { value: hierarchyMetrics?.escalations ?? 0, label: 'Escalations', color: 'text-amber-400' },
          { value: hierarchyMetrics?.revisions ?? 0, label: 'Revisions', color: 'text-blue-400' },
        ].map((metric, i) => (
          <div key={metric.label} className="flex items-center gap-8">
            {i > 0 && <div className="w-px h-10 bg-slate-800" />}
            <div className="text-center">
              <div className={`text-2xl font-bold tabular-nums ${metric.color}`}>{metric.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 px-4 py-1.5 bg-purple-900/20 border border-purple-500/20 rounded-full">
        <span className="text-xs text-purple-300 font-medium">{hierarchyTeam.teamName}</span>
      </div>
    </div>
  );
}
