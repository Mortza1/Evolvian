'use client';

import { useState, useEffect } from 'react';
import { getInstalledTools, InstalledTool, getCategoryColor, uninstallTool } from '@/lib/tools';
import { getAgents } from '@/lib/agents';
import { Dialog } from '@/components/ui/Dialog';

export default function MyToolbox() {
  const [tools, setTools] = useState<InstalledTool[]>([]);
  const [confirmUninstall, setConfirmUninstall] = useState<{ id: string; name: string } | null>(null);
  const agents = getAgents();

  useEffect(() => {
    setTools(getInstalledTools());
  }, []);

  const handleUninstall = () => {
    if (!confirmUninstall) return;
    uninstallTool(confirmUninstall.id);
    setTools(getInstalledTools());
    setConfirmUninstall(null);
  };

  const STATUS_STYLE: Record<string, { color: string; border: string; bg: string }> = {
    connected:    { color: '#5A9E8F', border: '#5A9E8F30', bg: '#5A9E8F10' },
    disconnected: { color: '#3A5056', border: '#1E2D30',   bg: 'transparent' },
    error:        { color: '#9E5A5A', border: '#9E5A5A30', bg: '#9E5A5A10' },
  };

  if (tools.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-24">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border" style={{ background: '#111A1D', borderColor: '#1E2D30' }}>
          <svg className="h-5 w-5 text-[#2A3E44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[14px] text-[#3A5056]">No tools installed yet</p>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#2A3E44]">Browse the Marketplace to equip your workforce</p>
      </div>
    );
  }

  return (
    <div className="px-8 py-6" style={{ fontFamily: "'Syne', sans-serif" }}>
      <div className="space-y-3">
        {tools.map((installedTool, i) => {
          const tool = installedTool.tool;
          const catColor = getCategoryColor(tool.category);
          const statusStyle = STATUS_STYLE[installedTool.status] ?? STATUS_STYLE.disconnected;
          const assignedAgentsList = agents.filter((a) => installedTool.assignedAgents.includes(a.id));

          return (
            <div
              key={installedTool.toolId}
              className="animate-evolve-in relative rounded-md border"
              style={{ background: '#111A1D', borderColor: '#1E2D30', animationDelay: `${i * 50}ms` }}
            >
              {/* Category top bar */}
              <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: `${catColor}60` }} />

              <div className="flex items-start gap-5 p-5 pt-6">
                {/* Icon */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border text-[20px]"
                  style={{ background: `${catColor}12`, borderColor: `${catColor}30` }}
                >
                  {tool.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
                        className="truncate text-[15px] text-[#EAE6DF]"
                      >
                        {tool.name}
                      </h3>
                      <p className="mt-0.5 text-[12px] text-[#4A6A72]">{tool.description}</p>
                    </div>
                    <span
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: statusStyle.color, borderColor: statusStyle.border, background: statusStyle.bg }}
                      className="shrink-0 rounded border px-2 py-0.5 text-[10px] uppercase"
                    >
                      {installedTool.status}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="mb-4 grid grid-cols-4 gap-2">
                    {[
                      { label: 'Total Uses', value: installedTool.usage.totalCalls.toLocaleString(), color: '#B8B2AA' },
                      { label: 'Total Cost',  value: `$${installedTool.usage.totalCost.toFixed(2)}`, color: '#BF8A52' },
                      { label: 'Access',      value: installedTool.usagePolicy.permissions, color: '#B8B2AA' },
                      { label: 'Assigned To', value: `${installedTool.assignedAgents.length} agents`, color: '#B8B2AA' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-md border p-3" style={{ background: '#0B1215', borderColor: '#162025' }}>
                        <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1 text-[9px] uppercase tracking-widest text-[#2E4248]">
                          {label}
                        </p>
                        <p style={{ fontFamily: "'IBM Plex Mono', monospace", color }} className="text-[14px] font-semibold">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Assigned agents */}
                  {assignedAgentsList.length > 0 && (
                    <div className="mb-4">
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-2 text-[10px] uppercase tracking-widest text-[#2E4248]">
                        Equipped Agents
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedAgentsList.map((agent) => (
                          <div
                            key={agent.id}
                            className="flex items-center gap-2 rounded border px-2.5 py-1.5"
                            style={{ background: '#0B1215', borderColor: '#1E2D30' }}
                          >
                            <img src={agent.photo_url} alt={agent.name} className="h-5 w-5 rounded-sm object-cover" />
                            <span style={{ fontFamily: "'Syne', sans-serif" }} className="text-[12px] text-[#B8B2AA]">
                              {agent.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded border px-3 py-1.5 text-[11px] transition-all"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F40', color: '#5A9E8F' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F20'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; }}
                    >
                      Configure
                    </button>
                    <button
                      className="rounded border px-3 py-1.5 text-[11px] transition-all"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
                    >
                      View Usage
                    </button>
                    <button
                      onClick={() => setConfirmUninstall({ id: installedTool.toolId, name: tool.name })}
                      className="ml-auto rounded border px-3 py-1.5 text-[11px] transition-all"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#9E5A5A30', color: '#7A4A4A', background: 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#9E5A5A'; e.currentTarget.style.borderColor = '#9E5A5A50'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#7A4A4A'; e.currentTarget.style.borderColor = '#9E5A5A30'; }}
                    >
                      Uninstall
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!confirmUninstall}
        title={`Uninstall ${confirmUninstall?.name ?? 'tool'}?`}
        description="This tool will be removed from your workspace. Any agents using it will lose access immediately."
        variant="destructive"
        confirmLabel="Uninstall"
        onConfirm={handleUninstall}
        onCancel={() => setConfirmUninstall(null)}
      />
    </div>
  );
}
