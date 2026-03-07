'use client';

import { useState, useEffect, useCallback } from 'react';
import TaskCreationFlow from './TaskCreationFlow';
import { getTasks, getTask, Task as StoredTask } from '@/lib/tasks';
import { useTeamAgents } from '@/lib/services/agents';
import WarRoomLive from '@/components/operations/WarRoomLive';

interface BoardViewProps {
  teamId: string;
}

export default function BoardView({ teamId }: BoardViewProps) {
  const [tasks, setTasks] = useState<StoredTask[]>([]);
  const [isTaskCreationOpen, setIsTaskCreationOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<StoredTask | null>(null);

  // Load hired agents from API
  const { agents: hiredAgents } = useTeamAgents({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });

  // Load tasks on mount and when teamId changes
  useEffect(() => {
    loadTasks();
  }, [teamId]);

  const loadTasks = async () => {
    const teamTasks = await getTasks(parseInt(teamId));
    setTasks(teamTasks);
  };

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

  const columns = [
    { id: 'pending', title: 'To Do', color: '#6366F1' },
    { id: 'active', title: 'In Progress', color: '#F59E0B' },
    { id: 'completed', title: 'Completed', color: '#10B981' },
  ];

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const handleTaskClick = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // Open for any status (pending will start execution, active will show progress)
      setActiveTaskId(taskId);
    }
  };

  const handleCloseWarRoom = () => {
    setActiveTaskId(null);
    setActiveTask(null);
    loadTasks(); // Reload tasks when closing execution theatre
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

  // Execution Theatre Modal
  if (activeTaskId && activeTask) {
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
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800 flex items-center gap-4 bg-[#020617]">
            <button
              onClick={handleCloseWarRoom}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded transition-all"
            >
              ← Back to Board
            </button>
            <div className="text-sm text-slate-400">Execution Theatre</div>
          </div>
          <div className="flex-1 overflow-hidden">
            <WarRoomLive
              taskId={activeTask.id}
              teamId={teamId}
              workflowNodes={workflowNodes}
              taskDescription={activeTask.description}
              initialStatus={activeTask.status}
              hierarchical={activeTask.hierarchical}
              onClose={handleCloseWarRoom}
            />
          </div>
        </div>
      </div>
    );
  }

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
            <span className="text-sm text-slate-400">Total Cost:</span>
            <span className="ml-2 text-lg font-bold text-[#FDE047]">
              ${tasks.reduce((sum, t) => sum + t.cost, 0).toFixed(2)}
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
                  {columnTasks.map((task) => {
                    // Get agent photos for this task
                    const taskAgentPhotos = task.workflowNodes.map(node => {
                      const matchedAgent = findAgentForRole(node.agentRole, node.agentName);
                      return {
                        name: matchedAgent?.name || node.agentName || node.agentRole,
                        photo: matchedAgent?.photo_url || node.agentPhoto,
                      };
                    });

                    return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className="glass rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-all group cursor-pointer"
                    >
                      {/* Status Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${
                          task.status === 'active'
                            ? 'text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/30'
                            : task.status === 'completed'
                            ? 'text-green-400 bg-green-400/10 border-green-400/30'
                            : 'text-slate-400 bg-slate-400/10 border-slate-400/30'
                        }`}>
                          {task.status === 'active' ? 'IN PROGRESS' : task.status === 'completed' ? 'COMPLETED' : 'PENDING'}
                        </span>
                        <div className="text-xs text-[#6366F1]">
                          {task.status === 'pending' ? 'Click to start' : task.status === 'active' ? 'Click to view' : ''}
                        </div>
                      </div>

                      {/* Task Title */}
                      <h4 className="font-semibold text-white mb-2 line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Description */}
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                        {task.description}
                      </p>

                      {/* Progress Bar */}
                      {(task.status === 'active' || task.status === 'completed') && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Progress</span>
                            <span>{task.progress || 0}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                task.status === 'completed' ? 'bg-green-500' : 'bg-[#6366F1]'
                              }`}
                              style={{ width: `${task.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Agents */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                        <div className="flex items-center gap-2">
                          {taskAgentPhotos.slice(0, 3).map((agent, idx) => (
                            agent.photo ? (
                              <img
                                key={idx}
                                src={agent.photo}
                                alt={agent.name}
                                className="w-6 h-6 rounded-full object-cover border border-slate-700"
                                title={agent.name}
                              />
                            ) : (
                              <div
                                key={idx}
                                className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-white text-[10px] font-bold border border-slate-700"
                                title={agent.name}
                              >
                                {agent.name.substring(0, 2).toUpperCase()}
                              </div>
                            )
                          ))}
                          {taskAgentPhotos.length > 3 && (
                            <span className="text-xs text-slate-500">+{taskAgentPhotos.length - 3}</span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-[#FDE047]">
                          ${(task.cost || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                  })}

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
        onTaskCreated={(taskId) => {
          // Reload tasks to show the new one
          loadTasks();
          // Open the Execution Theatre for the new task
          setActiveTaskId(taskId);
        }}
      />
    </div>
  );
}
