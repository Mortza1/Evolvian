'use client';

import type { AssumptionData } from '../types';

function optionStyle(option: string): { color: string; border: string; bg: string } {
  const lower = option.toLowerCase();
  if (['yes', 'y', 'proceed', 'continue', 'approve'].includes(lower))
    return { color: '#5A9E8F', border: '#5A9E8F40', bg: '#5A9E8F10' };
  if (['no', 'n', 'cancel', 'decline'].includes(lower))
    return { color: '#9E5A5A', border: '#9E5A5A40', bg: '#9E5A5A10' };
  if (['skip', 'maybe later', 'not sure'].includes(lower))
    return { color: '#3A5056', border: '#1E2D30', bg: 'transparent' };
  if (lower.includes('critical') || lower.includes('urgent'))
    return { color: '#9E5A5A', border: '#9E5A5A40', bg: '#9E5A5A10' };
  if (lower.includes('minor') || lower.includes('low'))
    return { color: '#7A8FA0', border: '#7A8FA030', bg: '#7A8FA010' };
  return { color: '#BF8A52', border: '#BF8A5240', bg: '#BF8A5210' };
}

interface AssumptionPanelProps {
  assumption: AssumptionData;
  answer: string;
  isSubmitting: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: (answer: string) => void;
}

export function AssumptionPanel({ assumption, answer, isSubmitting, onAnswerChange, onSubmit }: AssumptionPanelProps) {
  const isHigh = ['high', 'critical'].includes(assumption.priority);

  return (
    <div
      data-assumption-panel
      className="flex-shrink-0 border-t"
      style={{ borderColor: '#BF8A5240', background: '#0D1A14' }}
    >
      {/* Amber top accent */}
      <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #BF8A5260, #BF8A52, #BF8A5260)' }} />

      <div className="px-8 py-5">
        <div className="flex items-start gap-5">
          {/* Agent photo */}
          {assumption.agentPhoto && (
            <img
              src={assumption.agentPhoto}
              alt={assumption.agentName}
              className="h-12 w-12 shrink-0 rounded-sm object-cover border-2"
              style={{ borderColor: '#BF8A5250' }}
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Tags */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="rounded border px-2 py-0.5 text-[10px] uppercase"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52', borderColor: '#BF8A5240', background: '#BF8A5210', letterSpacing: '0.08em' }}
              >
                {assumption.agentName === 'Evo (Manager)' ? '◈ Manager' : '? Agent'}
              </span>
              <span
                className="rounded border px-2 py-0.5 text-[10px] uppercase"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: isHigh ? '#9E5A5A' : '#3A5056',
                  borderColor: isHigh ? '#9E5A5A30' : '#1E2D30',
                  background: isHigh ? '#9E5A5A10' : 'transparent',
                  letterSpacing: '0.08em',
                }}
              >
                {assumption.priority}
              </span>
            </div>

            {/* Question */}
            <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#EAE6DF' }} className="mb-1">
              {assumption.agentName} needs your input
            </h4>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', color: '#C8C4BC', lineHeight: '1.6' }} className="mb-1">
              {assumption.question}
            </p>
            {assumption.context && (
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#4A6A72' }} className="mb-3">
                {assumption.context}
              </p>
            )}

            {/* Quick replies */}
            {assumption.options.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {assumption.options.map((option, idx) => {
                  const s = optionStyle(option);
                  return (
                    <button
                      key={idx}
                      onClick={() => { onAnswerChange(option); onSubmit(option); }}
                      disabled={isSubmitting}
                      className="rounded border px-3 py-1.5 text-[12px] transition-all disabled:opacity-50"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: s.color, borderColor: s.border, background: s.bg }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      {option}
                      {idx < 9 && <span className="ml-2 opacity-40 text-[10px]">{idx + 1}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Free text */}
            <div className="flex gap-3">
              <input
                type="text"
                value={answer}
                onChange={(e) => onAnswerChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && answer.trim()) onSubmit(answer); }}
                placeholder={assumption.options.length > 0 ? 'Or type your own answer…' : 'Type your answer…'}
                disabled={isSubmitting}
                className="flex-1 rounded-md border bg-[#111A1D] px-4 py-2.5 text-[13px] text-[#D8D4CC] placeholder-[#2A3E44] outline-none transition-all disabled:opacity-50"
                style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#BF8A5250'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
              />
              <button
                onClick={() => answer.trim() && onSubmit(answer)}
                disabled={!answer.trim() || isSubmitting}
                className="rounded border px-5 py-2.5 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#BF8A5212', borderColor: '#BF8A5250', color: '#BF8A52' }}
                onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#BF8A5222'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#BF8A5212'; }}
              >
                {isSubmitting ? 'Submitting…' : 'Submit →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
