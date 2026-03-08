'use client';

import { useState, useEffect } from 'react';
import { Tool, InstalledTool, saveInstalledTool, getCategoryColor, getInstalledTools } from '@/lib/tools';
import { useTeamAgents } from '@/lib/services/agents';
import { getActiveTeam } from '@/lib/teams';

interface ToolInstallModalProps {
  tool: Tool;
  isOpen: boolean;
  onClose: () => void;
}

export default function ToolInstallModal({ tool, isOpen, onClose }: ToolInstallModalProps) {
  const [step, setStep] = useState<'overview' | 'config' | 'assign'>('overview');
  const [configuration, setConfiguration] = useState<Record<string, string>>({});
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<'read' | 'write' | 'full'>('read');
  const [requireApproval, setRequireApproval] = useState(false);
  const [dailyBudget, setDailyBudget] = useState<string>('');

  const activeTeam = getActiveTeam();
  const teamId = activeTeam?.id ?? 0;
  const { agents } = useTeamAgents({ teamId, autoFetch: isOpen });
  const installedTools = getInstalledTools();
  const isInstalled = installedTools.some((t) => t.toolId === tool.id);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep('overview');
      setConfiguration({});
      setSelectedAgents([]);
      setPermissions('read');
      setRequireApproval(false);
      setDailyBudget('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfigChange = (field: string, value: string) => {
    setConfiguration((prev) => ({ ...prev, [field]: value }));
  };

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleInstall = () => {
    const installedTool: InstalledTool = {
      toolId: tool.id,
      tool: tool,
      installedAt: new Date(),
      configuration,
      status: tool.requiresConfig ? 'disconnected' : 'connected',
      assignedAgents: selectedAgents,
      usagePolicy: {
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
        requireApproval,
        permissions,
      },
      usage: {
        totalCalls: 0,
        totalCost: 0,
      },
    };

    saveInstalledTool(installedTool);
    onClose();
  };

  const canProceed = () => {
    if (step === 'config' && tool.requiresConfig) {
      return tool.configFields?.every((field) => {
        if (!field.required) return true;
        return configuration[field.name] && configuration[field.name].trim() !== '';
      });
    }
    return true;
  };

  const catColor = getCategoryColor(tool.category);
  const STEPS = ['overview', 'config', 'assign'] as const;
  const stepIdx = STEPS.indexOf(step);

  const inputCls = "w-full rounded-md border bg-[#111A1D] px-3 py-2.5 text-[12px] text-[#D8D4CC] placeholder-[#2E4248] outline-none transition-all";
  const inputStyle = { borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = '#5A9E8F50'; };
  const inputBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = '#1E2D30'; };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,9,10,0.88)' }}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border shadow-2xl"
        style={{ background: '#0B1215', borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
      >
        {/* Modal header */}
        <div className="shrink-0 border-b px-6 py-5" style={{ borderColor: '#162025', background: '#080E11' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-[20px]"
                style={{ background: `${catColor}12`, borderColor: `${catColor}30` }}
              >
                {tool.icon}
              </div>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }} className="text-[16px] text-[#EAE6DF]">
                  {tool.name}
                </h2>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2E4248]">
                  by {tool.developer}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded border p-1.5 transition-all"
              style={{ borderColor: '#1E2D30', color: '#2E4248' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#9E5A5A'; e.currentTarget.style.borderColor = '#9E5A5A30'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#2E4248'; e.currentTarget.style.borderColor = '#1E2D30'; }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step progress */}
          <div className="mt-5 flex items-center gap-1.5">
            {STEPS.map((s, idx) => (
              <div
                key={s}
                className="h-[2px] flex-1 rounded-full transition-all"
                style={{ background: idx <= stepIdx ? '#5A9E8F' : '#1E2D30' }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            {(['Overview', 'Config', 'Assign'] as const).map((label, idx) => (
              <span
                key={label}
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: idx <= stepIdx ? '#5A9E8F' : '#2E4248' }}
                className="text-[10px]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Modal body */}
        <div className="scrollbar-hide flex-1 overflow-y-auto px-6 py-5">

          {/* ─ Overview ─ */}
          {step === 'overview' && (
            <div className="space-y-5">
              <p className="text-[13px] leading-relaxed text-[#8A8480]">{tool.description}</p>

              <div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-2.5 text-[10px] uppercase tracking-widest text-[#2E4248]">
                  Capabilities
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {tool.capabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[12px] text-[#B8B2AA]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5A9E8F]" />
                      {cap}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border p-4" style={{ background: '#111A1D', borderColor: '#1E2D30' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1 text-[10px] uppercase tracking-widest text-[#2E4248]">
                      Pricing
                    </p>
                    {tool.pricingModel === 'free' ? (
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[16px] font-semibold text-[#5A9E8F]">Free</span>
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52' }} className="text-[18px] font-semibold">
                          ${tool.pricing.amount}
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#3A5056]">
                          {tool.pricing.unit}
                        </span>
                      </div>
                    )}
                  </div>
                  {tool.status && tool.status !== 'available' && (
                    <span
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52', borderColor: '#BF8A5230' }}
                      className="rounded border px-2 py-0.5 text-[9px] uppercase"
                    >
                      {tool.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─ Config ─ */}
          {step === 'config' && (
            <div className="space-y-4">
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[14px] text-[#D8D4CC]">
                Configuration
              </p>

              {!tool.requiresConfig ? (
                <div className="flex flex-col items-center gap-3 rounded-md border py-8 text-center" style={{ background: '#0F1E1B', borderColor: '#5A9E8F20' }}>
                  <svg className="h-8 w-8 text-[#5A9E8F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[13px] text-[#D8D4CC]">No configuration required</p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-1 text-[11px] text-[#3A5056]">This tool is ready to use immediately</p>
                  </div>
                </div>
              ) : (
                tool.configFields?.map((field) => (
                  <div key={field.name}>
                    <label
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      className="mb-1.5 block text-[11px] text-[#5A9E8F]"
                    >
                      {field.label}{field.required && <span className="ml-1 text-[#9E5A5A]">*</span>}
                    </label>
                    {field.type === 'oauth' ? (
                      <button
                        className="w-full rounded-md border px-4 py-2.5 text-[12px] transition-all"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F40', color: '#5A9E8F' }}
                      >
                        Connect with OAuth →
                      </button>
                    ) : field.type === 'select' ? (
                      <select
                        value={configuration[field.name] || ''}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      >
                        <option value="">Select…</option>
                        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'password' ? 'password' : 'text'}
                        value={configuration[field.name] || ''}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─ Assign ─ */}
          {step === 'assign' && (
            <div className="space-y-5">
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[14px] text-[#D8D4CC]">
                Assign to Agents
              </p>

              {/* Usage policy */}
              <div className="space-y-3 rounded-md border p-4" style={{ background: '#111A1D', borderColor: '#1E2D30' }}>
                <div>
                  <label style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1.5 block text-[11px] text-[#5A9E8F]">
                    Permissions
                  </label>
                  <select
                    value={permissions}
                    onChange={(e) => setPermissions(e.target.value as 'read' | 'write' | 'full')}
                    className={inputCls}
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  >
                    <option value="read">Read Only</option>
                    <option value="write">Read &amp; Write</option>
                    <option value="full">Full Access</option>
                  </select>
                </div>

                {tool.pricingModel !== 'free' && (
                  <div>
                    <label style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1.5 block text-[11px] text-[#5A9E8F]">
                      Daily Budget (optional)
                    </label>
                    <div className="relative">
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#2E4248]">$</span>
                      <input
                        type="number"
                        value={dailyBudget}
                        onChange={(e) => setDailyBudget(e.target.value)}
                        placeholder="Unlimited"
                        className={inputCls + " pl-7"}
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    </div>
                  </div>
                )}

                <label className="flex cursor-pointer items-center gap-2.5">
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all"
                    style={{ background: requireApproval ? '#5A9E8F' : '#0B1215', borderColor: requireApproval ? '#5A9E8F' : '#2E4248' }}
                    onClick={() => setRequireApproval(!requireApproval)}
                  >
                    {requireApproval && (
                      <svg className="h-2.5 w-2.5 text-[#080E11]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontFamily: "'Syne', sans-serif" }} className="text-[12px] text-[#B8B2AA]">
                    Require approval for each use
                  </span>
                </label>
              </div>

              {/* Agent selection */}
              <div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-2.5 text-[10px] uppercase tracking-widest text-[#2E4248]">
                  Select Agents <span style={{ color: '#3A5056' }}>({selectedAgents.length} selected)</span>
                </p>
                <div className="scrollbar-hide grid max-h-56 grid-cols-2 gap-2 overflow-y-auto">
                  {agents.length === 0 && (
                    <div className="col-span-2 py-6 text-center" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#2E4248' }}>
                      No agents hired for this team yet
                    </div>
                  )}
                  {agents.map((agent) => {
                    const sel = selectedAgents.includes(agent.id);
                    return (
                      <div
                        key={agent.id}
                        onClick={() => handleAgentToggle(agent.id)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5 transition-all"
                        style={{
                          background: sel ? '#0F1E1B' : '#111A1D',
                          borderColor: sel ? '#5A9E8F40' : '#1E2D30',
                        }}
                      >
                        <img src={agent.photo_url} alt={agent.name} className="h-8 w-8 rounded-sm object-cover" />
                        <div className="min-w-0 flex-1">
                          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="truncate text-[12px] text-[#D8D4CC]">
                            {agent.name}
                          </p>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="truncate text-[10px] text-[#2E4248]">
                            {agent.role}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t px-6 py-4" style={{ borderColor: '#162025', background: '#080E11' }}>
          <button
            onClick={onClose}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="text-[11px] text-[#3A5056] transition-colors hover:text-[#B8B2AA]"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step !== 'overview' && (
              <button
                onClick={() => setStep(step === 'assign' ? 'config' : 'overview')}
                style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056' }}
                className="rounded border px-4 py-1.5 text-[11px] transition-all hover:text-[#B8B2AA]"
              >
                ← Back
              </button>
            )}

            {step !== 'assign' ? (
              <button
                onClick={() => setStep(step === 'overview' ? (tool.requiresConfig ? 'config' : 'assign') : 'assign')}
                style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F40', color: '#5A9E8F' }}
                className="rounded border px-4 py-1.5 text-[11px] transition-all hover:bg-[#5A9E8F20]"
              >
                {isInstalled && step === 'overview' ? 'Reconfigure' : 'Next'} →
              </button>
            ) : (
              <button
                onClick={handleInstall}
                style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F20', borderColor: '#5A9E8F60', color: '#5A9E8F' }}
                className="rounded border px-5 py-1.5 text-[11px] font-semibold transition-all hover:bg-[#5A9E8F30]"
              >
                {isInstalled ? 'Update' : 'Install'} Tool
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
