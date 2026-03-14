'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMarketplace, useTeamAgents } from '@/lib/services/agents';
import type { AgentTemplate, Agent } from '@/lib/services/agents';
import AgentDevModal from '@/components/agents/AgentDevModal';
import { Dialog } from '@/components/ui/Dialog';

interface TalentHubViewProps {
  teamId: string;
}

type MainTab = 'my-agents' | 'marketplace';

const SENIORITY_COLORS: Record<string, string> = {
  specialist: '#BF8A52',
  practitioner: '#5A9E8F',
  manager: '#9E7ABF',
};

export default function TalentHubView({ teamId }: TalentHubViewProps) {
  const [mainTab, setMainTab] = useState<MainTab>('my-agents');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDevModal, setShowDevModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);

  const {
    templates,
    isLoading: loadingTemplates,
    hireAgent,
  } = useMarketplace({ autoFetch: true });

  const {
    agents: hiredAgents,
    isLoading: loadingHired,
    refresh: refreshHired,
    fireAgent,
  } = useTeamAgents({ teamId: parseInt(teamId, 10), autoFetch: true });

  const [firingId, setFiringId] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ id: number; name: string } | null>(null);
  const [hiringId, setHiringId] = useState<string | null>(null);

  // Filtered my-agents list
  const filteredAgents = hiredAgents.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      (a.specialty ?? '').toLowerCase().includes(q)
    );
  });

  const handleAgentSaved = async (agent: Agent) => {
    setShowDevModal(false);
    setEditingAgent(undefined);
    await refreshHired();
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setShowDevModal(true);
  };

  const handleFireAgent = async () => {
    if (!confirmRemove) return;
    setFiringId(confirmRemove.id);
    await fireAgent(confirmRemove.id);
    setFiringId(null);
    setConfirmRemove(null);
  };

  const handleHire = async (templateId: string) => {
    setHiringId(templateId);
    await hireAgent({ team_id: parseInt(teamId, 10), template_id: templateId });
    await refreshHired();
    setHiringId(null);
  };

  const openNewAgent = () => {
    setEditingAgent(undefined);
    setShowDevModal(true);
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b px-8 py-5" style={{ borderColor: '#162025' }}>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              className="mb-1 text-[10px] uppercase tracking-widest text-[#3A5056]"
            >
              talent hub
            </p>
            <h1
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
              className="text-[22px] leading-none text-[#EAE6DF]"
            >
              {mainTab === 'my-agents' ? 'My Agents' : 'Agent Marketplace'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-[240px]">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#2E4248]"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents…"
                className="w-full rounded-md border bg-[#111A1D] py-2 pl-8 pr-3 text-[12px] text-[#D8D4CC] placeholder-[#2E4248] outline-none transition-all"
                style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
              />
            </div>

            {/* Add Agent — only on My Agents tab */}
            {mainTab === 'my-agents' && (
              <button
                onClick={openNewAgent}
                className="flex items-center gap-2 rounded-md border px-4 py-2 text-[12px] transition-all"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: '#5A9E8F12',
                  borderColor: '#5A9E8F40',
                  color: '#5A9E8F',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F22'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; }}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Agent
              </button>
            )}
          </div>
        </div>

        {/* Main tabs */}
        <div className="mt-4 flex items-center gap-1">
          {(['my-agents', 'marketplace'] as MainTab[]).map((t) => {
            const label = t === 'my-agents' ? 'My Agents' : 'Marketplace';
            const isActive = mainTab === t;
            return (
              <button
                key={t}
                onClick={() => setMainTab(t)}
                className="relative rounded px-3 py-1.5 text-[11px] transition-all"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: isActive ? '#0F1E1B' : 'transparent',
                  color: isActive ? '#5A9E8F' : '#3A5056',
                  border: `1px solid ${isActive ? '#5A9E8F30' : 'transparent'}`,
                }}
              >
                {label}
                {t === 'my-agents' && hiredAgents.length > 0 && (
                  <span
                    className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px]"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      background: isActive ? '#5A9E8F20' : '#1E2D30',
                      color: isActive ? '#5A9E8F' : '#3A5056',
                    }}
                  >
                    {hiredAgents.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-8 py-6">

        {/* ══ MY AGENTS TAB ══ */}
        {mainTab === 'my-agents' && (
          <>
            {loadingHired && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-md border p-5 animate-pulse" style={{ background: '#111A1D', borderColor: '#1E2D30' }}>
                    <div className="mb-4 flex items-start gap-3">
                      <div className="h-12 w-12 rounded-md" style={{ background: '#162025' }} />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-2/3 rounded" style={{ background: '#162025' }} />
                        <div className="h-2.5 w-1/2 rounded" style={{ background: '#162025' }} />
                      </div>
                    </div>
                    <div className="h-10 rounded" style={{ background: '#162025' }} />
                  </div>
                ))}
              </div>
            )}

            {!loadingHired && filteredAgents.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAgents.map((agent, i) => {
                  const seniority = agent.seniority_level ?? 'practitioner';
                  const senColor = SENIORITY_COLORS[seniority] ?? '#5A9E8F';

                  return (
                    <div
                      key={agent.id}
                      className="group relative flex flex-col rounded-md border transition-all duration-150"
                      style={{
                        background: '#111A1D',
                        borderColor: '#1E2D30',
                        animationDelay: `${i * 40}ms`,
                      }}
                    >
                      {/* Seniority colour bar */}
                      <div
                        className="absolute inset-x-0 top-0 h-[2px] rounded-t-md"
                        style={{ background: senColor }}
                      />

                      <div className="flex flex-1 flex-col p-5">
                        {/* Header */}
                        <div className="mb-4 flex items-start gap-3">
                          <div
                            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border"
                            style={{ background: '#0B1215', borderColor: '#1E2D30' }}
                          >
                            <span
                              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: senColor }}
                              className="leading-none"
                            >
                              {agent.name.charAt(0)}
                            </span>
                            <span
                              className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2"
                              style={{
                                background: agent.is_online ? '#5A9E8F' : '#2A3E44',
                                borderColor: '#111A1D',
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3
                              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                              className="truncate text-[14px] text-[#EAE6DF] leading-tight"
                            >
                              {agent.name}
                            </h3>
                            <p className="truncate text-[11px] text-[#3A5056]">{agent.role}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span
                                className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  color: senColor,
                                  background: `${senColor}15`,
                                }}
                              >
                                {seniority}
                              </span>
                              {agent.can_delegate && (
                                <span
                                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#4A6A72', borderColor: '#1E2D30' }}
                                  className="rounded border px-1.5 py-0.5 text-[9px]"
                                >
                                  delegates
                                </span>
                              )}
                              {agent.can_ask_questions && (
                                <span
                                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#4A6A72', borderColor: '#1E2D30' }}
                                  className="rounded border px-1.5 py-0.5 text-[9px]"
                                >
                                  asks Qs
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Specialty */}
                        {agent.specialty && (
                          <p className="mb-3 text-[12px] text-[#4A6A72]">{agent.specialty}</p>
                        )}

                        {/* Knowledge Base indicator */}
                        {agent.knowledge_base?.length > 0 && (
                          <div className="mb-3 flex items-center gap-1.5">
                            <svg className="h-3 w-3 text-[#3A5056]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#3A5056]">
                              {agent.knowledge_base.length} knowledge {agent.knowledge_base.length === 1 ? 'entry' : 'entries'}
                            </span>
                          </div>
                        )}

                        {/* Model override */}
                        {agent.model_id && (
                          <div className="mb-3 flex items-center gap-1.5">
                            <svg className="h-3 w-3 text-[#3A5056]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#3A5056] truncate">
                              {agent.model_id.split('/').pop()}
                            </span>
                          </div>
                        )}

                        {/* Footer actions */}
                        <div
                          className="mt-auto flex items-center justify-between border-t pt-4"
                          style={{ borderColor: '#162025' }}
                        >
                          <span
                            style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52' }}
                            className="text-[13px] font-semibold"
                          >
                            ${agent.cost_per_hour.toFixed(2)}
                            <span className="text-[10px] text-[#5A6E58]">/hr</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditAgent(agent)}
                              className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all"
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                background: 'transparent',
                                borderColor: '#1E2D30',
                                color: '#4A6A72',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5A9E8F40'; e.currentTarget.style.color = '#5A9E8F'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; e.currentTarget.style.color = '#4A6A72'; }}
                            >
                              Configure
                            </button>
                            <button
                              onClick={() => setConfirmRemove({ id: agent.id, name: agent.name })}
                              disabled={firingId === agent.id}
                              className="flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] text-[#2E4248] transition-all disabled:opacity-40"
                              style={{ borderColor: 'transparent' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#9E5A5A'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#2E4248'; }}
                              title="Remove agent"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loadingHired && filteredAgents.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center py-24 text-center">
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border"
                  style={{ background: '#111A1D', borderColor: '#1E2D30' }}
                >
                  <svg className="h-7 w-7 text-[#2A3E44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[15px] text-[#3A5056]">
                  {searchQuery ? 'No agents match your search' : 'No agents on this team yet'}
                </p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-1 text-[12px] text-[#2A3E44]">
                  {searchQuery ? 'Try a different search term' : 'Add your first agent to get started'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={openNewAgent}
                    className="mt-6 flex items-center gap-2 rounded-md border px-5 py-2.5 text-[12px] transition-all"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      background: '#5A9E8F12',
                      borderColor: '#5A9E8F40',
                      color: '#5A9E8F',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F22'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Agent
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ══ MARKETPLACE TAB ══ */}
        {mainTab === 'marketplace' && (
          <>
            {loadingTemplates && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="rounded-md border p-5 animate-pulse" style={{ background: '#111A1D', borderColor: '#1E2D30' }}>
                    <div className="mb-4 flex items-start gap-3">
                      <div className="h-12 w-12 rounded-md" style={{ background: '#162025' }} />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-2/3 rounded" style={{ background: '#162025' }} />
                        <div className="h-2.5 w-1/2 rounded" style={{ background: '#162025' }} />
                      </div>
                    </div>
                    <div className="h-10 rounded" style={{ background: '#162025' }} />
                  </div>
                ))}
              </div>
            )}

            {!loadingTemplates && templates.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center py-24 text-center">
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[15px] text-[#3A5056]">
                  No agents in the marketplace yet
                </p>
              </div>
            )}

            {!loadingTemplates && templates.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template, i) => {
                  const senColor = SENIORITY_COLORS[template.seniority_level] ?? '#5A9E8F';
                  const alreadyHired = hiredAgents.some((a) => a.avatar_seed === template.id);
                  const isHiring = hiringId === template.id;

                  return (
                    <div
                      key={template.id}
                      className="relative flex flex-col rounded-md border transition-all duration-150"
                      style={{ background: '#111A1D', borderColor: '#1E2D30', animationDelay: `${i * 40}ms` }}
                    >
                      {/* Seniority bar */}
                      <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: senColor }} />

                      {template.is_featured && (
                        <div className="absolute right-3 top-3">
                          <span
                            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#BF8A52', borderColor: '#BF8A5230', background: '#BF8A5210' }}
                            className="rounded border px-1.5 py-0.5 uppercase tracking-wider"
                          >
                            Featured
                          </span>
                        </div>
                      )}

                      <div className="flex flex-1 flex-col p-5 pt-6">
                        {/* Header */}
                        <div className="mb-3 flex items-start gap-3">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border"
                            style={{ background: `${senColor}12`, borderColor: `${senColor}30` }}
                          >
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '20px', color: senColor }}>
                              {template.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pr-12">
                            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }} className="truncate text-[14px] text-[#EAE6DF]">
                              {template.name}
                            </h3>
                            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="truncate text-[11px] text-[#3A5056]">
                              {template.role}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span
                                className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                                style={{ fontFamily: "'IBM Plex Mono', monospace", color: senColor, background: `${senColor}15` }}
                              >
                                {template.seniority_level}
                              </span>
                              {template.can_delegate && (
                                <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#4A6A72', borderColor: '#1E2D30' }} className="rounded border px-1.5 py-0.5 text-[9px]">
                                  delegates
                                </span>
                              )}
                              {template.can_ask_questions && (
                                <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#4A6A72', borderColor: '#1E2D30' }} className="rounded border px-1.5 py-0.5 text-[9px]">
                                  asks Qs
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontFamily: "'Syne', sans-serif" }} className="mb-3 text-[12px] leading-relaxed text-[#4A6A72] line-clamp-2">
                          {template.description}
                        </p>

                        {/* Skills */}
                        {template.skills.length > 0 && (
                          <div className="mb-4 flex flex-wrap gap-1">
                            {template.skills.slice(0, 3).map((skill) => (
                              <span
                                key={skill}
                                style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#3A5056', borderColor: '#1E2D30', background: '#0B1215' }}
                                className="rounded border px-2 py-0.5 text-[10px]"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="mt-auto flex items-center justify-between border-t pt-4" style={{ borderColor: '#162025' }}>
                          <div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52' }} className="text-[13px] font-semibold">
                              ${template.base_cost_per_hour.toFixed(0)}<span className="text-[10px] text-[#5A6E58]">/hr</span>
                            </div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2E4248]">
                              ★ {template.rating} · {template.hires_count} hires
                            </div>
                          </div>

                          <button
                            onClick={() => !alreadyHired && handleHire(template.id)}
                            disabled={alreadyHired || isHiring}
                            className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all disabled:cursor-not-allowed"
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              background: alreadyHired ? '#5A9E8F10' : '#5A9E8F12',
                              borderColor: alreadyHired ? '#5A9E8F30' : '#5A9E8F40',
                              color: alreadyHired ? '#3A6A62' : '#5A9E8F',
                              opacity: alreadyHired ? 0.6 : 1,
                            }}
                            onMouseEnter={(e) => { if (!alreadyHired && !isHiring) e.currentTarget.style.background = '#5A9E8F22'; }}
                            onMouseLeave={(e) => { if (!alreadyHired && !isHiring) e.currentTarget.style.background = '#5A9E8F12'; }}
                          >
                            {isHiring ? (
                              <>
                                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Hiring…
                              </>
                            ) : alreadyHired ? (
                              'On Team'
                            ) : (
                              'Hire →'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Agent Dev Modal ───────────────────────────────────────────────────── */}
      <Dialog
        open={!!confirmRemove}
        title={`Remove ${confirmRemove?.name ?? 'agent'}?`}
        description="This agent will be removed from your team. Their configuration and knowledge base will be deleted."
        variant="destructive"
        confirmLabel="Remove"
        loading={firingId !== null}
        onConfirm={handleFireAgent}
        onCancel={() => setConfirmRemove(null)}
      />

      {showDevModal && (
        <AgentDevModal
          teamId={parseInt(teamId, 10)}
          teamAgents={hiredAgents}
          agent={editingAgent}
          onClose={() => { setShowDevModal(false); setEditingAgent(undefined); }}
          onSaved={handleAgentSaved}
        />
      )}
    </div>
  );
}
