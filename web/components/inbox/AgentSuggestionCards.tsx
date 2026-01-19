'use client';

import { useState } from 'react';
import { Agent, hireAgent, isAgentHired } from '@/lib/agents';

interface AgentSuggestionCardsProps {
  agents: Agent[];
  teamId: string;
  onAgentHired?: (agent: Agent) => void;
}

export default function AgentSuggestionCards({ agents, teamId, onAgentHired }: AgentSuggestionCardsProps) {
  const [hiringAgentId, setHiringAgentId] = useState<string | null>(null);

  const handleHire = async (agent: Agent) => {
    // Check if already hired
    if (isAgentHired(agent.id, teamId)) {
      return;
    }

    setHiringAgentId(agent.id);

    // Simulate hiring delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Hire the agent
    hireAgent(agent, teamId, { isOnline: true });

    setHiringAgentId(null);

    // Callback
    if (onAgentHired) {
      onAgentHired(agent);
    }
  };

  return (
    <div className="my-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-[#6366F1] rounded-full"></div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Recommended Specialists
        </p>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 gap-2">
        {agents.map((agent) => {
          const alreadyHired = isAgentHired(agent.id, teamId);
          const isHiring = hiringAgentId === agent.id;

          return (
            <div
              key={agent.id}
              className="p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:border-slate-600 transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex-shrink-0 border border-slate-600 overflow-hidden">
                  {agent.photo_url ? (
                    <img
                      src={agent.photo_url}
                      alt={agent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      👤
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {agent.name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">{agent.role}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold text-[#FDE047]">
                        ${agent.price_per_hour}/hr
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                    {agent.specialization}
                  </p>

                  {/* Tags */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {agent.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Hire Button */}
                    <button
                      onClick={() => handleHire(agent)}
                      disabled={alreadyHired || isHiring}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all flex-shrink-0 ${
                        alreadyHired
                          ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                          : isHiring
                          ? 'bg-[#6366F1]/50 text-white cursor-wait'
                          : 'bg-[#6366F1] hover:bg-[#5558E3] text-white'
                      }`}
                    >
                      {isHiring ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Hiring...
                        </div>
                      ) : alreadyHired ? (
                        'Hired'
                      ) : (
                        'Hire'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="flex items-start gap-2 p-2 rounded bg-slate-800/20 border border-slate-800">
        <svg
          className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-xs text-slate-500">
          These specialists will join your team and appear in the Office view
        </p>
      </div>
    </div>
  );
}
