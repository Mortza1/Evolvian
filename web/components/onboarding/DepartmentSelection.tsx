'use client';

import { useState } from 'react';

interface DepartmentSelectionProps {
  onSelect: (department: string) => void;
}

export default function DepartmentSelection({ onSelect }: DepartmentSelectionProps) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const departments = [
    {
      id: 'compliance',
      name: 'Compliance & Legal',
      description: 'Review documents for regulatory compliance, risk assessment, and legal requirements',
      employees: ['Scanner', 'Auditor', 'Reporter'],
      salary: '$2.95/hr',
      recommended: true,
      icon: ShieldIcon,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'sales',
      name: 'Sales & Outreach',
      description: 'Generate leads, qualify prospects, and personalize outreach campaigns',
      employees: ['Lead Finder', 'Qualifier', 'Outreach Bot'],
      salary: '$3.20/hr',
      recommended: false,
      icon: RocketIcon,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      id: 'marketing',
      name: 'Marketing & Content',
      description: 'Create content, manage social media, and analyze campaign performance',
      employees: ['Content Writer', 'Social Manager', 'Analyst'],
      salary: '$2.50/hr',
      recommended: false,
      icon: MegaphoneIcon,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const handleSelect = (deptId: string) => {
    setSelectedDept(deptId);
    // Brief delay for visual feedback
    setTimeout(() => {
      onSelect(deptId);
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-6">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#6366F1] rounded-full filter blur-[128px] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Choose Your First Department
          </h1>
          <p className="text-slate-400 text-lg">
            Start with a specialized team. You can add more departments anytime.
          </p>
        </div>

        {/* Department Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {departments.map((dept) => {
            const Icon = dept.icon;
            const isSelected = selectedDept === dept.id;

            return (
              <button
                key={dept.id}
                onClick={() => handleSelect(dept.id)}
                disabled={isSelected}
                className={`relative glass rounded-2xl p-6 text-left transition-all duration-300 hover:bg-[#1E293B]/80 ${
                  isSelected ? 'ring-2 ring-[#6366F1] scale-105' : 'hover:scale-105'
                }`}
              >
                {/* Recommended Badge */}
                {dept.recommended && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#FDE047] to-[#FACC15] text-[#020617] text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    RECOMMENDED
                  </div>
                )}

                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${dept.color} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-2">{dept.name}</h3>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  {dept.description}
                </p>

                {/* Team Members */}
                <div className="mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                    Team Members
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dept.employees.map((employee, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-[#020617]/50 text-slate-300 px-2 py-1 rounded-md"
                      >
                        {employee}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Salary */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <span className="text-sm text-slate-400">Combined Salary</span>
                  <span className="text-lg font-bold text-[#FDE047]">{dept.salary}</span>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute inset-0 bg-[#6366F1]/10 rounded-2xl flex items-center justify-center">
                    <div className="w-12 h-12 bg-[#6366F1] rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <p className="text-center text-slate-500 text-sm">
          Don't worry - you can hire individual employees or build custom teams later
        </p>
      </div>
    </div>
  );
}

// Icons
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}
