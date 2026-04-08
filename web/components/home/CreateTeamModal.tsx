'use client';

import { useState } from 'react';
import { Team, createTeam } from '@/lib/teams';
import { agentService } from '@/lib/services/agents';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (team: Team, isPersonalBranding?: boolean) => void;
}

// ─── Blueprint icons ──────────────────────────────────────────────────────────

function IntelIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" width="26" height="26">
      <circle cx="14" cy="14" r="7" stroke={color} strokeWidth="1.5" />
      <line x1="14" y1="7" x2="14" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="14" y1="21" x2="14" y2="24" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="7" y1="14" x2="4" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="21" y1="14" x2="24" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <circle cx="14" cy="14" r="2" fill={color} opacity="0.7" />
      <line x1="19" y1="19" x2="27" y2="27" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ResearchIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" width="26" height="26">
      <rect x="4" y="3" width="18" height="22" rx="1.5" stroke={color} strokeWidth="1.5" />
      <line x1="8" y1="9" x2="18" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="13" x2="18" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="8" y1="17" x2="14" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <circle cx="23" cy="23" r="4" stroke={color} strokeWidth="1.5" opacity="0.8" />
      <line x1="26" y1="26" x2="29" y2="29" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function ProposalIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" width="26" height="26">
      <rect x="4" y="3" width="18" height="24" rx="1.5" stroke={color} strokeWidth="1.5" />
      <line x1="8" y1="9" x2="18" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="13" x2="18" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="8" y1="17" x2="14" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M20 22 L26 16 L29 19 L23 25 L19 26 Z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

function CustomTeamIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" width="26" height="26">
      <rect x="3" y="3" width="10" height="10" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="19" y="3" width="10" height="10" rx="1" stroke={color} strokeWidth="1.5" opacity="0.6" />
      <rect x="3" y="19" width="10" height="10" rx="1" stroke={color} strokeWidth="1.5" opacity="0.6" />
      <rect x="19" y="19" width="10" height="10" rx="1" stroke={color} strokeWidth="1.5" opacity="0.35" />
      <line x1="16" y1="8" x2="16" y2="24" stroke={color} strokeWidth="1" opacity="0.3" />
      <line x1="8" y1="16" x2="24" y2="16" stroke={color} strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_ICON_KEYS = ['◈', '▲', '◉', '◆', '⬡', '▣', '◐', '▽', '◑', '◧', '◫', '◻'];
const TEAM_COLORS = [
  '#BF8A52', '#5A9E8F', '#7BBDAE', '#7A8FA0',
  '#9E7A5A', '#5A7A9E', '#8F9E5A', '#9E5A5A',
  '#5A8F9E', '#9E5A8F', '#6A9E7A', '#8A7A9E',
];

// Squad → agent template IDs to auto-hire
const SQUAD_AGENTS: Record<string, string[]> = {
  'intel-squad': [
    'intel-aria', 'intel-scout', 'intel-hunter',
    'intel-rex', 'intel-penny', 'intel-vera',
    'intel-noor', 'intel-scribe',
  ],
  'research-squad': [
    'research-director', 'research-investigator',
    'research-analyst', 'research-chronicler',
  ],
  'proposal-squad': [
    'proposal-strategist', 'proposal-wordsmith', 'proposal-scout',
  ],
};

const BLUEPRINTS = [
  {
    id: 'intel-squad',
    name: 'Intel Squad',
    Icon: IntelIcon,
    accent: '#9E7ABF',
    description: 'Full competitive intelligence pipeline — 8 specialist agents',
    features: ['Lead Strategist', 'Web Researchers', 'Market Analyst', 'Pricing & Sentiment'],
    defaults: { name: 'Intel Squad', description: 'Competitive intelligence and market analysis', icon: '◉', color: '#9E7ABF' },
  },
  {
    id: 'research-squad',
    name: 'Research Squad',
    Icon: ResearchIcon,
    accent: '#5A9E8F',
    description: 'Business research and intelligence reports — 4 agents',
    features: ['Research Director', 'Web Investigator', 'Analyst', 'Report Author'],
    defaults: { name: 'Research Squad', description: 'Market research and business intelligence', icon: '◆', color: '#5A9E8F' },
  },
  {
    id: 'proposal-squad',
    name: 'Proposal Squad',
    Icon: ProposalIcon,
    accent: '#BF8A52',
    description: 'Client proposals and pitches — 3 agents',
    features: ['Proposal Strategist', 'Proposal Writer', 'Client Researcher'],
    defaults: { name: 'Proposal Squad', description: 'Client proposals and winning pitches', icon: '▲', color: '#BF8A52' },
  },
  {
    id: 'custom',
    name: 'Custom Team',
    Icon: CustomTeamIcon,
    accent: '#7A8FA0',
    description: 'Build your own team from scratch',
    features: ['Full Control', 'Choose Any Agents', 'Custom Workflow', 'Flexible Budget'],
    defaults: { name: '', description: '', icon: TEAM_ICON_KEYS[0], color: TEAM_COLORS[0] },
  },
];

type ModalStep = 'blueprint' | 'details' | 'hiring';

export default function CreateTeamModal({ isOpen, onClose, onCreated }: CreateTeamModalProps) {
  const [step, setStep] = useState<ModalStep>('blueprint');
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(TEAM_ICON_KEYS[0]);
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);
  const [dailyBudgetCap, setDailyBudgetCap] = useState('');
  const [requireApprovalThreshold, setRequireApprovalThreshold] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [hiringProgress, setHiringProgress] = useState({ done: 0, total: 0, current: '' });
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBlueprintSelect = (blueprintId: string) => {
    setSelectedBlueprint(blueprintId);
    const bp = BLUEPRINTS.find(b => b.id === blueprintId);
    if (bp) {
      setName(bp.defaults.name);
      setDescription(bp.defaults.description);
      setSelectedIcon(bp.defaults.icon);
      setSelectedColor(bp.defaults.color);
    }
    setStep('details');
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please enter a team name'); return; }
    setIsCreating(true);
    setError(null);

    try {
      const newTeam = await createTeam({
        name: name.trim(),
        description: description.trim() || 'A new AI workforce team',
        icon: selectedIcon,
        color: selectedColor,
        settings: {
          dailyBudgetCap: dailyBudgetCap ? parseFloat(dailyBudgetCap) : undefined,
          requireApprovalThreshold: requireApprovalThreshold ? parseFloat(requireApprovalThreshold) : undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (!newTeam) { setError('Failed to create team. Please try again.'); setIsCreating(false); return; }

      // Auto-hire agents for squad templates
      const agentIds = selectedBlueprint ? SQUAD_AGENTS[selectedBlueprint] : null;
      if (agentIds && agentIds.length > 0) {
        setStep('hiring');
        setHiringProgress({ done: 0, total: agentIds.length, current: '' });

        for (let i = 0; i < agentIds.length; i++) {
          const templateId = agentIds[i];
          setHiringProgress(p => ({ ...p, current: templateId.split('-').slice(1).join(' '), done: i }));
          try {
            await agentService.hireAgent({ team_id: newTeam.id, template_id: templateId });
          } catch {
            // Non-fatal — continue hiring the rest
          }
        }
      }

      resetAndClose();
      onCreated(newTeam, false);
    } catch (err: any) {
      setError(err.message || 'Failed to create team. Please try again.');
      setIsCreating(false);
    }
  };

  const resetAndClose = () => {
    setStep('blueprint');
    setSelectedBlueprint(null);
    setName(''); setDescription('');
    setSelectedIcon(TEAM_ICON_KEYS[0]);
    setSelectedColor(TEAM_COLORS[0]);
    setDailyBudgetCap(''); setRequireApprovalThreshold('');
    setIsCreating(false);
    setHiringProgress({ done: 0, total: 0, current: '' });
    onClose();
  };

  const accent = BLUEPRINTS.find(b => b.id === selectedBlueprint)?.accent ?? '#5A9E8F';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(4,9,12,0.88)' }}>
      <div
        className="relative w-full max-w-xl max-h-[90vh] overflow-hidden rounded-md border"
        style={{ background: '#0B1215', borderColor: '#1E2D30' }}
      >
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `${accent}60` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#162025' }}>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="mb-1">
              {step === 'blueprint' ? 'new workforce' : step === 'hiring' ? 'assembling team' : 'configure team'}
            </p>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#EAE6DF' }}>
              {step === 'blueprint' ? 'Choose a Blueprint' : step === 'hiring' ? 'Hiring Agents…' : 'Create New Team'}
            </h2>
          </div>
          {step !== 'hiring' && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded border transition-all"
              style={{ background: '#111A1D', borderColor: '#1E2D30', color: '#3A5056' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EAE6DF'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3A5056'; }}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="p-6">

            {/* ── Blueprint selection ── */}
            {step === 'blueprint' && (
              <div className="space-y-3">
                {BLUEPRINTS.map(({ id, name: bName, Icon, accent: bAccent, description: bDesc, features }) => (
                  <button
                    key={id}
                    onClick={() => handleBlueprintSelect(id)}
                    className="group w-full rounded-md border p-5 text-left transition-all"
                    style={{ background: '#111A1D', borderColor: '#1E2D30' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${bAccent}40`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E2D30'; }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border-2"
                        style={{ background: `${bAccent}12`, borderColor: bAccent }}
                      >
                        <Icon color={bAccent} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#EAE6DF' }} className="mb-1">
                          {bName}
                        </h3>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#4A6A72' }} className="mb-3">
                          {bDesc}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {features.map(f => (
                            <span
                              key={f}
                              className="rounded border px-2 py-0.5"
                              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: bAccent, borderColor: `${bAccent}30`, background: `${bAccent}0A` }}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <svg className="h-4 w-4 shrink-0 mt-1" style={{ color: '#2A3E44' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── Hiring progress ── */}
            {step === 'hiring' && (
              <div className="py-8 flex flex-col items-center gap-6">
                <div className="relative h-16 w-16">
                  <svg className="animate-spin h-16 w-16" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="28" stroke={`${accent}20`} strokeWidth="4" />
                    <path d="M32 4 A28 28 0 0 1 60 32" stroke={accent} strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: accent }}>
                    {hiringProgress.done}/{hiringProgress.total}
                  </span>
                </div>
                <div className="text-center">
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '15px', color: '#EAE6DF' }} className="mb-1">
                    Assembling your team
                  </p>
                  {hiringProgress.current && (
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#4A6A72' }}>
                      Hiring {hiringProgress.current}…
                    </p>
                  )}
                </div>
                {/* Progress bar */}
                <div className="w-full rounded-full h-1 bg-[#162025]">
                  <div
                    className="h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(hiringProgress.done / Math.max(hiringProgress.total, 1)) * 100}%`, background: accent }}
                  />
                </div>
              </div>
            )}

            {/* ── Details form ── */}
            {step === 'details' && (
              <div className="space-y-5">
                <div>
                  <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="block mb-2">
                    Team Name <span style={{ color: '#BF8A52' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., Intel Squad"
                    className="w-full rounded-md border bg-[#0B1215] px-4 py-2.5 text-[13px] text-[#D8D4CC] placeholder-[#2A3E44] outline-none transition-all"
                    style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${accent}50`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#1E2D30'; }}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="block mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What will this team focus on?"
                    rows={2}
                    className="w-full rounded-md border bg-[#0B1215] px-4 py-2.5 text-[13px] text-[#D8D4CC] placeholder-[#2A3E44] outline-none transition-all resize-none"
                    style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${accent}50`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#1E2D30'; }}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="block mb-2">
                    Team Symbol
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {TEAM_ICON_KEYS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setSelectedIcon(icon)}
                        className="flex h-10 items-center justify-center rounded border text-[16px] transition-all"
                        style={{
                          background: selectedIcon === icon ? `${selectedColor}14` : '#111A1D',
                          borderColor: selectedIcon === icon ? selectedColor : '#1E2D30',
                          color: selectedIcon === icon ? selectedColor : '#3A5056',
                          fontFamily: 'monospace',
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="block mb-2">
                    Team Color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {TEAM_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className="h-9 w-full rounded border-2 transition-all"
                        style={{
                          background: color,
                          borderColor: selectedColor === color ? '#EAE6DF' : 'transparent',
                          opacity: selectedColor === color ? 1 : 0.55,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-md border p-4" style={{ background: '#111A1D', borderColor: '#162025' }}>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#2E4248', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="mb-3">Preview</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-sm border-2 text-[18px]"
                      style={{ background: `${selectedColor}14`, borderColor: selectedColor, color: selectedColor, fontFamily: 'monospace' }}
                    >
                      {selectedIcon}
                    </div>
                    <div>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#EAE6DF' }}>
                        {name || 'Team Name'}
                      </p>
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056' }}>
                        {description || 'Team description'}
                      </p>
                    </div>
                  </div>
                  {selectedBlueprint && SQUAD_AGENTS[selectedBlueprint] && (
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#4A6A72', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #162025' }}>
                      {SQUAD_AGENTS[selectedBlueprint].length} specialist agents will be hired automatically
                    </p>
                  )}
                </div>

                {/* Budget */}
                <div className="border-t pt-5" style={{ borderColor: '#162025' }}>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="mb-4">Budget Settings</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Daily Budget Cap', value: dailyBudgetCap, setter: setDailyBudgetCap, placeholder: 'Unlimited', hint: 'Max spend per day' },
                      { label: 'Approval Threshold', value: requireApprovalThreshold, setter: setRequireApprovalThreshold, placeholder: 'None', hint: 'Require approval if exceeded' },
                    ].map(({ label, value, setter, placeholder, hint }) => (
                      <div key={label}>
                        <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="block mb-2">
                          {label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#2E4248' }}>$</span>
                          <input
                            type="number"
                            value={value}
                            onChange={e => setter(e.target.value)}
                            placeholder={placeholder}
                            className="w-full rounded-md border bg-[#0B1215] pl-7 pr-3 py-2 text-[12px] text-[#D8D4CC] placeholder-[#2A3E44] outline-none transition-all"
                            style={{ borderColor: '#1E2D30', fontFamily: "'IBM Plex Mono', monospace" }}
                            onFocus={e => { e.currentTarget.style.borderColor = `${accent}50`; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#1E2D30'; }}
                          />
                        </div>
                        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#2A3E44' }} className="mt-1">{hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {step !== 'hiring' && (
          <div className="border-t px-6 py-4" style={{ borderColor: '#162025' }}>
            {error && (
              <div className="mb-4 rounded border px-3 py-2 text-[12px]" style={{ background: '#9E5A5A10', borderColor: '#9E5A5A40', color: '#9E7A7A', fontFamily: "'IBM Plex Mono', monospace" }}>
                {error}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => { if (step === 'details') { setStep('blueprint'); setError(null); } else { onClose(); } }}
                disabled={isCreating}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#3A5056' }}
                className="transition-colors disabled:opacity-50"
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EAE6DF'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3A5056'; }}
              >
                {step === 'details' ? '← Back' : 'Cancel'}
              </button>

              {step === 'details' && (
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex items-center gap-2 rounded border px-5 py-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', background: `${accent}14`, borderColor: `${accent}50`, color: accent }}
                  onMouseEnter={e => { if (!isCreating) (e.currentTarget as HTMLButtonElement).style.background = `${accent}22`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accent}14`; }}
                >
                  {isCreating ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating…
                    </>
                  ) : 'Create Team →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
