'use client';

import { useEffect, useState } from 'react';
import { getHiredAgents, HiredAgent } from '@/lib/agents';

interface LivePayrollProps {
  teamId: string;
}

export default function LivePayroll({ teamId }: LivePayrollProps) {
  const [employees, setEmployees] = useState<HiredAgent[]>([]);
  const [todayCost, setTodayCost] = useState(0);

  useEffect(() => {
    // Get team-specific hired agents
    const teamAgents = getHiredAgents(teamId);
    setEmployees(teamAgents);

    // Calculate today's cost (simulated - hours since midnight * hourly rate)
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const hoursToday = (now.getTime() - midnight.getTime()) / (1000 * 60 * 60);

    const initialCost = teamAgents
      .filter(a => a.isOnline)
      .reduce((sum, agent) => sum + (agent.price_per_hour * hoursToday), 0);

    setTodayCost(initialCost);
  }, [teamId]);

  // Simulate cost incrementing in real-time for online agents
  useEffect(() => {
    if (employees.length === 0) return;

    const interval = setInterval(() => {
      const onlineAgents = employees.filter(a => a.isOnline);
      const costPerSecond = onlineAgents.reduce((sum, agent) =>
        sum + (agent.price_per_hour / 3600), 0
      );

      setTodayCost((prev) => parseFloat((prev + costPerSecond).toFixed(4)));
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [employees]);

  // Calculate stats
  const totalStaff = employees.length;
  const onlineStaff = employees.filter(a => a.isOnline).length;
  const totalHourlyRate = employees.reduce((sum, agent) => sum + agent.price_per_hour, 0);

  // Estimate monthly cost (assuming 720 hours per month, 50% utilization)
  const estimatedMonthlyCost = totalHourlyRate * 720 * 0.5;

  return (
    <div className="h-[calc(50vh)] flex flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-1">Live Payroll</h3>
        <p className="text-xs text-slate-400">Real-time workforce costs</p>
      </div>

      {/* Current Session Cost */}
      <div className="glass rounded-lg p-4 mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-[#FDE047]">
            ${todayCost.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400">/ today</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{onlineStaff} of {totalStaff} agents online</span>
        </div>
      </div>

      {/* Employee List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Team Agents ({employees.length})
        </h4>
        {employees.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xs text-slate-400">No agents hired</p>
          </div>
        ) : (
          employees.map((employee) => (
            <div
              key={employee.id}
              className="glass-light rounded-lg p-3 hover:bg-[#1E293B]/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      employee.isOnline
                        ? 'bg-green-500 pulse-glow'
                        : 'bg-slate-600'
                    }`}
                  ></div>
                  <span className="text-sm font-medium text-white">
                    {employee.name}
                  </span>
                </div>
                <span className="text-xs text-[#FDE047] font-semibold">
                  ${employee.price_per_hour.toFixed(2)}/hr
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{employee.role}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    employee.isOnline
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}
                >
                  {employee.isOnline ? 'online' : 'offline'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-white">{totalStaff}</div>
            <div className="text-xs text-slate-400">Total Agents</div>
          </div>
          <div>
            <div className="text-lg font-bold text-[#FDE047]">
              ${estimatedMonthlyCost.toFixed(0)}
            </div>
            <div className="text-xs text-slate-400">Est. Monthly</div>
          </div>
        </div>
      </div>
    </div>
  );
}
