'use client';

import { useEffect, useState } from 'react';
import { getHiredAgents } from '@/lib/agents';
import { getTasks } from '@/lib/tasks';

interface CorporateStatusBarProps {
  teamId?: string;
  onNavigateToBilling?: () => void;
}

export default function CorporateStatusBar({ teamId, onNavigateToBilling }: CorporateStatusBarProps) {
  const [totalSpend, setTotalSpend] = useState(0);
  const [burnRate, setBurnRate] = useState(0);
  const [activeAgents, setActiveAgents] = useState(0);
  const [thisMonthSpend, setThisMonthSpend] = useState(0);

  useEffect(() => {
    if (!teamId) {
      setTotalSpend(0);
      setBurnRate(0);
      setActiveAgents(0);
      setThisMonthSpend(0);
      return;
    }

    const fetchMetrics = async () => {
      try {
        const tasks = await getTasks(parseInt(teamId));
        const agents = getHiredAgents(teamId);

        // Calculate total spend from all completed tasks
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const totalCost = completedTasks.reduce((sum, task) => sum + task.cost, 0);
        setTotalSpend(totalCost);

        // Calculate this month's spend
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthTasks = completedTasks.filter(t =>
          t.completedAt && t.completedAt >= startOfMonth
        );
        const monthSpend = thisMonthTasks.reduce((sum, task) => sum + task.cost, 0);
        setThisMonthSpend(monthSpend);

        // Calculate current burn rate from active tasks
        const activeTasks = tasks.filter(t => t.status === 'active');
        const activeAgentIds = new Set<string>();

        activeTasks.forEach(task => {
          task.workflowNodes.forEach(node => {
            activeAgentIds.add(node.agentId);
          });
        });

        setActiveAgents(activeAgentIds.size);

        // Calculate burn rate ($/min) from agents working on active tasks
        const workingAgents = agents.filter(a => activeAgentIds.has(a.id));
        const hourlyRate = workingAgents.reduce((sum, agent) => sum + agent.price_per_hour, 0);
        const perMinute = hourlyRate / 60;
        setBurnRate(perMinute);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    // Initial fetch
    fetchMetrics();

    // Refresh every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, [teamId]);

  return (
    <div className="h-12 bg-[#0A0F1E] border-b border-slate-800/50 flex items-center px-6">
      <div className="flex items-center justify-between w-full max-w-[1920px] mx-auto">
        {/* Left Section - Metrics */}
        <div className="flex items-center gap-6">
          {/* Total Spend */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Total Spend</div>
            <div className="text-sm font-semibold text-white tabular-nums">
              ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="w-px h-4 bg-slate-700/50"></div>

          {/* This Month */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">This Month</div>
            <div className="text-sm font-semibold text-[#FDE047] tabular-nums">
              ${thisMonthSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="w-px h-4 bg-slate-700/50"></div>

          {/* Burn Rate */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Burn</div>
            <div className={`text-sm font-semibold tabular-nums ${burnRate > 0 ? 'text-red-400' : 'text-slate-600'}`}>
              ${burnRate.toFixed(2)}/min
            </div>
          </div>

          <div className="w-px h-4 bg-slate-700/50"></div>

          {/* Active Agents */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Active</div>
            <div className={`text-sm font-semibold tabular-nums ${activeAgents > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
              {activeAgents}
            </div>
          </div>
        </div>

        {/* Right Section - Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToBilling}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-all group"
          >
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium group-hover:text-slate-400">
              Pay-as-you-go
            </div>
            <div className={`w-1.5 h-1.5 rounded-full ${teamId ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
            <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
