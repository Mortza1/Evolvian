'use client';

import { useEffect, useState } from 'react';
import { getHiredAgents } from '@/lib/agents';
import { getOperationsByTeam } from '@/lib/operations-storage';

interface GlobalTickerProps {
  teamId?: string;
}

export default function GlobalTicker({ teamId }: GlobalTickerProps) {
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [tasksInProgress, setTasksInProgress] = useState(0);
  const [dailyBurn, setDailyBurn] = useState(0);

  useEffect(() => {
    if (!teamId) {
      // Show placeholder when no team selected
      setActiveEmployees(0);
      setTasksInProgress(0);
      setDailyBurn(0);
      return;
    }

    // Get team-specific data
    const agents = getHiredAgents(teamId);
    const onlineAgents = agents.filter(a => a.isOnline);
    setActiveEmployees(onlineAgents.length);

    // Get active operations count
    const operations = getOperationsByTeam(teamId);
    const activeOps = operations.filter(op => op.status === 'in_progress');
    setTasksInProgress(activeOps.length);

    // Calculate daily burn (hours since midnight * hourly rate for online agents)
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const hoursToday = (now.getTime() - midnight.getTime()) / (1000 * 60 * 60);

    const initialBurn = onlineAgents.reduce((sum, agent) =>
      sum + (agent.price_per_hour * hoursToday), 0
    );

    setDailyBurn(initialBurn);

    // Update burn rate every second
    const interval = setInterval(() => {
      const costPerSecond = onlineAgents.reduce((sum, agent) =>
        sum + (agent.price_per_hour / 3600), 0
      );
      setDailyBurn(prev => prev + costPerSecond);
    }, 1000);

    return () => clearInterval(interval);
  }, [teamId]);

  return (
    <div className="h-14 bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 flex items-center px-6">
      <div className="flex items-center gap-8 w-full max-w-7xl mx-auto">
        {/* Active Employees */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${activeEmployees > 0 ? 'bg-green-500 pulse-glow' : 'bg-slate-600'}`}></div>
          <span className="text-sm text-slate-400">Active Agents:</span>
          <span className="text-sm font-semibold text-white">{activeEmployees}</span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-700"></div>

        {/* Tasks in Progress */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${tasksInProgress > 0 ? 'bg-[#6366F1] animate-pulse' : 'bg-slate-600'}`}></div>
          <span className="text-sm text-slate-400">Operations:</span>
          <span className="text-sm font-semibold text-white">{tasksInProgress}</span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-700"></div>

        {/* Daily Burn */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#FDE047]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
          </svg>
          <span className="text-sm text-slate-400">Daily Burn:</span>
          <span className="text-sm font-semibold text-[#FDE047]">${dailyBurn.toFixed(2)}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {teamId ? 'Team metrics live' : 'Select a team'}
          </span>
          <div className={`w-2 h-2 rounded-full ${teamId ? 'bg-green-500' : 'bg-slate-600'}`}></div>
        </div>
      </div>
    </div>
  );
}
