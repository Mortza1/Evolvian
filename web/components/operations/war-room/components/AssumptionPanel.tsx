'use client';

import type { AssumptionData } from '../types';

const optionClass = (option: string) => {
  const lower = option.toLowerCase();
  if (['yes', 'y', 'proceed', 'continue', 'approve'].includes(lower))
    return 'px-4 py-2 bg-green-900/30 hover:bg-green-600/40 border border-green-600/50 hover:border-green-500 rounded text-sm text-green-100 transition-all disabled:opacity-50 font-medium';
  if (['no', 'n', 'cancel', 'decline'].includes(lower))
    return 'px-4 py-2 bg-red-900/30 hover:bg-red-600/40 border border-red-600/50 hover:border-red-500 rounded text-sm text-red-100 transition-all disabled:opacity-50 font-medium';
  if (['skip', 'maybe later', 'not sure'].includes(lower))
    return 'px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 rounded text-sm text-slate-300 transition-all disabled:opacity-50';
  if (lower.includes('critical') || lower.includes('urgent'))
    return 'px-4 py-2 bg-red-900/30 hover:bg-red-500/30 border border-red-500/50 hover:border-red-400 rounded text-sm text-red-200 transition-all disabled:opacity-50 font-semibold';
  if (lower.includes('minor') || lower.includes('low'))
    return 'px-4 py-2 bg-blue-900/30 hover:bg-blue-500/30 border border-blue-500/50 hover:border-blue-400 rounded text-sm text-blue-200 transition-all disabled:opacity-50';
  return 'px-4 py-2 bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 rounded text-sm text-white transition-all disabled:opacity-50';
};

interface AssumptionPanelProps {
  assumption: AssumptionData;
  answer: string;
  isSubmitting: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: (answer: string) => void;
}

export function AssumptionPanel({ assumption, answer, isSubmitting, onAnswerChange, onSubmit }: AssumptionPanelProps) {
  return (
    <div data-assumption-panel className="flex-shrink-0 border-t border-slate-800 bg-gradient-to-br from-amber-500/10 to-orange-500/10 animate-in slide-in-from-bottom">
      <div className="p-4">
        <div className="flex items-start gap-4 mb-4">
          {assumption.agentPhoto && (
            <img
              src={assumption.agentPhoto}
              alt={assumption.agentName}
              className="w-12 h-12 rounded-full object-cover border-2 border-amber-500 ring-2 ring-amber-500/50 flex-shrink-0"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs font-semibold text-amber-400">
                {assumption.agentName === 'Evo (Manager)' ? '🎯 MANAGER QUESTION' : '❓ AGENT QUESTION'}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                ['high', 'critical'].includes(assumption.priority)
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {assumption.priority.toUpperCase()}
              </span>
            </div>

            <h4 className="text-white font-semibold text-lg mb-1">{assumption.agentName} needs your input</h4>
            <p className="text-amber-100 text-base mb-2">{assumption.question}</p>
            {assumption.context && <p className="text-slate-400 text-sm mb-3">{assumption.context}</p>}

            {assumption.options.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {assumption.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => { onAnswerChange(option); onSubmit(option); }}
                    disabled={isSubmitting}
                    className={optionClass(option)}
                    title={`Quick reply: ${option} (${idx + 1})`}
                  >
                    {option}
                    {idx < 9 && <span className="ml-2 text-xs opacity-60">{idx + 1}</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={answer}
                onChange={(e) => onAnswerChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && answer.trim()) onSubmit(answer); }}
                placeholder={assumption.options.length > 0 ? 'Or type your own answer...' : 'Type your answer...'}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
              />
              <button
                onClick={() => answer.trim() && onSubmit(answer)}
                disabled={!answer.trim() || isSubmitting}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
