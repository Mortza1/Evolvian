'use client';

import { useState, useEffect } from 'react';
import TaskCreationFlow from './TaskCreationFlow';

interface BoardViewProps {
  teamId: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  avatar: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  estimatedCost: number;
  createdAt: Date;
}

export default function BoardView({ teamId }: BoardViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskCreationOpen, setIsTaskCreationOpen] = useState(false);

  const columns = [
    { id: 'todo', title: 'To Do', color: '#6366F1' },
    { id: 'in_progress', title: 'In Progress', color: '#F59E0B' },
    { id: 'review', title: 'Review', color: '#EC4899' },
    { id: 'completed', title: 'Completed', color: '#10B981' },
  ];

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'medium': return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
      case 'low': return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-white">The Board</h1>
            <p className="text-slate-400 text-sm">Track all tasks and projects in one place</p>
          </div>
          <button
            onClick={() => setIsTaskCreationOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-medium rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all"
          >
            + New Task
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="px-4 py-2 glass rounded-lg border border-slate-700/50">
            <span className="text-sm text-slate-400">Total Tasks:</span>
            <span className="ml-2 text-lg font-bold text-white">{tasks.length}</span>
          </div>
          <div className="px-4 py-2 glass rounded-lg border border-slate-700/50">
            <span className="text-sm text-slate-400">Estimated Cost:</span>
            <span className="ml-2 text-lg font-bold text-[#FDE047]">
              ${tasks.reduce((sum, t) => sum + t.estimatedCost, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            return (
              <div key={column.id} className="flex-1 min-w-[320px] flex flex-col">
                {/* Column Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className="font-semibold text-white">{column.title}</h3>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="glass rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 cursor-pointer transition-all group"
                    >
                      {/* Priority Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                        <button className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>

                      {/* Task Title */}
                      <h4 className="font-semibold text-white mb-2 line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Description */}
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                        {task.description}
                      </p>

                      {/* Assigned To */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-sm">
                            {task.avatar}
                          </div>
                          <span className="text-xs text-slate-400">{task.assignedTo}</span>
                        </div>
                        <div className="text-xs font-semibold text-[#FDE047]">
                          ${task.estimatedCost}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center h-32 glass rounded-xl border-2 border-dashed border-slate-700/50">
                      <p className="text-sm text-slate-500">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Creation Flow Modal */}
      <TaskCreationFlow
        isOpen={isTaskCreationOpen}
        onClose={() => setIsTaskCreationOpen(false)}
        teamId={teamId}
        userObjective={localStorage.getItem('userObjective') || 'Create a complete Brand Identity Pack'}
      />
    </div>
  );
}
