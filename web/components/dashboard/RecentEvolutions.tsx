'use client';

export default function RecentEvolutions() {
  const evolutions = [
    {
      id: 1,
      employee: 'Auditor',
      role: 'Compliance Specialist',
      level: 12,
      evolution: 'Learned a new rule regarding ISO-27001 Section 4.2 compliance checks',
      timestamp: '2 hours ago',
      impact: 'high',
    },
    {
      id: 2,
      employee: 'Scanner',
      role: 'Document Analyst',
      level: 8,
      evolution: 'Improved accuracy in detecting risk patterns by 15%',
      timestamp: '5 hours ago',
      impact: 'medium',
    },
    {
      id: 3,
      employee: 'Content Writer',
      role: 'Marketing',
      level: 10,
      evolution: 'Adapted writing style based on user feedback for technical documentation',
      timestamp: '1 day ago',
      impact: 'medium',
    },
    {
      id: 4,
      employee: 'Reporter',
      role: 'Compliance',
      level: 7,
      evolution: 'Enhanced report formatting for executive summaries',
      timestamp: '1 day ago',
      impact: 'low',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Recent Evolutions</h2>
        <button className="text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors">
          View all
        </button>
      </div>

      <div className="space-y-3">
        {evolutions.map((evolution) => (
          <div
            key={evolution.id}
            className="glass rounded-lg p-4 hover:bg-[#1E293B]/80 transition-all group cursor-pointer"
          >
            <div className="flex items-start gap-4">
              {/* Employee Avatar with Glow */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-lg flex items-center justify-center pulse-glow">
                  <span className="text-white font-bold text-sm">
                    {evolution.employee.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FDE047] rounded-full flex items-center justify-center text-xs font-bold text-[#020617]">
                  {evolution.level}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#6366F1] transition-colors">
                      {evolution.employee}
                    </h3>
                    <p className="text-xs text-slate-400">{evolution.role}</p>
                  </div>
                  <span className="text-xs text-slate-500">{evolution.timestamp}</span>
                </div>

                <p className="text-sm text-slate-300 mb-2 leading-relaxed">
                  {evolution.evolution}
                </p>

                {/* Impact Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      evolution.impact === 'high'
                        ? 'bg-green-500/20 text-green-400'
                        : evolution.impact === 'medium'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {evolution.impact === 'high'
                      ? '🚀 High Impact'
                      : evolution.impact === 'medium'
                      ? '📈 Medium Impact'
                      : '💡 Low Impact'}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-500">Evolution confirmed</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State Placeholder */}
      <div className="glass rounded-lg p-8 text-center mt-4">
        <div className="w-16 h-16 bg-[#6366F1]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-white mb-2">
          Your employees are learning
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          As your AI workforce completes tasks and receives feedback, they'll evolve and appear here.
          Each evolution makes them smarter and more efficient.
        </p>
      </div>
    </div>
  );
}
