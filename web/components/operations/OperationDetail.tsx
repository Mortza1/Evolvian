'use client';

import { useState } from 'react';
import { getOperationById, type StoredOperation } from '@/lib/operations-storage';

interface OperationDetailProps {
  operationId: string;
  onBack: () => void;
}

export default function OperationDetail({ operationId, onBack }: OperationDetailProps) {
  const operation = getOperationById(operationId);
  const [selectedAgentIndex, setSelectedAgentIndex] = useState<number | null>(null);

  if (!operation) {
    return (
      <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">Operation Not Found</h2>
          <p className="text-slate-400 mb-6">The operation you're looking for doesn't exist.</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#5558E3] transition-colors"
          >
            Back to Ledger
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusColor = (status: StoredOperation['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#1E293B] rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{operation.config.title}</h1>
              <p className="text-sm text-slate-400 font-mono">{operation.id}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(operation.status)}`}>
              {operation.status.replace('_', ' ')}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="glass rounded-lg p-4">
              <div className="text-xs text-slate-400 mb-1">Rulebook</div>
              <div className="text-sm font-bold text-white uppercase">{operation.config.rulebook}</div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="text-xs text-slate-400 mb-1">Team Size</div>
              <div className="text-sm font-bold text-white">{operation.team.length} agents</div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="text-xs text-slate-400 mb-1">Cost</div>
              <div className="text-sm font-bold text-[#FDE047]">${operation.cost.toFixed(2)}</div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="text-xs text-slate-400 mb-1">Time Taken</div>
              <div className="text-sm font-bold text-white">{operation.timeTaken} min</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Operation Info */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Operation Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Started:</span>
                <span className="ml-2 text-white">{formatDate(operation.timestamp)}</span>
              </div>
              {operation.config.document && (
                <div>
                  <span className="text-slate-400">Document:</span>
                  <span className="ml-2 text-white">{operation.config.document.name}</span>
                </div>
              )}
              {operation.config.context && (
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-1">Context:</span>
                  <p className="text-white">{operation.config.context}</p>
                </div>
              )}
            </div>
          </div>

          {/* Process Audit - Workflow Visualization */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Process Audit</h2>
              <span className="text-xs text-slate-400">Click on any agent to view their work</span>
            </div>

            {/* Workflow Graph */}
            <div className="relative">
              <div className="flex items-center justify-center gap-4 py-8">
                {operation.agentContributions.map((contribution, index) => (
                  <div key={index} className="flex items-center">
                    {/* Agent Node */}
                    <button
                      onClick={() => setSelectedAgentIndex(selectedAgentIndex === index ? null : index)}
                      className={`relative group transition-all ${
                        selectedAgentIndex === index
                          ? 'scale-110 z-10'
                          : 'hover:scale-105'
                      }`}
                    >
                      <div
                        className={`w-20 h-20 rounded-xl border-2 transition-all ${
                          selectedAgentIndex === index
                            ? 'border-[#6366F1] ring-4 ring-[#6366F1]/30'
                            : 'border-slate-700 hover:border-slate-600'
                        } ${
                          contribution.status === 'completed'
                            ? 'bg-green-500/10'
                            : contribution.status === 'failed'
                            ? 'bg-red-500/10'
                            : 'bg-slate-800/50'
                        }`}
                      >
                        <img
                          src={contribution.agent.photo_url}
                          alt={contribution.agent.name}
                          className="w-full h-full rounded-xl object-cover"
                        />
                        {/* Status Badge */}
                        {contribution.status === 'completed' && (
                          <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-[#020617] flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <div className="text-xs font-semibold text-white">{contribution.agent.name}</div>
                        <div className="text-xs text-slate-400">{Math.floor(contribution.timeTaken / 60)}m</div>
                      </div>
                    </button>

                    {/* Arrow */}
                    {index < operation.agentContributions.length - 1 && (
                      <svg className="w-8 h-8 text-slate-700 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {/* Selected Agent Detail */}
              {selectedAgentIndex !== null && (
                <div className="mt-6 p-5 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-xl">
                  <div className="flex items-start gap-4">
                    <img
                      src={operation.agentContributions[selectedAgentIndex].agent.photo_url}
                      alt={operation.agentContributions[selectedAgentIndex].agent.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {operation.agentContributions[selectedAgentIndex].agent.name}
                      </h3>
                      <p className="text-sm text-slate-400 mb-3">
                        {operation.agentContributions[selectedAgentIndex].agent.role}
                      </p>
                      <p className="text-sm text-slate-300 mb-4">
                        <strong>Task:</strong> {operation.agentContributions[selectedAgentIndex].task}
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-[#020617]/50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Input</div>
                          <div className="text-sm text-slate-200">
                            {operation.agentContributions[selectedAgentIndex].input}
                          </div>
                        </div>
                        <div className="p-3 bg-[#020617]/50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Output</div>
                          <div className="text-sm text-slate-200">
                            {operation.agentContributions[selectedAgentIndex].output}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                        <span>⏱️ {Math.floor(operation.agentContributions[selectedAgentIndex].timeTaken / 60)}m {operation.agentContributions[selectedAgentIndex].timeTaken % 60}s</span>
                        <span>💰 ${(operation.agentContributions[selectedAgentIndex].agent.price_per_hour * operation.agentContributions[selectedAgentIndex].timeTaken / 3600).toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Team Members & Contributions */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Agent Contributions</h2>
            <div className="space-y-4">
              {operation.agentContributions.map((contribution, index) => (
                <div key={index} className="glass-light rounded-lg p-4">
                  <div className="flex items-start gap-4 mb-3">
                    <img
                      src={contribution.agent.photo_url}
                      alt={contribution.agent.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-white">{contribution.agent.name}</div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          contribution.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : contribution.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {contribution.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">{contribution.agent.role}</div>
                      <div className="text-sm text-slate-300 mt-2">{contribution.task}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                    <div>
                      <div className="text-slate-500 mb-1">Input Received</div>
                      <div className="text-slate-300 bg-[#020617]/50 p-2 rounded">{contribution.input}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">Output Delivered</div>
                      <div className="text-slate-300 bg-[#020617]/50 p-2 rounded">{contribution.output}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                    <span>Time: {Math.floor(contribution.timeTaken / 60)}m {contribution.timeTaken % 60}s</span>
                    <span>Cost: ${(contribution.agent.price_per_hour * contribution.timeTaken / 3600).toFixed(3)}</span>
                  </div>

                  {/* User Feedback for this agent */}
                  {operation.userFeedback?.find(f => f.agentId === contribution.agent.id) && (
                    <div className="mt-3 border-t border-slate-700/50 pt-3">
                      <div className="text-xs font-semibold text-[#6366F1] mb-2">User Feedback</div>
                      {(() => {
                        const feedback = operation.userFeedback.find(f => f.agentId === contribution.agent.id)!;
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex gap-0.5">
                                {[...Array(feedback.rating)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className="w-3 h-3 text-yellow-400 fill-current"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              {feedback.evolutionTrigger && (
                                <span className="text-xs text-[#FDE047]">✨ Learned: {feedback.evolutionTrigger}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300">{feedback.comment}</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {operation.status === 'completed' && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Final Results</h2>

              {/* Summary */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Summary</h3>
                <p className="text-slate-200 leading-relaxed">{operation.result.summary}</p>
              </div>

              {/* Findings */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Key Findings
                </h3>
                <ul className="space-y-2">
                  {operation.result.findings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-[#6366F1] rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-slate-300">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {operation.result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-slate-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Evolution Summary */}
          {operation.userFeedback && operation.userFeedback.length > 0 && (
            <div className="glass rounded-xl p-6 bg-gradient-to-br from-[#6366F1]/10 to-[#FDE047]/10 border border-[#6366F1]/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#FDE047] flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white mb-3">Evolution Summary</h2>
                  <p className="text-slate-300 mb-4">
                    Based on this operation, your team has learned and evolved:
                  </p>

                  <div className="space-y-3">
                    {operation.userFeedback
                      .filter(f => f.evolutionTrigger)
                      .map((feedback, index) => {
                        const agent = operation.team.find(a => a.id === feedback.agentId);
                        return (
                          <div key={index} className="flex items-start gap-3 p-3 bg-[#020617]/50 rounded-lg">
                            <div className="w-10 h-10 rounded-full flex-shrink-0">
                              {agent && (
                                <img
                                  src={agent.photo_url}
                                  alt={agent.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-white mb-1">
                                {agent?.name || 'Team Member'}
                              </div>
                              <div className="text-sm text-[#FDE047] mb-1">
                                ✨ {feedback.evolutionTrigger}
                              </div>
                              <div className="text-xs text-slate-400">
                                Accuracy for future tasks in this domain: <span className="text-[#10B981] font-semibold">+5%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(feedback.rating)].map((_, i) => (
                                <svg
                                  key={i}
                                  className="w-4 h-4 text-yellow-400 fill-current"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {operation.userFeedback.filter(f => f.evolutionTrigger).length === 0 && (
                    <div className="text-sm text-slate-400 italic">
                      No evolution triggers from this operation. Leave detailed feedback to help your team learn and improve.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
