'use client';

import { useState } from 'react';
import { type HiredAgent, agentService } from '@/lib/services/agents';
import { syncPreferencesToGraph } from '@/lib/knowledge-graph';

interface AgentEvolutionModalProps {
  agent: HiredAgent;
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Tone & Voice',
  'Color Preference',
  'Target Audience',
  'Brand Values',
  'Content Style',
  'Design Aesthetic',
  'Communication Style',
  'Quality Standards',
];

export default function AgentEvolutionModal({
  agent,
  teamId,
  isOpen,
  onClose,
  onSuccess,
}: AgentEvolutionModalProps) {
  const [step, setStep] = useState<'input' | 'learning' | 'levelup' | 'complete'>('input');
  const [category, setCategory] = useState('');
  const [rule, setRule] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [newLevel, setNewLevel] = useState(agent.level || 1);

  if (!isOpen) return null;

  const currentLevel = agent.level || 1;
  const progress = agent.levelProgress || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !rule.trim()) return;

    setIsProcessing(true);
    setStep('learning');

    try {
      await agentService.submitFeedback(agent.id, {
        rating: 5,
        feedback: `[${category}] ${rule}`,
      });

      syncPreferencesToGraph(teamId);

      const newProgress = progress + 30;
      if (newProgress >= 100) {
        setNewLevel(currentLevel + 1);
        setShowLevelUpAnimation(true);
        setStep('levelup');
        setTimeout(() => {
          setTimeout(() => {
            setStep('complete');
            setIsProcessing(false);
          }, 1000);
        }, 2000);
      } else {
        setStep('complete');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error saving preference:', err);
      setStep('complete');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setCategory('');
    setRule('');
    setIsProcessing(false);
    setShowLevelUpAnimation(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(4,9,12,0.90)' }}>
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-md border"
        style={{ background: '#0B1215', borderColor: '#1E2D30' }}
      >
        {/* Teal top accent */}
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #5A9E8F40, #5A9E8F, #5A9E8F40)' }} />

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: '#162025' }}>
          <div className="flex items-center gap-4">
            {/* Agent avatar */}
            <div className="relative">
              {agent.photo_url ? (
                <img
                  src={agent.photo_url}
                  alt={agent.name}
                  className="h-14 w-14 rounded-sm object-cover border-2"
                  style={{ borderColor: '#5A9E8F' }}
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-sm border-2 text-[15px] font-bold"
                  style={{ background: '#5A9E8F18', borderColor: '#5A9E8F', color: '#5A9E8F', fontFamily: "'Syne', sans-serif" }}
                >
                  {agent.name.substring(0, 2).toUpperCase()}
                </div>
              )}

              {/* Level badge */}
              <div
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-sm text-[11px] font-bold transition-all duration-500"
                style={{
                  background: showLevelUpAnimation ? '#BF8A52' : '#BF8A5220',
                  borderColor: '#BF8A52',
                  border: '1px solid #BF8A52',
                  color: showLevelUpAnimation ? '#080E11' : '#BF8A52',
                  fontFamily: "'IBM Plex Mono', monospace",
                  transform: showLevelUpAnimation ? 'scale(1.3)' : 'scale(1)',
                }}
              >
                {showLevelUpAnimation ? newLevel : currentLevel}
              </div>
            </div>

            <div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#EAE6DF' }}>
                {agent.name}
              </h2>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#3A5056' }}>
                {agent.role}
              </p>

              {/* XP progress bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 w-28 overflow-hidden rounded-full" style={{ background: '#162025' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(progress, 100)}%`, background: '#5A9E8F' }}
                  />
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#2E4248' }}>
                  {progress}% XP
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="flex h-8 w-8 items-center justify-center rounded border transition-all disabled:opacity-30"
            style={{ background: '#111A1D', borderColor: '#1E2D30', color: '#3A5056' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EAE6DF'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3A5056'; }}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <div className="p-6">

          {/* ── STEP: INPUT ── */}
          {step === 'input' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="mb-1">
                  evolve agent
                </p>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#EAE6DF' }} className="mb-1">
                  Teach {agent.name} a New Preference
                </h3>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#4A6A72', lineHeight: '1.6' }}>
                  Help {agent.name} learn from this task. What adjustment should they remember next time?
                </p>
              </div>

              {/* Category — pill selector */}
              <div>
                <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="block mb-2">
                  Preference Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className="rounded border px-3 py-1.5 text-[11px] transition-all"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        background: category === cat ? '#5A9E8F18' : '#111A1D',
                        borderColor: category === cat ? '#5A9E8F' : '#1E2D30',
                        color: category === cat ? '#5A9E8F' : '#3A5056',
                      }}
                      onMouseEnter={e => { if (category !== cat) (e.currentTarget as HTMLButtonElement).style.borderColor = '#2E4248'; }}
                      onMouseLeave={e => { if (category !== cat) (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E2D30'; }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {!category && (
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#2A3E44' }} className="mt-2">
                    Select a category above
                  </p>
                )}
              </div>

              {/* Learning rule */}
              <div>
                <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="block mb-2">
                  Learning Rule
                </label>
                <textarea
                  value={rule}
                  onChange={e => setRule(e.target.value)}
                  placeholder={`e.g. "Always use Elite Authority tone with 10% more conversational edge"`}
                  rows={3}
                  required
                  className="w-full rounded-md border bg-[#080E11] px-4 py-3 text-[13px] text-[#D8D4CC] placeholder-[#2A3E44] outline-none transition-all resize-none"
                  style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif", lineHeight: '1.6' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1E2D30'; }}
                />
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#2A3E44' }} className="mt-1.5">
                  This rule will be applied to all future tasks for this agent.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border px-5 py-2.5 text-[12px] transition-all"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#111A1D', borderColor: '#1E2D30', color: '#3A5056' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EAE6DF'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#2E4248'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3A5056'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E2D30'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!category || !rule.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded border py-2.5 text-[12px] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F14', borderColor: '#5A9E8F50', color: '#5A9E8F' }}
                  onMouseEnter={e => { if (category && rule.trim()) (e.currentTarget as HTMLButtonElement).style.background = '#5A9E8F22'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5A9E8F14'; }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Teach &amp; Evolve →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP: LEARNING ── */}
          {step === 'learning' && (
            <div className="py-14 text-center">
              {/* Teal ring spinner */}
              <div className="relative mx-auto mb-6 h-16 w-16">
                <div className="absolute inset-0 rounded-sm border border-[#5A9E8F]/15" />
                <div className="absolute inset-0 rounded-sm border border-[#5A9E8F]/30 border-t-[#5A9E8F] animate-spin" />
                {/* Inner static square */}
                <div className="absolute inset-3 rounded-sm" style={{ background: '#5A9E8F12', border: '1px solid #5A9E8F30' }} />
              </div>

              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="mb-2">
                processing
              </p>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#EAE6DF' }} className="mb-2">
                Integrating New Preference…
              </h3>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#4A6A72' }}>
                {agent.name} is updating their knowledge base
              </p>

              {/* Animated dots */}
              <div className="mt-6 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="block h-1.5 w-1.5 rounded-full animate-typing-dot"
                    style={{ background: '#5A9E8F', animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: LEVEL UP ── */}
          {step === 'levelup' && (
            <div className="py-12 text-center">
              {/* Geometric level-up display */}
              <div className="relative mx-auto mb-8 h-32 w-32">
                {/* Outer ping ring */}
                <div className="absolute inset-0 rounded-sm border-2 border-[#BF8A52] animate-ping opacity-40" />
                {/* Static border */}
                <div className="absolute inset-0 rounded-sm border-2" style={{ borderColor: '#BF8A52' }} />
                {/* Fill */}
                <div
                  className="absolute inset-1 rounded-sm flex items-center justify-center"
                  style={{ background: '#BF8A5218' }}
                >
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '48px', color: '#BF8A52', lineHeight: 1 }}>
                    {newLevel}
                  </span>
                </div>
              </div>

              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#BF8A52', textTransform: 'uppercase', letterSpacing: '0.2em' }} className="mb-2">
                Level Up
              </p>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '22px', color: '#EAE6DF' }} className="mb-1">
                {agent.name} reached Level {newLevel}
              </h3>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#3A5056' }}>
                Accuracy increased · Knowledge expanded · Performance enhanced
              </p>
            </div>
          )}

          {/* ── STEP: COMPLETE ── */}
          {step === 'complete' && (
            <div className="space-y-5">
              {/* Success mark */}
              <div className="py-6 text-center">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-sm border-2"
                  style={{ background: '#5A9E8F12', borderColor: '#5A9E8F' }}
                >
                  <svg className="h-6 w-6" fill="none" stroke="#5A9E8F" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#EAE6DF' }} className="mb-1">
                  Learning Complete
                </h3>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#4A6A72' }}>
                  {agent.name} gained {showLevelUpAnimation ? 'a level' : '30 XP'}
                </p>
              </div>

              {/* Learned rule summary */}
              <div
                className="rounded-md border p-4"
                style={{ background: '#080E11', borderColor: '#1E2D30' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border"
                    style={{ background: '#5A9E8F0A', borderColor: '#5A9E8F30' }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="#5A9E8F" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="rounded border px-2 py-0.5 text-[10px] inline-block mb-2"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#5A9E8F', borderColor: '#5A9E8F30', background: '#5A9E8F0A' }}
                    >
                      {category}
                    </p>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#C8C4BC', lineHeight: '1.5' }}>
                      {rule}
                    </p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }} className="mt-2">
                      Added to Neural Vault · Confidence: 95%
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="flex w-full items-center justify-center gap-2 rounded border py-2.5 text-[12px] transition-all"
                style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F14', borderColor: '#5A9E8F50', color: '#5A9E8F' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5A9E8F22'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5A9E8F14'; }}
              >
                Done →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
