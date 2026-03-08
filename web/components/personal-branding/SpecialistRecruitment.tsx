'use client';

import { useState, useEffect } from 'react';

interface SpecialistRecruitmentProps {
  teamId: string;
  discoveryDoc: File | null;
  onComplete: () => void;
}

interface Specialist {
  id: string;
  name: string;
  role: string;
  specialty: string;
  experience: string;
  rating: number;
  reviews: number;
  salary: number;
  creator: string;
  creatorEarnings: number;
  skills: string[];
  description: string;
  approved: boolean;
}

// SVG icon components — no emojis
function ColorOracleIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <circle cx="16" cy="16" r="7" fill={color} opacity="0.9" />
      <circle cx="32" cy="16" r="7" fill={color} opacity="0.55" />
      <circle cx="24" cy="30" r="7" fill={color} opacity="0.35" />
      <circle cx="24" cy="20" r="5" fill={color} opacity="0.7" />
    </svg>
  );
}

function TrendBotIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <polyline points="4,38 14,24 22,30 32,14 44,8" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx="44" cy="8" r="3" fill={color} />
      <line x1="4" y1="42" x2="44" y2="42" stroke={color} strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}

function TypoMasterIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <text x="4" y="30" fontFamily="serif" fontSize="28" fontWeight="700" fill={color} opacity="0.9">Aa</text>
      <line x1="4" y1="36" x2="36" y2="36" stroke={color} strokeWidth="2" opacity="0.4" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill={filled ? '#BF8A52' : '#1E2D30'} width="12" height="12">
      <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 5.2l4-.6z" />
    </svg>
  );
}

const SPECIALISTS: Specialist[] = [
  {
    id: 'color-oracle',
    name: 'The Color Oracle',
    role: 'RGB Psychology Expert',
    specialty: 'Color theory, brand psychology, visual identity',
    experience: '6+ years',
    rating: 4.8,
    reviews: 189,
    salary: 38,
    creator: '@DesignGuru',
    creatorEarnings: 1840,
    skills: ['Color Psychology', 'Brand Identity', 'Accessibility', 'Market Trends'],
    description: 'Specializes in using color psychology to create memorable, emotionally resonant brands. Expert in ensuring accessibility while maintaining aesthetic appeal.',
    approved: false,
  },
  {
    id: 'trend-bot-2026',
    name: 'Trend-Bot 2026',
    role: 'Viral Hook Specialist',
    specialty: 'Viral content, engagement optimization, trend analysis',
    experience: '4+ years',
    rating: 4.9,
    reviews: 312,
    salary: 45,
    creator: '@TrendHunter',
    creatorEarnings: 3120,
    skills: ['Viral Mechanics', 'A/B Testing', 'Platform Algorithms', 'Content Timing'],
    description: 'AI agent trained on 10M+ viral posts. Predicts trends before they peak and crafts hooks that drive engagement. Updated daily with latest platform algorithms.',
    approved: false,
  },
  {
    id: 'typo-master',
    name: 'Typo-Master',
    role: 'Readability & Typography Expert',
    specialty: 'Typography, readability, font pairing, hierarchy',
    experience: '7+ years',
    rating: 4.7,
    reviews: 156,
    salary: 35,
    creator: '@FontLover',
    creatorEarnings: 980,
    skills: ['Typography', 'Font Pairing', 'Reading Flow', 'Cross-platform Optimization'],
    description: 'Ensures your content is not just beautiful, but effortlessly readable. Masters font hierarchy, spacing, and visual flow for maximum comprehension.',
    approved: false,
  },
];

// Per-specialist accent colours — no purple
const ACCENTS = ['#BF8A52', '#5A9E8F', '#7BBDAE'] as const;
const ICONS = [ColorOracleIcon, TrendBotIcon, TypoMasterIcon];

export default function SpecialistRecruitment({ teamId, discoveryDoc, onComplete }: SpecialistRecruitmentProps) {
  const [specialists, setSpecialists] = useState<Specialist[]>(SPECIALISTS);
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [showApproval, setShowApproval] = useState(false);
  const [isHiring, setIsHiring] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setShowRecommendation(false);
      setShowApproval(true);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const handleApproveAll = () => {
    setShowApproval(false);
    setIsHiring(true);
    setSpecialists(prev => prev.map(s => ({ ...s, approved: true })));
    setTimeout(() => onComplete(), 4000);
  };

  const totalHourlyCost = specialists.reduce((sum, s) => sum + s.salary, 0);
  const totalMonthlyCost = totalHourlyCost * 160;

  return (
    <div className="min-h-screen p-8" style={{ background: '#080E11' }}>
      {/* Phylogenetic tree texture */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Cline x1='300' y1='0' x2='300' y2='600' stroke='%235A9E8F' stroke-width='1'/%3E%3Cline x1='300' y1='150' x2='100' y2='300' stroke='%235A9E8F' stroke-width='1'/%3E%3Cline x1='300' y1='150' x2='500' y2='300' stroke='%235A9E8F' stroke-width='1'/%3E%3Cline x1='100' y1='300' x2='50' y2='450' stroke='%235A9E8F' stroke-width='1'/%3E%3Cline x1='100' y1='300' x2='200' y2='450' stroke='%235A9E8F' stroke-width='1'/%3E%3Cline x1='500' y1='300' x2='400' y2='450' stroke='%235A9E8F' stroke-width='1'/%3E%3Cline x1='500' y1='300' x2='550' y2='450' stroke='%235A9E8F' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '600px 600px' }} />

      <div className="relative max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 rounded border px-3 py-1 mb-5"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#BF8A52', borderColor: '#BF8A5240', background: '#BF8A5210', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            <span className="block h-1.5 w-1.5 rounded-full bg-[#BF8A52] animate-pulse" />
            Aria's Recommendation
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '26px', color: '#EAE6DF' }} className="mb-1">
            Elite Branding Specialists
          </h1>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#3A5056' }}>
            Handpicked by Aria to build your personal brand
          </p>
        </div>

        {/* Aria recommendation bubble */}
        {showRecommendation && (
          <div
            className="mb-8 rounded-md border p-5"
            style={{ background: '#111A1D', borderColor: '#BF8A5230' }}
          >
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: '#BF8A5260' }} />
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border-2 text-[12px] font-bold"
                style={{ background: '#BF8A5218', borderColor: '#BF8A52', color: '#BF8A52', fontFamily: "'Syne', sans-serif" }}
              >
                AR
              </div>
              <div>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '13px', color: '#EAE6DF' }} className="mb-1">
                  Aria Martinez
                </p>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#8A9E9A', lineHeight: '1.6' }}>
                  "Based on {discoveryDoc ? 'your profile' : 'our conversation'}, I've selected three specialists who will create a cohesive, elite brand. The Color Oracle will establish your visual identity, Trend-Bot will ensure your content reaches the right audience, and Typo-Master will make everything readable and professional."
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Specialists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {specialists.map((specialist, idx) => {
            const accent = ACCENTS[idx % ACCENTS.length];
            const IconComponent = ICONS[idx % ICONS.length];
            const filledStars = Math.round(specialist.rating);

            return (
              <div
                key={specialist.id}
                className="relative rounded-md border transition-all"
                style={{ background: '#111A1D', borderColor: specialist.approved ? `${accent}40` : '#1E2D30' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}40`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = specialist.approved ? `${accent}40` : '#1E2D30'; }}
              >
                {/* Accent top bar */}
                <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: `${accent}70` }} />

                <div className="p-5">
                  {/* Avatar — SVG icon in a geometric frame */}
                  <div className="flex justify-center mb-4 mt-1">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-sm border-2"
                      style={{ background: `${accent}12`, borderColor: accent }}
                    >
                      <IconComponent color={accent} />
                    </div>
                  </div>

                  {/* Name / role */}
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#EAE6DF' }} className="text-center mb-0.5">
                    {specialist.name}
                  </h3>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056' }} className="text-center mb-3">
                    {specialist.role}
                  </p>

                  {/* Star rating */}
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(s => <StarIcon key={s} filled={s <= filledStars} />)}
                  </div>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }} className="text-center mb-4">
                    {specialist.rating} · {specialist.reviews} reviews
                  </p>

                  {/* Description */}
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#4A6A72', lineHeight: '1.6' }} className="mb-4">
                    {specialist.description}
                  </p>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {specialist.skills.map(skill => (
                      <span
                        key={skill}
                        className="rounded border px-2 py-0.5"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: accent, borderColor: `${accent}30`, background: `${accent}0A` }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="rounded border p-3 mb-4" style={{ background: '#0B1215', borderColor: '#162025' }}>
                    <div className="flex items-center justify-between">
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }}>Hourly rate</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '16px', fontWeight: 700, color: '#BF8A52' }}>
                        ${specialist.salary}<span style={{ fontSize: '10px', color: '#3A5056' }}>/hr</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }}>Monthly (160h)</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#4A6A72' }}>
                        ${(specialist.salary * 160).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Creator attribution */}
                  <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: '#162025' }}>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-sm text-[9px] font-bold"
                        style={{ background: '#5A9E8F18', color: '#5A9E8F', fontFamily: "'Syne', sans-serif" }}
                      >
                        {specialist.creator.slice(1, 3).toUpperCase()}
                      </div>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056' }}>
                        {specialist.creator}
                      </span>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#5A9E8F' }}>
                      ${specialist.creatorEarnings}/wk
                    </span>
                  </div>

                  {/* Hired badge */}
                  {specialist.approved && (
                    <div
                      className="mt-4 flex items-center justify-center gap-2 rounded border py-2"
                      style={{ background: '#5A9E8F0F', borderColor: '#5A9E8F40' }}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="#5A9E8F" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5A9E8F' }}>Hired</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cost summary */}
        <div
          className="relative rounded-md border mb-6"
          style={{ background: '#111A1D', borderColor: '#1E2D30' }}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: '#5A9E8F50' }} />
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="mb-1">
                Total team cost
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '24px', fontWeight: 700, color: '#BF8A52' }}>
                ${totalHourlyCost}<span style={{ fontSize: '13px', color: '#3A5056' }}>/hr</span>
                <span style={{ fontSize: '14px', color: '#3A5056' }}> · ${totalMonthlyCost.toLocaleString()}/mo</span>
              </p>
            </div>
            <div className="text-right">
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="mb-1">
                Team size
              </p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '22px', color: '#5A9E8F' }}>4</p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }}>incl. Aria as lead</p>
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        {showApproval && (
          <div className="flex gap-4">
            <button
              onClick={handleApproveAll}
              className="flex-1 flex items-center justify-center gap-3 rounded-md border py-4 transition-all"
              style={{ background: '#5A9E8F14', borderColor: '#5A9E8F60', color: '#5A9E8F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5A9E8F22'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5A9E8F14'; }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div>Approve All Hires</div>
                <div style={{ fontSize: '10px', color: '#3A5056' }}>Start building your brand now</div>
              </div>
            </button>

            <button
              onClick={handleApproveAll}
              className="rounded-md border px-8 py-4 transition-all"
              style={{ background: '#111A1D', borderColor: '#1E2D30', color: '#4A6A72', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2E4248'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E2D30'; }}
            >
              <div style={{ fontSize: '10px', color: '#2E4248' }} className="mb-0.5">or</div>
              Review Individually
            </button>
          </div>
        )}

        {/* Hiring progress */}
        {isHiring && (
          <div
            className="relative rounded-md border py-10 text-center"
            style={{ background: '#111A1D', borderColor: '#5A9E8F30' }}
          >
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: '#5A9E8F60' }} />
            <div className="relative h-14 w-14 mx-auto mb-5">
              <div className="absolute inset-0 rounded-sm border border-[#5A9E8F]/15" />
              <div className="absolute inset-0 rounded-sm border border-[#5A9E8F]/30 border-t-[#5A9E8F] animate-spin" />
            </div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#EAE6DF' }} className="mb-2">
              Hiring Specialists…
            </h3>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#3A5056' }}>
              Processing contracts and setting up your workspace
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
