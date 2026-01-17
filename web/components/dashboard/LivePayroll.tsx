'use client';

import { useEffect, useState } from 'react';

export default function LivePayroll() {
  const [currentCost, setCurrentCost] = useState(24.50);

  // Simulate cost incrementing in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCost((prev) => parseFloat((prev + 0.01).toFixed(2)));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const employees = [
    { name: 'Scanner', role: 'Compliance', rate: 0.12, status: 'working' },
    { name: 'Auditor', role: 'Compliance', rate: 0.18, status: 'working' },
    { name: 'Reporter', role: 'Compliance', rate: 0.08, status: 'working' },
    { name: 'Sales Bot', role: 'Sales', rate: 0.15, status: 'idle' },
    { name: 'Content Writer', role: 'Marketing', rate: 0.10, status: 'idle' },
  ];

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
            ${currentCost}
          </span>
          <span className="text-xs text-slate-400">/ today</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span>8% lower than yesterday</span>
        </div>
      </div>

      {/* Employee List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Active Employees
        </h4>
        {employees.map((employee, index) => (
          <div
            key={index}
            className="glass-light rounded-lg p-3 hover:bg-[#1E293B]/60 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    employee.status === 'working'
                      ? 'bg-green-500 pulse-glow'
                      : 'bg-slate-600'
                  }`}
                ></div>
                <span className="text-sm font-medium text-white">
                  {employee.name}
                </span>
              </div>
              <span className="text-xs text-[#FDE047] font-semibold">
                ${employee.rate}/min
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{employee.role}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  employee.status === 'working'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                {employee.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-white">12</div>
            <div className="text-xs text-slate-400">Total Staff</div>
          </div>
          <div>
            <div className="text-lg font-bold text-[#FDE047]">$180</div>
            <div className="text-xs text-slate-400">This Month</div>
          </div>
        </div>
      </div>
    </div>
  );
}
