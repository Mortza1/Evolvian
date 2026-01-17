'use client';

import { useState, useEffect } from 'react';

interface HiringRevealProps {
  department: string;
  onComplete: () => void;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  level: number;
  salary: string;
  specialization: string;
}

export default function HiringReveal({ department, onComplete }: HiringRevealProps) {
  const [stage, setStage] = useState<'revealing' | 'complete'>('revealing');
  const [revealedCards, setRevealedCards] = useState<number>(0);
  const [showManagerMessage, setShowManagerMessage] = useState(false);

  // Department-specific employees
  const employeeData: Record<string, Employee[]> = {
    compliance: [
      {
        id: 'scanner-01',
        name: 'Scanner',
        role: 'Document Analyst',
        level: 8,
        salary: '$0.85/hr',
        specialization: 'Document parsing & data extraction',
      },
      {
        id: 'auditor-01',
        name: 'Auditor',
        role: 'Compliance Specialist',
        level: 12,
        salary: '$1.20/hr',
        specialization: 'Risk assessment & regulatory review',
      },
      {
        id: 'reporter-01',
        name: 'Reporter',
        role: 'Report Writer',
        level: 7,
        salary: '$0.90/hr',
        specialization: 'Summary generation & documentation',
      },
    ],
    sales: [
      {
        id: 'finder-01',
        name: 'Lead Finder',
        role: 'Research Specialist',
        level: 9,
        salary: '$1.00/hr',
        specialization: 'Lead generation & prospect research',
      },
      {
        id: 'qualifier-01',
        name: 'Qualifier',
        role: 'Sales Analyst',
        level: 11,
        salary: '$1.30/hr',
        specialization: 'Lead qualification & scoring',
      },
      {
        id: 'outreach-01',
        name: 'Outreach Bot',
        role: 'Communications',
        level: 8,
        salary: '$0.90/hr',
        specialization: 'Personalized outreach campaigns',
      },
    ],
    marketing: [
      {
        id: 'writer-01',
        name: 'Content Writer',
        role: 'Creative Specialist',
        level: 10,
        salary: '$1.00/hr',
        specialization: 'Content creation & copywriting',
      },
      {
        id: 'social-01',
        name: 'Social Manager',
        role: 'Social Media',
        level: 8,
        salary: '$0.80/hr',
        specialization: 'Social media management',
      },
      {
        id: 'analyst-01',
        name: 'Analyst',
        role: 'Performance Analyst',
        level: 9,
        salary: '$0.70/hr',
        specialization: 'Campaign analytics & optimization',
      },
    ],
  };

  const employees = employeeData[department] || employeeData.compliance;

  // Calculate total salary
  const totalSalary = employees
    .reduce((acc, emp) => {
      const salary = parseFloat(emp.salary.replace('$', '').replace('/hr', ''));
      return acc + salary;
    }, 0)
    .toFixed(2);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];

    // Reveal cards one by one
    const delays = [500, 1200, 1900];
    delays.forEach((delay, index) => {
      const timeout = setTimeout(() => {
        setRevealedCards(index + 1);
      }, delay);
      timeouts.push(timeout);
    });

    // Show manager message after all cards are revealed
    const managerTimeout = setTimeout(() => {
      setShowManagerMessage(true);
      setStage('complete');
    }, 2800);
    timeouts.push(managerTimeout);

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-6">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#6366F1] rounded-full filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#FDE047] rounded-full filter blur-[128px] opacity-10 animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcoming Your New Team
          </h1>
          <p className="text-slate-400 text-lg">
            Your employees are signing in...
          </p>
        </div>

        {/* Employee ID Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {employees.map((employee, index) => {
            const isRevealed = revealedCards > index;

            return (
              <div
                key={employee.id}
                className={`transition-all duration-700 transform ${
                  isRevealed
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 translate-y-4'
                }`}
              >
                <div className="glass rounded-2xl p-6 hover:bg-[#1E293B]/80 transition-all">
                  {/* Header with Avatar and Level */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">
                          {employee.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-[#FDE047] rounded-full flex items-center justify-center text-xs font-bold text-[#020617] shadow-lg">
                        {employee.level}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      Active
                    </div>
                  </div>

                  {/* Employee Info */}
                  <h3 className="text-xl font-bold text-white mb-1">{employee.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{employee.role}</p>

                  {/* Specialization */}
                  <div className="mb-4 p-3 bg-[#020617]/50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                      Specialization
                    </p>
                    <p className="text-sm text-slate-300">{employee.specialization}</p>
                  </div>

                  {/* Salary */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <span className="text-sm text-slate-400">Hourly Rate</span>
                    <span className="text-lg font-bold text-[#FDE047]">{employee.salary}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Manager Message */}
        {showManagerMessage && (
          <div className="glass rounded-2xl p-8 max-w-2xl mx-auto animate-fadeIn">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">EVO</span>
                </div>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-[#020617]"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Evo</h3>
                <p className="text-sm text-slate-400">Your Chief of Staff</p>
              </div>
            </div>

            <div className="glass-light rounded-lg p-4 mb-6">
              <p className="text-slate-200 leading-relaxed mb-3">
                Perfect! I've brought on a <span className="font-semibold text-white">{employees[0].name}</span>,
                an <span className="font-semibold text-white">{employees[1].name}</span>, and
                a <span className="font-semibold text-white">{employees[2].name}</span>.
              </p>
              <p className="text-slate-200 leading-relaxed">
                Their combined hourly salary is{' '}
                <span className="font-bold text-[#FDE047] text-lg">${totalSalary}</span>.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={onComplete}
                className="px-8 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all duration-200"
              >
                Give Them Their First Task
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
