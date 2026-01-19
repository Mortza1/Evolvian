'use client';

import { useState, useEffect } from 'react';
import { getHiredAgents } from '@/lib/agents';

interface SpecialistProgress {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  totalQuestions: number;
  answeredQuestions: number;
  certainty: number; // 0-100
  status: 'pending' | 'in_progress' | 'complete' | 'blocked';
  blockingIssue?: string;
}

interface AlignmentScoreProps {
  projectId?: string;
  teamId?: string;
  onCommence?: () => void;
}

export default function AlignmentScore({ projectId, teamId, onCommence }: AlignmentScoreProps) {
  const [specialists, setSpecialists] = useState<SpecialistProgress[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!teamId) return;

    const hiredAgents = getHiredAgents(teamId);
    const brandingAgents = hiredAgents.filter(a => a.category === 'Branding');

    // Map hired branding agents to specialist progress
    const specialistMap: Record<string, { avatar: string; color: string; totalQuestions: number; status: 'pending' | 'in_progress' | 'complete' | 'blocked'; blockingIssue?: string }> = {
      'agent-031': { // Aurora
        avatar: '🎨',
        color: '#EC4899',
        totalQuestions: 3,
        status: 'pending',
      },
      'agent-032': { // Atlas
        avatar: '🎯',
        color: '#8B5CF6',
        totalQuestions: 4,
        status: 'pending',
      },
      'agent-033': { // Lexis
        avatar: '✍️',
        color: '#10B981',
        totalQuestions: 2,
        status: 'pending',
      },
      'agent-034': { // Sage
        avatar: '📝',
        color: '#F59E0B',
        totalQuestions: 3,
        status: 'blocked',
        blockingIssue: 'Waiting for Color and Strategy decisions',
      },
    };

    const mappedSpecialists: SpecialistProgress[] = brandingAgents.map((agent) => {
      const data = specialistMap[agent.id];
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        avatar: data?.avatar || '👤',
        color: data?.color || '#6366F1',
        totalQuestions: data?.totalQuestions || 0,
        answeredQuestions: 0, // TODO: track actual answered questions
        certainty: 0, // TODO: calculate from answered questions
        status: data?.status || 'pending',
        blockingIssue: data?.blockingIssue,
      };
    });

    setSpecialists(mappedSpecialists);

    // Calculate overall alignment score
    const totalCertainty = mappedSpecialists.reduce((sum, s) => sum + s.certainty, 0);
    const avgCertainty = mappedSpecialists.length > 0 ? totalCertainty / mappedSpecialists.length : 0;
    setOverallScore(Math.round(avgCertainty));
  }, [projectId, teamId]);

  const canCommence = overallScore >= 80;
  const pendingCount = specialists.filter(s => s.status === 'pending' || s.status === 'in_progress').length;
  const blockedCount = specialists.filter(s => s.status === 'blocked').length;
  const completedCount = specialists.filter(s => s.status === 'complete').length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-pink-400';
    if (score >= 50) return 'text-purple-400';
    return 'text-pink-300';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'from-pink-500 via-purple-500 to-pink-500';
    if (score >= 50) return 'from-purple-500 to-pink-400';
    return 'from-pink-400 to-purple-400';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'in_progress':
        return (
          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        );
      case 'blocked':
        return (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="glass rounded-xl overflow-hidden border border-pink-500/20 shadow-xl shadow-pink-500/10">
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-purple-900/40 border-b border-pink-500/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-pink-500/5 animate-pulse"></div>
        <div className="relative flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Project Alignment Score
            </h3>
            <p className="text-sm text-pink-200/70">
              Discovery phase completion - {completedCount}/{specialists.length} specialists ready
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg
              className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Score Display */}
        <div className="flex items-center gap-6">
          {/* Circular Progress */}
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-700"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${overallScore * 2.51} 251`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={overallScore >= 80 ? 'text-green-500' : overallScore >= 50 ? 'text-yellow-500' : 'text-red-500'} stopColor="currentColor" />
                  <stop offset="100%" className={overallScore >= 80 ? 'text-emerald-500' : overallScore >= 50 ? 'text-amber-500' : 'text-rose-500'} stopColor="currentColor" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}%
              </span>
            </div>
          </div>

          {/* Status Summary */}
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Pending</div>
                <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Blocked</div>
                <div className="text-2xl font-bold text-red-400">{blockedCount}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Complete</div>
                <div className="text-2xl font-bold text-green-400">{completedCount}</div>
              </div>
            </div>

            {/* Status Bar */}
            <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getScoreBgColor(overallScore)} transition-all duration-500`}
                style={{ width: `${overallScore}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Threshold Indicator */}
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {canCommence ? (
                <span className="flex items-center gap-2 text-green-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ready to commence operation
                </span>
              ) : (
                <span className="flex items-center gap-2 text-yellow-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Need {80 - overallScore}% more alignment to proceed
                </span>
              )}
            </span>
            <span className="text-slate-500">Threshold: 80%</span>
          </div>
        </div>
      </div>

      {/* Specialist Details */}
      {isExpanded && (
        <div className="p-6">
          <div className="space-y-4">
            {specialists.map((specialist) => (
              <div
                key={specialist.id}
                className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  {getStatusIcon(specialist.status)}

                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{ backgroundColor: specialist.color + '30' }}
                  >
                    {specialist.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-white">{specialist.name}</h4>
                      <span className={`text-sm font-bold ${getScoreColor(specialist.certainty)}`}>
                        {specialist.certainty}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{specialist.role}</p>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r transition-all duration-500"
                          style={{
                            width: `${specialist.certainty}%`,
                            background: `linear-gradient(to right, ${specialist.color}, ${specialist.color}90)`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-500">
                        {specialist.answeredQuestions}/{specialist.totalQuestions}
                      </span>
                    </div>

                    {/* Blocking Issue */}
                    {specialist.blockingIssue && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-red-400">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{specialist.blockingIssue}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="mt-6">
            <button
              onClick={onCommence}
              disabled={!canCommence}
              className={`group w-full py-4 px-4 rounded-lg font-bold transition-all duration-300 relative overflow-hidden ${
                canCommence
                  ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white hover:shadow-2xl hover:shadow-pink-500/50 hover:scale-[1.02] animate-pulse'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              {canCommence && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              )}
              {canCommence ? (
                <span className="relative flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Commence Operation
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Complete Discovery to Unlock ({80 - overallScore}% remaining)
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
