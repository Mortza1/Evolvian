'use client';

import { useState } from 'react';

interface ManagerInputBarProps {
  onNewOperation: () => void;
}

export default function ManagerInputBar({ onNewOperation }: ManagerInputBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onNewOperation();
      setQuery('');
    }
  };

  return (
    <div className="glass rounded-xl p-6 mb-6">
      <div className="flex items-center gap-4">
        {/* Evo Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What should the team focus on today?"
              className="w-full px-6 py-4 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                onClick={onNewOperation}
                className="px-4 py-2 text-sm text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors"
              >
                Advanced
              </button>
              <button
                type="submit"
                disabled={!query.trim()}
                className="px-6 py-2 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-medium rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Commence
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-slate-500">Quick Actions:</span>
        <button className="px-3 py-1.5 text-xs bg-[#020617]/50 border border-slate-700/50 rounded-md text-slate-300 hover:bg-[#020617]/70 hover:border-slate-600 transition-all">
          Analyze Documents
        </button>
        <button className="px-3 py-1.5 text-xs bg-[#020617]/50 border border-slate-700/50 rounded-md text-slate-300 hover:bg-[#020617]/70 hover:border-slate-600 transition-all">
          Generate Report
        </button>
        <button className="px-3 py-1.5 text-xs bg-[#020617]/50 border border-slate-700/50 rounded-md text-slate-300 hover:bg-[#020617]/70 hover:border-slate-600 transition-all">
          Code Review
        </button>
        <button className="px-3 py-1.5 text-xs bg-[#020617]/50 border border-slate-700/50 rounded-md text-slate-300 hover:bg-[#020617]/70 hover:border-slate-600 transition-all">
          Research Topic
        </button>
      </div>
    </div>
  );
}
