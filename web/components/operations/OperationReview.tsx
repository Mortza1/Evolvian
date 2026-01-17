'use client';

import { useState } from 'react';
import type { Agent } from '@/lib/agents';
import type { OperationResult } from './LiveOffice';

interface OperationReviewProps {
  result: OperationResult;
  agents: Agent[];
  documentName?: string;
  onComplete: (feedbackData?: any[]) => void;
}

export default function OperationReview({ result, agents, documentName, onComplete }: OperationReviewProps) {
  const [overallRating, setOverallRating] = useState(5);
  const [overallFeedback, setOverallFeedback] = useState('');

  const handleCompleteReview = () => {
    // Save overall feedback if provided
    const feedbackData = overallFeedback.trim() ? [{
      agentId: 'overall',
      rating: overallRating,
      comment: overallFeedback,
      evolutionTrigger: 'Operation completed successfully',
    }] : undefined;

    onComplete(feedbackData);
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Operation Complete</h1>
              <p className="text-sm text-slate-400">Review the results from your team</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-400">Time Taken</div>
                <div className="text-lg font-bold text-[#6366F1]">{result.time_taken} min</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Cost</div>
                <div className="text-lg font-bold text-[#FDE047]">${result.cost.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Team Summary */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Team</h2>
            <div className="flex items-center gap-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <img
                    src={agent.photo_url}
                    alt={agent.name}
                    className="w-10 h-10 rounded-lg object-cover"
                    title={agent.name}
                  />
                  <div>
                    <div className="text-sm font-medium text-white">{agent.name}</div>
                    <div className="text-xs text-slate-400">{agent.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Info */}
          {documentName && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Document</h2>
              </div>
              <p className="text-slate-300">{documentName}</p>
            </div>
          )}

          {/* Summary */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Summary</h2>
            <p className="text-slate-300 leading-relaxed">{result.summary}</p>
          </div>

          {/* Findings */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Key Findings
            </h3>
            <ul className="space-y-3">
              {result.findings.map((finding, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-[#6366F1] rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-slate-300">{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recommendations
            </h3>
            <ul className="space-y-3">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-slate-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Optional Feedback */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">
              Quality Feedback (Optional)
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Help your team improve by providing feedback on the quality of this work
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Overall Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setOverallRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <svg
                      className={`w-8 h-8 ${
                        star <= overallRating ? 'text-yellow-400 fill-current' : 'text-slate-600'
                      }`}
                      fill={star <= overallRating ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Comments
              </label>
              <textarea
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                placeholder="e.g., The analysis was thorough but could be more concise..."
                rows={3}
                className="w-full px-4 py-3 bg-[#020617] border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
              />
            </div>
          </div>

          {/* Complete Button */}
          <div className="flex gap-4">
            <button
              onClick={handleCompleteReview}
              className="flex-1 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all"
            >
              Complete & Save to Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
