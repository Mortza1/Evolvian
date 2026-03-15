'use client';

import { useState, useEffect, useCallback } from 'react';
import TaskCreationFlow from './TaskCreationFlow';
import { getTasks, getTask, Task as StoredTask } from '@/lib/tasks';
import { useTeamAgents } from '@/lib/services/agents';
import WarRoomLive from '@/components/operations/WarRoomLive';

interface BoardViewProps {
  teamId: string;
  onNavigateToVault?: () => void;
}

// ─── Column definitions ───────────────────────────────────────────────────────
const COLUMNS = [
  {
    id: 'pending',
    title: 'To Do',
    accent: '#4A6A72',
    badge: '#1E2D30',
    badgeText: '#4A6A72',
  },
  {
    id: 'active',
    title: 'In Progress',
    accent: '#5A9E8F',
    badge: '#5A9E8F18',
    badgeText: '#5A9E8F',
  },
  {
    id: 'completed',
    title: 'Completed',
    accent: '#7A9A6A',
    badge: '#7A9A6A18',
    badgeText: '#7A9A6A',
  },
];

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const cfg =
    status === 'active'    ? { label: 'In Progress', color: '#5A9E8F', bg: '#5A9E8F12', border: '#5A9E8F30' } :
    status === 'completed' ? { label: 'Completed',   color: '#7A9A6A', bg: '#7A9A6A12', border: '#7A9A6A30' } :
                             { label: 'Pending',     color: '#4A6A72', bg: '#4A6A7212', border: '#4A6A7230' };
  return (
    <span
      className="inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border, fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Agent avatars ─────────────────────────────────────────────────────────────
function AgentAvatars({ agents }: { agents: { name: string; photo?: string }[] }) {
  const visible = agents.slice(0, 4);
  const overflow = agents.length - 4;
  return (
    <div className="flex items-center">
      {visible.map((agent, idx) => (
        <div
          key={idx}
          className="relative"
          style={{ marginLeft: idx > 0 ? '-6px' : '0' }}
          title={agent.name}
        >
          {agent.photo ? (
            <img
              src={agent.photo}
              alt={agent.name}
              className="h-6 w-6 rounded-md object-cover border-2"
              style={{ borderColor: '#111A1D' }}
            />
          ) : (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md border-2 text-[9px] font-bold text-[#7BBDAE]"
              style={{ background: '#1A2E2B', borderColor: '#111A1D' }}
            >
              {agent.name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md border-2 bg-[#1E2D30] text-[9px] text-[#4A6A72]"
          style={{ borderColor: '#111A1D', marginLeft: '-6px', fontFamily: "'IBM Plex Mono', monospace" }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  agents,
  onClick,
  index,
}: {
  task: StoredTask;
  agents: { name: string; photo?: string }[];
  onClick: () => void;
  index: number;
}) {
  const isActive = task.status === 'active';
  const isDone = task.status === 'completed';

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-md border border-[#1E2D30] bg-[#111A1D] p-5 transition-all duration-150 hover:border-[#5A9E8F]/40 hover:bg-[#141E22] animate-evolve-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Left bar for active */}
      {isActive && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-full bg-[#5A9E8F]" />
      )}
      {isDone && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-full bg-[#7A9A6A]" />
      )}

      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <StatusPill status={task.status} />
        <span
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="shrink-0 text-[10px] text-[#2E4248]"
        >
          {task.status === 'pending' ? 'click to run' : task.status === 'active' ? 'click to view' : ''}
        </span>
      </div>

      {/* Title */}
      <h4
        style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, letterSpacing: '-0.01em' }}
        className="mb-2 text-[14px] leading-snug text-[#C8C4BC] line-clamp-2 group-hover:text-[#EAE6DF] transition-colors"
      >
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="mb-4 text-[12px] leading-relaxed text-[#3A5056] line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Progress bar — only for active/completed */}
      {(isActive || isDone) && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.12em] text-[#2E4248]">Progress</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className={`text-[10px] ${isDone ? 'text-[#7A9A6A]' : 'text-[#5A9E8F]'}`}>
              {task.progress || 0}%
            </span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-[#172025]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${task.progress || 0}%`,
                background: isDone ? '#7A9A6A' : '#5A9E8F',
              }}
            />
          </div>
        </div>
      )}

      {/* Footer — agents + cost */}
      <div className="flex items-center justify-between border-t border-[#172025] pt-3">
        <AgentAvatars agents={agents} />
        <span
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="text-[13px] font-medium text-[#BF8A52]"
        >
          ${(task.cost || 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Column empty state ───────────────────────────────────────────────────────
function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-[#1A2A2D]">
      <span className="text-[12px] text-[#2A3E44]">No {label.toLowerCase()} tasks</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BoardView({ teamId, onNavigateToVault }: BoardViewProps) {
  const [tasks, setTasks] = useState<StoredTask[]>([]);
  const [isTaskCreationOpen, setIsTaskCreationOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<StoredTask | null>(null);

  const { agents: hiredAgents } = useTeamAgents({ teamId: parseInt(teamId, 10), autoFetch: true });

  useEffect(() => { loadTasks(); }, [teamId]);

  const loadTasks = async () => {
    setTasks(await getTasks(parseInt(teamId)));
  };

  useEffect(() => {
    if (activeTaskId) loadActiveTask(activeTaskId);
    else setActiveTask(null);
  }, [activeTaskId]);

  const loadActiveTask = async (id: number) => {
    setActiveTask(await getTask(id));
  };

  const findAgentForRole = useCallback((role: string, name?: string) => {
    if (!hiredAgents.length) return undefined;
    if (name) {
      const m = hiredAgents.find(a => a.name.toLowerCase() === name.toLowerCase());
      if (m) return m;
    }
    const r = role.toLowerCase();
    return (
      hiredAgents.find(a => a.role.toLowerCase().includes(r) || r.includes(a.role.toLowerCase())) ||
      hiredAgents.find(a => a.specialty.toLowerCase().includes(r) || r.includes(a.specialty.toLowerCase())) ||
      hiredAgents[0]
    );
  }, [hiredAgents]);

  const handleClose = () => {
    setActiveTaskId(null);
    setActiveTask(null);
    loadTasks();
  };

  // ── Execution Theatre overlay ───────────────────────────────────────────
  if (activeTaskId && activeTask) {
    const workflowNodes = activeTask.workflowNodes.map((node, idx) => {
      const matched = findAgentForRole(node.agentRole, node.agentName);
      return {
        id: node.id,
        name: node.name,
        description: node.description,
        agentId: matched?.id?.toString(),
        agentName: matched?.name || node.agentName || node.agentRole,
        agentPhoto: matched?.photo_url || node.agentPhoto,
        agentRole: node.agentRole,
        action: node.action,
        order: node.order || idx + 1,
      };
    });

    return (
      <div className="fixed inset-0 z-50" style={{ background: '#07090A' }}>
        <div className="flex h-full flex-col">
          {/* Theatre header */}
          <div
            className="flex shrink-0 items-center gap-5 border-b px-8 py-4"
            style={{ borderColor: '#162025', background: '#080E11' }}
          >
            <button
              onClick={handleClose}
              className="flex items-center gap-2 rounded-md border border-[#1E2D30] bg-[#111A1D] px-4 py-2 text-[13px] text-[#7A9EA6] transition-all hover:border-[#5A9E8F]/40 hover:text-[#5A9E8F]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Board
            </button>
            <div className="h-4 w-px bg-[#1E2D30]" />
            <div>
              <span
                style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                className="text-[15px] text-[#D8D4CC]"
              >
                {activeTask.title}
              </span>
              <span
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                className="ml-3 text-[11px] text-[#3A5056]"
              >
                Execution Theatre
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <WarRoomLive
              taskId={activeTask.id}
              teamId={teamId}
              workflowNodes={workflowNodes}
              taskDescription={activeTask.description}
              initialStatus={activeTask.status}
              hierarchical={activeTask.hierarchical}
              initialHierarchyTeam={activeTask.hierarchyTeam}
              initialVaultFileId={activeTask.vaultFileId}
              initialVaultFileName={activeTask.vaultFileName}
              onViewVault={onNavigateToVault}
              onClose={handleClose}
            />
          </div>
        </div>
      </div>
    );
  }

  const totalCost = tasks.reduce((s, t) => s + t.cost, 0);

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: '#0B1215', fontFamily: "'Syne', sans-serif" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 animate-evolve-in" style={{ animationDelay: '0ms' }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}
              className="text-[2rem] text-[#EAE6DF] leading-none mb-2"
            >
              The Board
            </h1>
            <p className="text-[13px] text-[#4A6A72]">Track all tasks and operations in one place</p>
          </div>

          <button
            onClick={() => setIsTaskCreationOpen(true)}
            className="group flex items-center gap-2.5 rounded-md border border-[#5A9E8F]/40 bg-[#5A9E8F]/8 px-5 py-2.5 text-[13px] font-medium text-[#5A9E8F] transition-all hover:border-[#5A9E8F]/70 hover:bg-[#5A9E8F]/14 hover:text-[#7BBDAE]"
          >
            <svg className="h-4 w-4 transition-transform duration-150 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-2">
            <span
              style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.02em' }}
              className="text-[1.5rem] font-medium text-[#EAE6DF]"
            >
              {tasks.length}
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#4A6A72]">Total Tasks</span>
          </div>
          <div className="h-6 w-px bg-[#1A2A2D]" />
          <div className="flex items-baseline gap-2">
            <span
              style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.02em' }}
              className="text-[1.5rem] font-medium text-[#BF8A52]"
            >
              ${totalCost.toFixed(2)}
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#4A6A72]">Total Cost</span>
          </div>
          <div className="h-6 w-px bg-[#1A2A2D]" />
          <div className="flex items-center gap-4">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: col.accent }}
                />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#3A5056]">
                  {tasks.filter(t => t.status === col.id).length} {col.title.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanban board ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex h-full gap-5 pb-4" style={{ minWidth: `${COLUMNS.length * 320 + (COLUMNS.length - 1) * 20}px` }}>
          {COLUMNS.map((col, colIdx) => {
            const colTasks = tasks.filter(t => t.status === col.id);

            return (
              <div
                key={col.id}
                className="flex min-w-[300px] flex-1 flex-col animate-evolve-in"
                style={{ animationDelay: `${colIdx * 80}ms` }}
              >
                {/* Column header */}
                <div
                  className="mb-4 border-t-2 pt-4"
                  style={{ borderColor: col.accent }}
                >
                  <div className="flex items-center justify-between">
                    <h3
                      style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                      className="text-[13px] text-[#B8B2AA]"
                    >
                      {col.title}
                    </h3>
                    <span
                      className="flex h-5 min-w-[20px] items-center justify-center rounded border px-1.5 text-[10px] font-semibold"
                      style={{
                        background: col.badge,
                        color: col.badgeText,
                        borderColor: col.accent + '30',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide pr-1">
                  {colTasks.length === 0 ? (
                    <EmptyColumn label={col.title} />
                  ) : (
                    colTasks.map((task, taskIdx) => {
                      const agents = task.workflowNodes.map(node => {
                        const m = findAgentForRole(node.agentRole, node.agentName);
                        return { name: m?.name || node.agentName || node.agentRole, photo: m?.photo_url || node.agentPhoto };
                      });
                      return (
                        <TaskCard
                          key={task.id}
                          task={task}
                          agents={agents}
                          onClick={() => handleTaskClick(task.id)}
                          index={taskIdx}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task creation modal */}
      <TaskCreationFlow
        isOpen={isTaskCreationOpen}
        onClose={() => setIsTaskCreationOpen(false)}
        teamId={teamId}
        userObjective={typeof window !== 'undefined' ? localStorage.getItem('userObjective') || 'Create a complete Brand Identity Pack' : 'Create a complete Brand Identity Pack'}
        onTaskCreated={(taskId) => {
          loadTasks();
          setActiveTaskId(taskId);
        }}
      />
    </div>
  );

  function handleTaskClick(taskId: number) {
    const task = tasks.find(t => t.id === taskId);
    if (task) setActiveTaskId(taskId);
  }
}
