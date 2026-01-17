'use client';

import { useState } from 'react';

export default function OperationsView() {
  const [activeTask, setActiveTask] = useState<string | null>(null);

  const tasks = [
    {
      id: 'task-1',
      title: 'GDPR Compliance Review',
      status: 'completed',
      progress: 100,
      startedAt: '2 hours ago',
      completedAt: '45 min ago',
      cost: '$0.12',
      agents: ['Scanner', 'Auditor', 'Reporter'],
    },
    {
      id: 'task-2',
      title: 'Sales Outreach Campaign',
      status: 'in_progress',
      progress: 67,
      startedAt: '23 min ago',
      cost: '$0.48',
      agents: ['Lead Finder', 'Qualifier'],
    },
    {
      id: 'task-3',
      title: 'Content Generation: Blog Post',
      status: 'in_progress',
      progress: 34,
      startedAt: '12 min ago',
      cost: '$0.18',
      agents: ['Content Writer'],
    },
    {
      id: 'task-4',
      title: 'Risk Assessment Report',
      status: 'queued',
      progress: 0,
      startedAt: 'Queued',
      cost: '$0.00',
      agents: [],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Operations Room</h1>
        <p className="text-slate-400">Monitor and manage active workflows</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-[#6366F1] mb-1">
            {tasks.filter((t) => t.status === 'in_progress').length}
          </div>
          <div className="text-sm text-slate-400">Active Tasks</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {tasks.filter((t) => t.status === 'completed').length}
          </div>
          <div className="text-sm text-slate-400">Completed Today</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-400 mb-1">
            {tasks.filter((t) => t.status === 'queued').length}
          </div>
          <div className="text-sm text-slate-400">Queued</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-[#FDE047] mb-1">
            ${tasks.reduce((acc, t) => acc + parseFloat(t.cost.replace('$', '')), 0).toFixed(2)}
          </div>
          <div className="text-sm text-slate-400">Total Cost</div>
        </div>
      </div>

      {/* Intake Zone */}
      <div className="glass rounded-xl p-8 mb-8 border-2 border-dashed border-slate-700 hover:border-[#6366F1] transition-all cursor-pointer group">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#6366F1]/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#6366F1]/30 transition-colors">
            <svg
              className="w-8 h-8 text-[#6366F1]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Start a New Task</h3>
          <p className="text-sm text-slate-400 mb-4">
            Drop a file, paste text, or describe what you need
          </p>
          <button className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all">
            Create Task
          </button>
        </div>
      </div>

      {/* Active & Recent Tasks */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white mb-4">Tasks</h2>

        {tasks.map((task) => (
          <div
            key={task.id}
            className="glass rounded-xl p-6 hover:bg-[#1E293B]/80 transition-all cursor-pointer"
            onClick={() => setActiveTask(task.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : task.status === 'in_progress'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {task.status === 'in_progress'
                      ? 'In Progress'
                      : task.status === 'completed'
                      ? 'Completed'
                      : 'Queued'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span>{task.startedAt}</span>
                  {task.completedAt && (
                    <>
                      <span>•</span>
                      <span>Completed {task.completedAt}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400 mb-1">Cost</div>
                <div className="text-lg font-bold text-[#FDE047]">{task.cost}</div>
              </div>
            </div>

            {/* Progress Bar */}
            {task.status !== 'queued' && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Progress</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="w-full h-2 bg-[#020617]/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      task.status === 'completed'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-[#6366F1] to-[#818CF8]'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Agents */}
            {task.agents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Agents:</span>
                <div className="flex gap-2">
                  {task.agents.map((agent, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-[#6366F1]/20 text-[#6366F1] px-2 py-1 rounded-md font-medium"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {task.status === 'in_progress' && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <button className="text-sm text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors">
                  View Live Progress →
                </button>
              </div>
            )}

            {task.status === 'completed' && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <button className="text-sm text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors">
                  View Results →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
