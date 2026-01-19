'use client';

import { useEffect, useState } from 'react';
import { getHiredAgents } from '@/lib/agents';

interface CorporateStatusBarProps {
  teamId?: string;
}

export default function CorporateStatusBar({ teamId }: CorporateStatusBarProps) {
  const [monthlyPayroll, setMonthlyPayroll] = useState(0);
  const [burnRate, setBurnRate] = useState(0);
  const [activeWorkforce, setActiveWorkforce] = useState(0);
  const [totalCredits] = useState(5000);
  const [creditsUsed, setCreditsUsed] = useState(0);

  useEffect(() => {
    if (!teamId) {
      setMonthlyPayroll(0);
      setBurnRate(0);
      setActiveWorkforce(0);
      return;
    }

    const agents = getHiredAgents(teamId);
    const onlineAgents = agents.filter(a => a.isOnline);
    setActiveWorkforce(onlineAgents.length);

    const monthlyTotal = onlineAgents.reduce((sum, agent) =>
      sum + (agent.price_per_hour * 160), 0
    );
    setMonthlyPayroll(monthlyTotal);

    const hourlyRate = onlineAgents.reduce((sum, agent) =>
      sum + agent.price_per_hour, 0
    );
    const perMinute = hourlyRate / 60;
    setBurnRate(perMinute);

    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const minutesToday = (now.getTime() - midnight.getTime()) / (1000 * 60);
    const initialCreditsUsed = perMinute * minutesToday;
    setCreditsUsed(initialCreditsUsed);

    const interval = setInterval(() => {
      const costPerSecond = perMinute / 60;
      setCreditsUsed(prev => prev + costPerSecond);
    }, 1000);

    return () => clearInterval(interval);
  }, [teamId]);

  const creditsPercent = ((totalCredits - creditsUsed) / totalCredits) * 100;
  const creditsRemaining = totalCredits - creditsUsed;

  return (
    <div className="h-14 bg-[#0A0F1E] border-b border-slate-800/50 flex items-center px-6">
      <div className="flex items-center justify-between w-full max-w-[1920px] mx-auto">
        {/* Left Section - Metrics */}
        <div className="flex items-center gap-6">
          {/* Monthly Payroll */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Payroll</div>
            <div className="text-sm font-semibold text-white tabular-nums">
              ${monthlyPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="w-px h-4 bg-slate-700/50"></div>

          {/* Burn Rate */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Burn</div>
            <div className="text-sm font-semibold text-red-400 tabular-nums">
              ${burnRate.toFixed(2)}/min
            </div>
          </div>

          <div className="w-px h-4 bg-slate-700/50"></div>

          {/* Active Workforce */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Active</div>
            <div className="text-sm font-semibold text-emerald-400 tabular-nums">
              {activeWorkforce}
            </div>
          </div>
        </div>

        {/* Right Section - Credits */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Credits</div>
            <div className="text-sm font-semibold text-white tabular-nums">
              ${creditsRemaining.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Compact Progress Bar */}
          <div className="w-24 h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                creditsPercent > 50
                  ? 'bg-emerald-500'
                  : creditsPercent > 20
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, creditsPercent)}%` }}
            />
          </div>

          {/* Status Indicator */}
          <div className={`w-1.5 h-1.5 rounded-full ${teamId ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
        </div>
      </div>
    </div>
  );
}
