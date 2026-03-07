'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTasks, Task, getTask } from '@/lib/tasks';
import { useTeamAgents } from '@/lib/services/agents';
import WarRoomLive from '@/components/operations/WarRoomLive';

interface OperationsViewProps {
  teamId: string;
}

export default function OperationsView({ teamId }: OperationsViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showWarRoom, setShowWarRoom] = useState(false);

  // Load hired agents from API
  const { agents: hiredAgents } = useTeamAgents({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });

  useEffect(() => {
    const loadTasksAsync = async () => {
      // Load tasks for this team
      const teamTasks = await getTasks(parseInt(teamId));
      setTasks(teamTasks);
    };

    loadTasksAsync();
  }, [teamId]);

  // Load task details when activeTaskId changes
  useEffect(() => {
    if (activeTaskId) {
      loadActiveTask(activeTaskId);
    } else {
      setActiveTask(null);
    }
  }, [activeTaskId]);

  const loadActiveTask = async (taskId: number) => {
    const task = await getTask(taskId);
    setActiveTask(task);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleViewLive = (taskId: number) => {
    setActiveTaskId(taskId);
    setShowWarRoom(true);
  };

  // Find best matching agent for a role
  const findAgentForRole = useCallback((agentRole: string, agentName?: string) => {
    if (!hiredAgents.length) return undefined;

    // Try exact name match first
    if (agentName) {
      const nameMatch = hiredAgents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
      if (nameMatch) return nameMatch;
    }

    const roleLower = agentRole.toLowerCase();

    // Try role match
    let match = hiredAgents.find(a =>
      a.role.toLowerCase().includes(roleLower) ||
      roleLower.includes(a.role.toLowerCase())
    );
    if (match) return match;

    // Try specialty match
    match = hiredAgents.find(a =>
      a.specialty.toLowerCase().includes(roleLower) ||
      roleLower.includes(a.specialty.toLowerCase())
    );
    if (match) return match;

    // Fallback to first agent
    return hiredAgents[0];
  }, [hiredAgents]);

  if (showWarRoom && activeTaskId && activeTask) {
    // Map workflow nodes with agent data from API
    const workflowNodes = activeTask.workflowNodes.map((node, idx) => {
      const matchedAgent = findAgentForRole(node.agentRole, node.agentName);
      return {
        id: node.id,
        name: node.name,
        description: node.description,
        agentId: matchedAgent?.id?.toString(),
        agentName: matchedAgent?.name || node.agentName || node.agentRole,
        agentPhoto: matchedAgent?.photo_url || node.agentPhoto,
        agentRole: node.agentRole,
        action: node.action,
        order: node.order || idx + 1,
      };
    });

    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800 flex items-center gap-4">
          <button
            onClick={async () => {
              setShowWarRoom(false);
              setActiveTaskId(null);
              setActiveTask(null);
              // Reload tasks when closing execution theatre
              const teamTasks = await getTasks(parseInt(teamId));
              setTasks(teamTasks);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded transition-all"
          >
            ← Back to Operations
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <WarRoomLive
            taskId={activeTask.id}
            teamId={teamId}
            workflowNodes={workflowNodes}
            taskDescription={activeTask.description}
            initialStatus={activeTask.status}
            hierarchical={activeTask.hierarchical}
            onClose={() => {
              setShowWarRoom(false);
              setActiveTaskId(null);
              setActiveTask(null);
            }}
          />
        </div>
      </div>
    );
  }

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
            {tasks.filter((t) => t.status === 'active').length}
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
            {tasks.filter((t) => t.status === 'pending').length}
          </div>
          <div className="text-sm text-slate-400">Queued</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-[#FDE047] mb-1">
            ${tasks.reduce((acc, t) => acc + t.cost, 0).toFixed(2)}
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
            className="glass rounded-xl p-6 hover:bg-[#1E293B]/80 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : task.status === 'active'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {task.status === 'active'
                      ? 'In Progress'
                      : task.status === 'completed'
                      ? 'Completed'
                      : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  {task.startedAt && <span>{formatTimeAgo(task.startedAt)}</span>}
                  {task.completedAt && (
                    <>
                      <span>•</span>
                      <span>Completed {formatTimeAgo(task.completedAt)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400 mb-1">Cost</div>
                <div className="text-lg font-bold text-[#FDE047]">${task.cost.toFixed(2)}</div>
              </div>
            </div>

            {/* Progress Bar */}
            {task.status !== 'pending' && (
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
            {task.workflowNodes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Agents:</span>
                <div className="flex gap-2">
                  {task.workflowNodes.map((node, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-[#6366F1]/20 text-[#6366F1] px-2 py-1 rounded-md font-medium"
                    >
                      {node.agentName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {task.status === 'active' && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <button
                  onClick={() => handleViewLive(task.id)}
                  className="text-sm text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors"
                >
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
