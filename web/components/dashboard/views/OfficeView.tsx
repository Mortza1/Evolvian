'use client';

import { useState } from 'react';
import { useTeamAgents, type HiredAgent } from '@/lib/services/agents';
import {
  useEvolutionStats,
  useAgentPerformance,
  formatFitness,
  getFitnessColor,
  formatTaskType,
  getSuggestionIcon,
} from '@/lib/services/evolution';
import AgentEvolutionModal from '@/components/office/AgentEvolutionModal';

interface OfficeViewProps {
  teamId: string;
}

export default function OfficeView({ teamId }: OfficeViewProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [evolvingAgent, setEvolvingAgent] = useState<HiredAgent | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);

  // Fetch team agents from API
  const {
    agents: employees,
    isLoading,
    error,
    refresh: refreshEmployees,
  } = useTeamAgents({ teamId: parseInt(teamId, 10), autoFetch: true });

  // Fetch evolution stats
  const {
    taskTypes,
    statsByType,
    isLoading: evolutionLoading,
    refresh: refreshEvolution,
  } = useEvolutionStats({ teamId: parseInt(teamId, 10), autoFetch: true });

  // Fetch agent performance data
  const {
    performanceByName,
  } = useAgentPerformance({ teamId: parseInt(teamId, 10), autoFetch: true });

  const handleEvolveAgent = (agent: HiredAgent) => {
    setEvolvingAgent(agent);
  };

  const handleEvolutionComplete = () => {
    refreshEmployees(); // Refresh the list from API
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">The Office</h1>
          <p className="text-slate-400">Manage your workforce</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-slate-700 rounded-xl" />
                <div className="w-16 h-6 bg-slate-700 rounded-full" />
              </div>
              <div className="h-6 bg-slate-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-4" />
              <div className="h-2 bg-slate-700 rounded mb-4" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="h-16 bg-slate-700 rounded-lg" />
                <div className="h-16 bg-slate-700 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">The Office</h1>
          <p className="text-slate-400">Manage your workforce</p>
        </div>
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => refreshEmployees()}
            className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#5558E3] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state - no agents hired for this team
  if (employees.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">The Office</h1>
          <p className="text-slate-400">Manage your workforce</p>
        </div>

        <div className="glass rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3">Your Office is Empty</h3>
          <p className="text-slate-400 text-base mb-6 max-w-md mx-auto">
            You haven't hired any agents yet. Head to the Agent Store to build your team and start running operations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">The Office</h1>
        <p className="text-slate-400">Manage your workforce</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-white mb-1">{employees.length}</div>
          <div className="text-sm text-slate-400">Total Employees</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {employees.filter(e => e.is_online).length}
          </div>
          <div className="text-sm text-slate-400">Currently Online</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-[#FDE047] mb-1">
            ${employees.reduce((acc, e) => acc + e.cost_per_hour, 0).toFixed(2)}
          </div>
          <div className="text-sm text-slate-400">Total Hourly Cost</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-[#6366F1] mb-1">
            {employees.reduce((acc, e) => acc + (e.skills?.length || 0), 0)}
          </div>
          <div className="text-sm text-slate-400">Skills Learned</div>
        </div>
      </div>

      {/* Evolution Insights Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#FDE047]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Evolution Insights
            </h2>
            <p className="text-sm text-slate-400">Workflow performance and optimization suggestions</p>
          </div>
          <button
            onClick={() => refreshEvolution()}
            className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {evolutionLoading ? (
          <div className="glass rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-24 bg-slate-700 rounded-lg" />
              <div className="h-24 bg-slate-700 rounded-lg" />
              <div className="h-24 bg-slate-700 rounded-lg" />
            </div>
          </div>
        ) : taskTypes.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">No workflow executions yet. Run some operations to see evolution insights.</p>
          </div>
        ) : (
          <div className="glass rounded-xl p-6">
            {/* Task Type Selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSelectedTaskType(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedTaskType === null
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                All Types
              </button>
              {taskTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedTaskType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTaskType === type
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {formatTaskType(type)}
                </button>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {(selectedTaskType ? [selectedTaskType] : taskTypes).map((type) => {
                const stats = statsByType[type];
                if (!stats) return null;

                return (
                  <div
                    key={type}
                    className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">{formatTaskType(type)}</h3>
                      <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-300">
                        {stats.total_executions} runs
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Quality</span>
                        <span className={getFitnessColor(stats.avg_quality)}>
                          {formatFitness(stats.avg_quality)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Cost</span>
                        <span className="text-[#FDE047]">${stats.avg_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Unique Workflows</span>
                        <span className="text-white">{stats.unique_workflows}</span>
                      </div>
                    </div>

                    {stats.best_workflow && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <div className="text-xs text-slate-400 mb-1">Best Workflow</div>
                        <div className="flex items-center justify-between">
                          <code className="text-xs text-[#6366F1] bg-slate-900/50 px-1.5 py-0.5 rounded">
                            {stats.best_workflow.signature.substring(0, 8)}...
                          </code>
                          <span className={`text-sm font-medium ${getFitnessColor(stats.best_workflow.fitness_score)}`}>
                            {formatFitness(stats.best_workflow.fitness_score)} fit
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {stats.best_workflow.agents.length} agents • {stats.best_workflow.execution_count} runs
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Top Workflows Table */}
            {selectedTaskType && statsByType[selectedTaskType]?.top_workflows?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Top Performing Workflows</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700/50">
                        <th className="pb-2 font-medium">Signature</th>
                        <th className="pb-2 font-medium">Agents</th>
                        <th className="pb-2 font-medium text-right">Quality</th>
                        <th className="pb-2 font-medium text-right">Cost</th>
                        <th className="pb-2 font-medium text-right">Fitness</th>
                        <th className="pb-2 font-medium text-right">Runs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsByType[selectedTaskType].top_workflows.map((workflow, idx) => (
                        <tr key={workflow.signature} className="border-b border-slate-800/50">
                          <td className="py-2">
                            <code className="text-xs text-[#6366F1]">
                              {idx === 0 && '🏆 '}
                              {workflow.signature.substring(0, 8)}...
                            </code>
                          </td>
                          <td className="py-2 text-slate-300">
                            {workflow.agents.slice(0, 2).join(', ')}
                            {workflow.agents.length > 2 && ` +${workflow.agents.length - 2}`}
                          </td>
                          <td className={`py-2 text-right ${getFitnessColor(workflow.avg_quality_score)}`}>
                            {formatFitness(workflow.avg_quality_score)}
                          </td>
                          <td className="py-2 text-right text-[#FDE047]">
                            ${workflow.avg_cost.toFixed(2)}
                          </td>
                          <td className={`py-2 text-right font-medium ${getFitnessColor(workflow.fitness_score)}`}>
                            {formatFitness(workflow.fitness_score)}
                          </td>
                          <td className="py-2 text-right text-slate-400">
                            {workflow.execution_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((employee) => (
          <div
            key={employee.id}
            className="glass rounded-xl p-6 hover:bg-[#1E293B]/80 transition-all cursor-pointer"
            onClick={() => setSelectedEmployee(employee.id)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {employee.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#FDE047] rounded-full flex items-center justify-center text-xs font-bold text-[#020617]">
                  {employee.level || 1}
                </div>
              </div>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  employee.is_online
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    employee.is_online ? 'bg-green-500 animate-pulse' : 'bg-slate-600'
                  }`}
                ></div>
                {employee.is_online ? 'online' : 'offline'}
              </div>
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-white">{employee.name}</h3>
              {performanceByName[employee.name]?.total_executions > 0 &&
               performanceByName[employee.name] === Object.values(performanceByName).sort((a, b) => b.avg_quality - a.avg_quality)[0] && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                  MVP
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mb-4">{employee.role}</p>

            {/* XP Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Level Progress</span>
                <span>{Math.round(employee.levelProgress || 0)}%</span>
              </div>
              <div className="w-full h-2 bg-[#020617]/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-500"
                  style={{ width: `${employee.levelProgress || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            {(() => {
              const perf = performanceByName[employee.name];
              return (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-[#020617]/30 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-white">{employee.tasks_completed}</div>
                    <div className="text-xs text-slate-400">Tasks</div>
                  </div>
                  <div className="bg-[#020617]/30 rounded-lg p-2 text-center">
                    <div className={`text-lg font-bold ${employee.rating >= 4.0 ? 'text-green-400' : employee.rating >= 3.0 ? 'text-yellow-400' : 'text-orange-400'}`}>
                      {employee.rating.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-400">Rating</div>
                  </div>
                  <div className="bg-[#020617]/30 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-[#6366F1]">{Math.round(employee.accuracy)}%</div>
                    <div className="text-xs text-slate-400">Success</div>
                  </div>
                  {perf && perf.total_executions > 0 && (
                    <div className="col-span-3 flex items-center justify-center gap-2 text-xs mt-1">
                      <span className={
                        perf.trend === 'improving' ? 'text-green-400' :
                        perf.trend === 'declining' ? 'text-red-400' :
                        'text-slate-500'
                      }>
                        {perf.trend === 'improving' ? '↑' : perf.trend === 'declining' ? '↓' : '→'}
                        {' '}{perf.trend}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-500">
                        {Math.round(perf.avg_quality * 100)}% avg quality
                      </span>
                      {perf.rated_count > 0 && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="text-[#FDE047]">{perf.user_avg_rating.toFixed(1)} user avg</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEvolveAgent(employee);
                }}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-[#FDE047] to-[#F59E0B] hover:shadow-lg hover:shadow-[#FDE047]/30 text-[#020617] rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Adjust & Evolve
              </button>
              <button className="px-3 py-2 bg-[#1E293B] hover:bg-[#2D3B52] text-white border border-slate-700 rounded-lg text-sm transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            {/* Salary */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
              <span className="text-xs text-slate-400">Hourly Rate</span>
              <span className="text-sm font-bold text-[#FDE047]">${employee.cost_per_hour.toFixed(2)}/hr</span>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Evolution Modal */}
      {evolvingAgent && (
        <AgentEvolutionModal
          agent={evolvingAgent}
          teamId={teamId}
          isOpen={!!evolvingAgent}
          onClose={() => setEvolvingAgent(null)}
          onSuccess={handleEvolutionComplete}
        />
      )}
    </div>
  );
}
