'use client';

import { useState } from 'react';
import type { Assumption } from './LiveOffice';

interface AssumptionDialogProps {
  assumption: Assumption;
  onRespond: (response: string) => void;
}

export default function AssumptionDialog({ assumption, onRespond }: AssumptionDialogProps) {
  const [userResponse, setUserResponse] = useState('');
  const [isTraining, setIsTraining] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userResponse.trim()) {
      setIsTraining(true);

      // Show training animation for 2 seconds
      setTimeout(() => {
        onRespond(userResponse);
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fadeIn">
      <div className="glass rounded-2xl max-w-2xl w-full shadow-2xl shadow-[#6366F1]/20">
        {/* Header - Notification Style */}
        <div className="bg-gradient-to-r from-[#6366F1] to-[#818CF8] p-4 rounded-t-2xl flex items-center gap-3">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <div>
            <div className="text-white font-bold text-sm">Agent Needs Your Input</div>
            <div className="text-white/80 text-xs">Operation paused for clarification</div>
          </div>
        </div>

        {/* Agent Info */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={assumption.agent.photo_url}
              alt={assumption.agent.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <div className="text-white font-semibold">{assumption.agent.name}</div>
              <div className="text-sm text-slate-400">{assumption.agent.role}</div>
            </div>
          </div>

          {/* The Question */}
          <div className="glass-light rounded-lg p-4 mb-3">
            <div className="text-xs text-[#6366F1] uppercase tracking-wide mb-2 font-semibold">
              Question
            </div>
            <p className="text-slate-200 leading-relaxed">{assumption.question}</p>
          </div>

          {/* Context */}
          <div className="glass-light rounded-lg p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-semibold">
              Context
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{assumption.context}</p>
          </div>
        </div>

        {/* Response Area */}
        {!isTraining ? (
          <form onSubmit={handleSubmit} className="p-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Your Response
            </label>
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              placeholder="e.g., Minor. They are a pre-approved partner."
              rows={4}
              className="w-full px-4 py-3 bg-[#020617] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                type="submit"
                disabled={!userResponse.trim()}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  userResponse.trim()
                    ? 'bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Send Response
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {/* Training Animation */}
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="text-xl font-bold text-white mb-2 animate-pulse">
                Training {assumption.agent.name}...
              </div>
              <p className="text-slate-400 text-sm">
                Your response is being integrated into the agent's knowledge base
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-md mx-auto mt-6">
                <div className="h-2 bg-[#020617] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] animate-progressFill"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes progressFill {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .animate-progressFill {
          animation: progressFill 2s ease-out;
        }
      `}</style>
    </div>
  );
}
