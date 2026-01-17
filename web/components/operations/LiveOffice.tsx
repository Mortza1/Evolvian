'use client';

import { useState, useEffect } from 'react';
import type { Agent } from '@/lib/agents';
import type { OperationConfig } from './OperationDashboard';

interface LiveOfficeProps {
  agents: Agent[];
  config: OperationConfig;
  onAssumption: (assumption: Assumption) => void;
  onComplete: (result: OperationResult) => void;
}

export interface Assumption {
  agent: Agent;
  question: string;
  context: string;
}

export interface OperationResult {
  summary: string;
  findings: string[];
  recommendations: string[];
  time_taken: number;
  cost: number;
}

interface ActivityLog {
  id: string;
  agent: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'progress' | 'question' | 'complete';
}

interface AgentStatus {
  agent: Agent;
  status: 'waiting' | 'working' | 'complete' | 'blocked';
  progress: number;
  currentTask: string;
}

export default function LiveOffice({ agents, config, onAssumption, onComplete }: LiveOfficeProps) {
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [startTime] = useState(Date.now());

  // Initialize agent statuses
  useEffect(() => {
    const initialStatuses: AgentStatus[] = agents.map((agent, index) => ({
      agent,
      status: index === 0 ? 'working' : 'waiting',
      progress: 0,
      currentTask: index === 0 ? 'Initializing...' : 'Waiting for input',
    }));
    setAgentStatuses(initialStatuses);

    // Add initial log
    addLog('Evo (Manager)', 'Operation commenced. Distributing tasks to team...', 'info');
  }, [agents]);

  const addLog = (agent: string, message: string, type: ActivityLog['type'] = 'info') => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      agent,
      message,
      timestamp: new Date(),
      type,
    };
    setActivityLogs((prev) => [...prev, newLog]);
  };

  // Simulate workflow progression
  useEffect(() => {
    if (agentStatuses.length === 0) return;

    const progressInterval = setInterval(() => {
      setAgentStatuses((prevStatuses) => {
        const newStatuses = [...prevStatuses];
        let allComplete = true;
        let totalProgress = 0;

        newStatuses.forEach((status, index) => {
          if (status.status === 'working') {
            // Progress the current working agent
            if (status.progress < 100) {
              status.progress = Math.min(100, status.progress + Math.random() * 15);

              // Update task descriptions based on progress
              if (status.progress < 30) {
                status.currentTask = 'Analyzing input data...';
              } else if (status.progress < 60) {
                status.currentTask = 'Processing information...';
              } else if (status.progress < 90) {
                status.currentTask = 'Finalizing results...';
              }

              // Log progress milestones
              if (status.progress >= 25 && status.progress < 40) {
                addLog(status.agent.name, `Analyzed document structure - found key sections`, 'progress');
              } else if (status.progress >= 60 && status.progress < 75) {
                addLog(status.agent.name, `Cross-referencing against ${config.rulebook.toUpperCase()} standards`, 'progress');
              }

              allComplete = false;
            } else {
              // Agent finished
              status.status = 'complete';
              status.currentTask = 'Task complete';
              status.progress = 100;
              addLog(status.agent.name, `Completed ${status.agent.role} tasks. Passing results forward.`, 'complete');

              // Trigger assumption at specific point (e.g., when auditor is at 75%)
              if (index === 1 && status.agent.role.toLowerCase().includes('auditor')) {
                setTimeout(() => {
                  onAssumption({
                    agent: status.agent,
                    question: 'I found an ambiguous clause regarding data storage in Germany (Clause 8). Should I flag this as a critical or minor risk?',
                    context: 'The contract mentions a third-party vendor with servers in Frankfurt, but doesn\'t explicitly state compliance framework.',
                  });
                }, 1000);
              }

              // Start next agent
              if (index + 1 < newStatuses.length) {
                newStatuses[index + 1].status = 'working';
                newStatuses[index + 1].progress = 0;
                newStatuses[index + 1].currentTask = 'Starting analysis...';
                addLog(newStatuses[index + 1].agent.name, 'Received input. Beginning work...', 'info');
              }
            }
          }

          totalProgress += status.progress;
        });

        // Calculate overall progress
        const overall = Math.floor(totalProgress / newStatuses.length);
        setOverallProgress(overall);

        // Check if all complete
        if (newStatuses.every((s) => s.status === 'complete')) {
          clearInterval(progressInterval);
          setTimeout(() => {
            const timeTaken = Math.floor((Date.now() - startTime) / 1000 / 60); // minutes
            const cost = ((agents.reduce((sum, a) => sum + a.price_per_hour, 0) / 60) * timeTaken).toFixed(2);

            onComplete({
              summary: `Compliance review completed for ${config.title}. All ${config.rulebook.toUpperCase()} requirements verified.`,
              findings: [
                'Document structure complies with regulatory standards',
                'All required clauses are present and properly formatted',
                'No critical compliance violations detected',
                'Minor recommendations for improved clarity in Section 4.2',
              ],
              recommendations: [
                'Add explicit data retention timeline in Clause 3',
                'Clarify third-party vendor compliance framework',
                'Consider adding force majeure provisions',
              ],
              time_taken: timeTaken,
              cost: parseFloat(cost),
            });
          }, 2000);
        }

        return newStatuses;
      });
    }, 1500);

    return () => clearInterval(progressInterval);
  }, [agentStatuses.length, agents, config, startTime, onAssumption, onComplete]);

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">{config.title}</h1>
              <p className="text-sm text-slate-400">Operation in progress...</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#6366F1]">{overallProgress}%</div>
              <div className="text-xs text-slate-400">Overall Progress</div>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-[#020617] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Agent Status Cards */}
        <div className="w-80 border-r border-slate-800 overflow-y-auto p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-3">
            Team Status
          </h2>
          {agentStatuses.map((status, index) => (
            <div
              key={index}
              className={`glass rounded-lg p-4 transition-all ${
                status.status === 'working' ? 'ring-2 ring-[#6366F1] pulse-glow' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={status.agent.photo_url}
                  alt={status.agent.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{status.agent.name}</div>
                  <div className="text-xs text-slate-400 truncate">{status.agent.role}</div>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    status.status === 'working'
                      ? 'bg-green-500 animate-pulse'
                      : status.status === 'complete'
                      ? 'bg-blue-500'
                      : 'bg-slate-600'
                  }`}
                ></div>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>{status.currentTask}</span>
                  <span>{status.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#020617] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      status.status === 'complete'
                        ? 'bg-blue-500'
                        : 'bg-gradient-to-r from-[#6366F1] to-[#818CF8]'
                    }`}
                    style={{ width: `${status.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    status.status === 'working'
                      ? 'bg-green-500/20 text-green-400'
                      : status.status === 'complete'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {status.status === 'working'
                    ? 'Working'
                    : status.status === 'complete'
                    ? 'Complete'
                    : 'Waiting'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Activity Log (The Watercooler) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                Live Activity Log
              </h2>
            </div>
            <div className="space-y-2">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="glass-light rounded-lg p-3 animate-fadeIn"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-1 h-full rounded-full ${
                      log.type === 'complete'
                        ? 'bg-blue-500'
                        : log.type === 'progress'
                        ? 'bg-green-500'
                        : log.type === 'question'
                        ? 'bg-yellow-500'
                        : 'bg-slate-600'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#6366F1]">{log.agent}</span>
                        <span className="text-xs text-slate-500">
                          {log.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{log.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <div className="fixed bottom-6 right-6 glass rounded-lg p-4 max-w-sm shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[#6366F1]/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">Operation Running</p>
            <p className="text-xs text-slate-400">
              You can close this window. We'll notify you when complete or if we need your input.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
