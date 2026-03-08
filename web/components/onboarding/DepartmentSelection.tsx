'use client';

import { useState } from 'react';
import { PERSONAL_BRANDING_AGENTS } from '@/lib/personal-branding-agents';

import type { Agent } from '@/lib/agents';

interface DepartmentSelectionProps {
  onSelect: (department: string, agents?: Agent[]) => void;
  onCustomTeam: () => void;
}

export default function DepartmentSelection({ onSelect, onCustomTeam }: DepartmentSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const handleSelect = (dept: string, agents?: Agent[]) => {
    setIsSelecting(true);
    setSelectedDept(dept);
    setTimeout(() => {
      onSelect(dept, agents);
    }, 600);
  };

  const departments = [
    {
      id: 'personal-branding',
      name: 'Personal Branding',
      description: 'Build your digital presence with brand strategy, content, and design experts',
      icon: '◈',
      accent: '#BF8A52',
      agents: PERSONAL_BRANDING_AGENTS,
      agentCount: 4,
    },
    {
      id: 'sales',
      name: 'Sales',
      description: 'Drive revenue with outreach, lead generation, and closing specialists',
      icon: '▲',
      accent: '#5A9E8F',
      agents: undefined,
      agentCount: 5,
    },
    {
      id: 'marketing',
      name: 'Marketing',
      description: 'Scale growth with SEO, ads, analytics, and campaign strategists',
      icon: '◉',
      accent: '#7A8FA0',
      agents: undefined,
      agentCount: 6,
    },
  ];

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: '#080E11' }}>
      {/* Phylogenetic tree SVG */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.04 }}
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="#5A9E8F" strokeWidth="1" fill="none">
          <line x1="400" y1="760" x2="400" y2="560" />
          <line x1="400" y1="560" x2="240" y2="420" />
          <line x1="400" y1="560" x2="560" y2="420" />
          <line x1="240" y1="420" x2="160" y2="300" />
          <line x1="240" y1="420" x2="320" y2="300" />
          <line x1="560" y1="420" x2="480" y2="300" />
          <line x1="560" y1="420" x2="640" y2="300" />
          <line x1="160" y1="300" x2="120" y2="200" />
          <line x1="160" y1="300" x2="200" y2="200" />
          <line x1="320" y1="300" x2="280" y2="200" />
          <line x1="320" y1="300" x2="360" y2="200" />
          <line x1="480" y1="300" x2="440" y2="200" />
          <line x1="480" y1="300" x2="520" y2="200" />
          <line x1="640" y1="300" x2="600" y2="200" />
          <line x1="640" y1="300" x2="680" y2="200" />
          {[120, 200, 280, 360, 440, 520, 600, 680].map(x => (
            <circle key={x} cx={x} cy={200} r="4" fill="#5A9E8F" stroke="none" />
          ))}
          <circle cx="400" cy="760" r="5" fill="#5A9E8F" stroke="none" />
        </g>
      </svg>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 80%, #5A9E8F08 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">

          {/* Header */}
          <div className="text-center mb-10">
            <p
              className="mb-2"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.12em' }}
            >
              step 01 / workforce
            </p>
            <h1
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '28px', color: '#EAE6DF', lineHeight: 1.2 }}
            >
              Build Your First Team
            </h1>
            <p
              className="mt-2"
              style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#4A6A72' }}
            >
              Choose a pre-built department or design your own
            </p>
          </div>

          {/* Department cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {departments.map((dept, i) => {
              const isSelected = selectedDept === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => handleSelect(dept.id, dept.agents)}
                  disabled={isSelecting}
                  className="animate-evolve-in relative rounded-md border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isSelected ? `${dept.accent}10` : '#111A1D',
                    borderColor: isSelected ? `${dept.accent}50` : '#1E2D30',
                    animationDelay: `${i * 80}ms`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelecting && !isSelected) {
                      e.currentTarget.style.borderColor = `${dept.accent}40`;
                      e.currentTarget.style.background = `${dept.accent}08`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#1E2D30';
                      e.currentTarget.style.background = '#111A1D';
                    }
                  }}
                >
                  {/* Accent top bar */}
                  <div
                    className="absolute inset-x-0 top-0 h-[2px] rounded-t-md"
                    style={{ background: `${dept.accent}60` }}
                  />

                  <div className="p-5 pt-6">
                    {/* Icon */}
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-md border mb-4 text-[22px]"
                      style={{ background: `${dept.accent}12`, borderColor: `${dept.accent}30`, color: dept.accent }}
                    >
                      {dept.icon}
                    </div>

                    <h3
                      style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#EAE6DF' }}
                      className="mb-2"
                    >
                      {dept.name}
                    </h3>
                    <p
                      className="mb-4 leading-relaxed"
                      style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#4A6A72' }}
                    >
                      {dept.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }}
                      >
                        {dept.agentCount} specialists
                      </span>

                      {isSelected && isSelecting ? (
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map(j => (
                            <div
                              key={j}
                              className="animate-typing-dot rounded-full"
                              style={{ width: '4px', height: '4px', background: dept.accent, animationDelay: `${j * 150}ms` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <span
                          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: dept.accent }}
                        >
                          Select →
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom team */}
          <div className="flex justify-center">
            <button
              onClick={onCustomTeam}
              disabled={isSelecting}
              className="rounded border px-5 py-2.5 text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                borderColor: '#1E2D30',
                color: '#3A5056',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2A4A52';
                e.currentTarget.style.color = '#B8B2AA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1E2D30';
                e.currentTarget.style.color = '#3A5056';
              }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Build Custom Team
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
