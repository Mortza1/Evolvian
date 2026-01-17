'use client';

import { useState } from 'react';

export default function OfficeView() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const employees = [
    {
      id: 'scanner-01',
      name: 'Scanner',
      role: 'Document Analyst',
      department: 'Compliance',
      level: 8,
      xp: 65,
      status: 'working',
      salary: '$0.85/hr',
      tasksCompleted: 127,
      evolutions: 3,
    },
    {
      id: 'auditor-01',
      name: 'Auditor',
      role: 'Compliance Specialist',
      department: 'Compliance',
      level: 12,
      xp: 42,
      status: 'working',
      salary: '$1.20/hr',
      tasksCompleted: 89,
      evolutions: 7,
    },
    {
      id: 'reporter-01',
      name: 'Reporter',
      role: 'Report Writer',
      department: 'Compliance',
      level: 7,
      xp: 88,
      status: 'idle',
      salary: '$0.90/hr',
      tasksCompleted: 156,
      evolutions: 2,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">The Office</h1>
        <p className="text-slate-400">Manage your workforce</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-white mb-1">{employees.length}</div>
          <div className="text-sm text-slate-400">Total Employees</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {employees.filter(e => e.status === 'working').length}
          </div>
          <div className="text-sm text-slate-400">Currently Active</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-[#FDE047] mb-1">$2.95</div>
          <div className="text-sm text-slate-400">Total Hourly Cost</div>
        </div>
        <div className="glass rounded-lg p-4">
          <div className="text-2xl font-bold text-[#6366F1] mb-1">
            {employees.reduce((acc, e) => acc + e.evolutions, 0)}
          </div>
          <div className="text-sm text-slate-400">Total Evolutions</div>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((employee) => (
          <div
            key={employee.id}
            className="glass rounded-xl p-6 hover:bg-[#1E293B]/80 transition-all cursor-pointer"
            onClick={() => setSelectedEmployee(employee.id)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {employee.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#FDE047] rounded-full flex items-center justify-center text-xs font-bold text-[#020617]">
                  {employee.level}
                </div>
              </div>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  employee.status === 'working'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    employee.status === 'working' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'
                  }`}
                ></div>
                {employee.status}
              </div>
            </div>

            {/* Info */}
            <h3 className="text-lg font-bold text-white mb-1">{employee.name}</h3>
            <p className="text-sm text-slate-400 mb-4">{employee.role}</p>

            {/* XP Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Level Progress</span>
                <span>{employee.xp}%</span>
              </div>
              <div className="w-full h-2 bg-[#020617]/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8]"
                  style={{ width: `${employee.xp}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#020617]/30 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-white">{employee.tasksCompleted}</div>
                <div className="text-xs text-slate-400">Tasks</div>
              </div>
              <div className="bg-[#020617]/30 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-[#6366F1]">{employee.evolutions}</div>
                <div className="text-xs text-slate-400">Evolutions</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors">
                Direct Chat
              </button>
              <button className="px-3 py-2 bg-[#1E293B] hover:bg-[#2D3B52] text-white border border-slate-700 rounded-lg text-sm transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            {/* Salary */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
              <span className="text-xs text-slate-400">Hourly Rate</span>
              <span className="text-sm font-bold text-[#FDE047]">{employee.salary}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
