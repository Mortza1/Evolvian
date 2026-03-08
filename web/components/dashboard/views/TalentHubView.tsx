'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMarketplace, useTeamAgents } from '@/lib/services/agents';
import type { AgentTemplate } from '@/lib/services/agents';

interface TalentHubViewProps {
  teamId: string;
}

// ─── Category label map ────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  management: 'Mgmt',
  research: 'Research',
  creative: 'Creative',
  technical: 'Technical',
  operations: 'Ops',
};

export default function TalentHubView({ teamId }: TalentHubViewProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hiringId, setHiringId] = useState<string | null>(null);

  const {
    templates,
    categories,
    isLoading: loadingTemplates,
    error: templatesError,
    hireAgent,
  } = useMarketplace({ autoFetch: true });

  const {
    agents: hiredAgents,
    isLoading: loadingHired,
    refresh: refreshHired,
  } = useTeamAgents({ teamId: parseInt(teamId, 10), autoFetch: true });

  const [filteredTemplates, setFilteredTemplates] = useState<AgentTemplate[]>([]);

  useEffect(() => {
    let filtered = templates;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (t) => t.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.role.toLowerCase().includes(q) ||
          t.specialty.toLowerCase().includes(q) ||
          t.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, searchQuery]);

  const isHired = useCallback(
    (templateId: string) => hiredAgents.some((a) => a.avatar_seed === templateId),
    [hiredAgents]
  );

  const handleHireAgent = async (template: AgentTemplate) => {
    setHiringId(template.id);
    try {
      const hired = await hireAgent({
        team_id: parseInt(teamId, 10),
        template_id: template.id,
      });
      if (hired) await refreshHired();
    } catch (err) {
      console.error('Failed to hire agent:', err);
    } finally {
      setHiringId(null);
    }
  };

  const categoryList = [
    { id: 'all', name: 'All Agents' },
    ...(categories.length > 0
      ? categories.map((c) => ({ id: c.id, name: c.name }))
      : [
          { id: 'management', name: 'Management' },
          { id: 'research', name: 'Research' },
          { id: 'creative', name: 'Creative' },
          { id: 'technical', name: 'Technical' },
          { id: 'operations', name: 'Operations' },
        ]),
  ];

  const isLoading = loadingTemplates || loadingHired;

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}
    >
      {/* ── Header bar ───────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-b px-8 py-5"
        style={{ borderColor: '#162025' }}
      >
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
              Agent Marketplace
            </h1>
          </div>

          {/* Search */}
          <div className="relative w-[280px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#2E4248]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
        </div>

        {/* Category tabs */}
        <div className="mt-4 flex items-center gap-1">
          {categoryList.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="relative rounded px-3 py-1.5 text-[11px] transition-all"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: isActive ? '#0F1E1B' : 'transparent',
                  color: isActive ? '#5A9E8F' : '#3A5056',
                  border: `1px solid ${isActive ? '#5A9E8F30' : 'transparent'}`,
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {templatesError && (
        <div
          className="mx-8 mt-4 shrink-0 rounded border px-4 py-3"
          style={{ background: '#9E5A5A12', borderColor: '#9E5A5A30' }}
        >
          <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#9E5A5A]">
            {templatesError}
          </p>
        </div>
      )}

      {/* ── Grid area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-8 py-6">

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-md border p-5 animate-pulse"
                style={{ background: '#111A1D', borderColor: '#1E2D30' }}
              >
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

        {/* Agent grid */}
        {!isLoading && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template, i) => {
              const hired = isHired(template.id);
              const isHiring = hiringId === template.id;

              return (
                <div
                  key={template.id}
                  className="animate-evolve-in group relative flex flex-col rounded-md border transition-all duration-150"
                  style={{
                    background: hired ? '#0F1E1B' : '#111A1D',
                    borderColor: hired ? '#5A9E8F30' : '#1E2D30',
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  {/* Featured bar */}
                  {template.is_featured && (
                    <div
                      className="absolute inset-x-0 top-0 h-[2px] rounded-t-md"
                      style={{ background: '#BF8A52' }}
                    />
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    {/* Card header */}
                    <div className="mb-4 flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border"
                        style={{ background: '#0B1215', borderColor: hired ? '#5A9E8F30' : '#1E2D30' }}
                      >
                        <span
                          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px' }}
                          className="text-[#5A9E8F] leading-none"
                        >
                          {template.name.charAt(0)}
                        </span>
                        {hired && (
                          <span
                            className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2"
                            style={{ background: '#5A9E8F', borderColor: '#111A1D' }}
                          />
                        )}
                      </div>

                      {/* Name / role / badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                            className="truncate text-[14px] text-[#EAE6DF] leading-tight"
                          >
                            {template.name}
                          </h3>
                          {template.is_premium && (
                            <span
                              style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52', borderColor: '#BF8A5230' }}
                              className="shrink-0 rounded border px-1.5 py-0.5 text-[9px]"
                            >
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-[#3A5056]">{template.role}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span
                            style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#5A9E8F', borderColor: '#5A9E8F30' }}
                            className="rounded border px-1.5 py-0.5 text-[9px]"
                          >
                            LV {template.level}
                          </span>
                          <div className="flex items-center gap-1">
                            <svg className="h-3 w-3 text-[#BF8A52]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#BF8A52]">
                              {template.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mb-3 line-clamp-2 text-[12px] leading-relaxed text-[#4A6A72]">
                      {template.description}
                    </p>

                    {/* Specialty */}
                    <div className="mb-3">
                      <span
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        className="text-[9px] uppercase tracking-widest text-[#2E4248]"
                      >
                        Specialty
                      </span>
                      <p className="mt-0.5 text-[12px] text-[#B8B2AA]">{template.specialty}</p>
                    </div>

                    {/* Skills */}
                    <div className="mb-4 flex flex-wrap gap-1">
                      {template.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056' }}
                          className="rounded border bg-[#0B1215] px-2 py-0.5 text-[10px]"
                        >
                          {skill}
                        </span>
                      ))}
                      {template.skills.length > 3 && (
                        <span
                          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          className="px-1 text-[10px] text-[#2E4248]"
                        >
                          +{template.skills.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div
                      className="mt-auto flex items-center justify-between border-t pt-4"
                      style={{ borderColor: '#162025' }}
                    >
                      <div>
                        <span
                          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          className="text-[9px] uppercase tracking-widest text-[#2E4248]"
                        >
                          Cost
                        </span>
                        <p
                          style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52' }}
                          className="text-[15px] font-semibold leading-tight"
                        >
                          ${template.base_cost_per_hour.toFixed(2)}
                          <span className="text-[10px] text-[#5A6E58]">/hr</span>
                        </p>
                      </div>

                      {hired ? (
                        <div
                          className="flex items-center gap-1.5 rounded border px-3 py-1.5"
                          style={{ background: '#0F1E1B', borderColor: '#5A9E8F30', color: '#5A9E8F' }}
                        >
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px]">
                            Hired
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleHireAgent(template)}
                          disabled={isHiring}
                          className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            background: '#5A9E8F12',
                            borderColor: '#5A9E8F40',
                            color: '#5A9E8F',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F20'; e.currentTarget.style.borderColor = '#5A9E8F70'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; e.currentTarget.style.borderColor = '#5A9E8F40'; }}
                        >
                          {isHiring ? (
                            <>
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Hiring…
                            </>
                          ) : (
                            'Hire Agent →'
                          )}
                        </button>
                      )}
                    </div>

                    {/* Hires count */}
                    {template.hires_count > 0 && (
                      <p
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        className="mt-3 text-center text-[10px] text-[#2A3E44]"
                      >
                        {template.hires_count.toLocaleString()} teams hired
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredTemplates.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-24 text-center">
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border"
              style={{ background: '#111A1D', borderColor: '#1E2D30' }}
            >
              <svg className="h-5 w-5 text-[#2A3E44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[14px] text-[#3A5056]">
              No agents found
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-1 text-[11px] text-[#2A3E44]">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
