'use client';

import type { EvoTaskAnalysis, EvoWorkflowSuggestion } from '@/lib/types/evo';

interface EvoTaskCardProps {
  analysis: EvoTaskAnalysis;
  workflow?: EvoWorkflowSuggestion;
  onCreateOperation?: () => void;
  onAnswerQuestion?: (question: string) => void;
}

export function EvoTaskCard({
  analysis,
  workflow,
  onCreateOperation,
  onAnswerQuestion,
}: EvoTaskCardProps) {
  const complexityColors = {
    simple: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    complex: 'bg-red-500/20 text-red-400 border-red-500/30',
    unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const hasQuestions = analysis.questions.length > 0;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-white">Task Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-md border ${
                complexityColors[analysis.estimated_complexity]
              }`}
            >
              {analysis.estimated_complexity}
            </span>
            <span className="text-xs text-slate-400">
              {Math.round(analysis.confidence * 100)}% confident
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Understanding */}
        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Understanding
          </h4>
          <p className="text-sm text-slate-200">{analysis.understanding}</p>
        </div>

        {/* Subtasks */}
        {analysis.subtasks.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Subtasks ({analysis.subtasks.length})
            </h4>
            <div className="space-y-2">
              {analysis.subtasks.map((subtask, i) => (
                <div
                  key={subtask.id || i}
                  className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{subtask.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{subtask.description}</p>
                    {subtask.agent_type && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded">
                        {subtask.agent_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Agents */}
        {analysis.suggested_agents.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Suggested Team Members
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.suggested_agents.map((agent, i) => (
                <div
                  key={i}
                  className="px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700"
                >
                  <p className="text-sm font-medium text-white">{agent.role}</p>
                  <p className="text-xs text-slate-400">{agent.specialty}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assumptions */}
        {analysis.assumptions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Assumptions
            </h4>
            <ul className="space-y-1">
              {analysis.assumptions.map((assumption, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-300 flex items-start gap-2"
                >
                  <span className="text-slate-500">•</span>
                  {assumption}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Questions */}
        {hasQuestions && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Questions for you ({analysis.questions.length})
            </h4>
            <ul className="space-y-2">
              {analysis.questions.map((question, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-200">{question}</p>
                    {onAnswerQuestion && (
                      <button
                        onClick={() => onAnswerQuestion(question)}
                        className="mt-1 text-xs text-amber-400 hover:text-amber-300"
                      >
                        Answer this →
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Workflow Preview */}
        {workflow && (
          <div className="border-t border-slate-700 pt-5">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Workflow: {workflow.title}
            </h4>
            <p className="text-sm text-slate-300 mb-3">{workflow.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-slate-300">
                  ${workflow.estimated_cost.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-slate-300">
                  {workflow.estimated_time_minutes} min
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                <span className="text-slate-300">
                  {workflow.steps.length} steps
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {onCreateOperation && !hasQuestions && (
        <div className="px-5 py-4 border-t border-slate-700 bg-slate-800/30">
          <button
            onClick={onCreateOperation}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Operation
          </button>
        </div>
      )}
    </div>
  );
}

export default EvoTaskCard;
