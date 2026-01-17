'use client';

import { useState, useEffect } from 'react';
import { getAgents, hireAgent, isAgentHired, Agent } from '@/lib/agents';

interface TalentHubViewProps {
  teamId: string;
}

export default function TalentHubView({ teamId }: TalentHubViewProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const allAgents = getAgents();
    setAgents(allAgents);
    setFilteredAgents(allAgents);
  }, []);

  useEffect(() => {
    let filtered = agents;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.specialization.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAgents(filtered);
  }, [agents, selectedCategory, searchQuery]);

  const categories = [
    { id: 'all', name: 'All Agents' },
    { id: 'Compliance', name: 'Compliance & Legal' },
    { id: 'Sales', name: 'Sales' },
    { id: 'Marketing', name: 'Marketing' },
    { id: 'Engineering', name: 'Engineering' },
    { id: 'Finance', name: 'Finance' },
    { id: 'Support', name: 'Support' },
    { id: 'HR', name: 'HR' },
    { id: 'Data', name: 'Data' },
  ];

  const handleHireAgent = (agent: Agent) => {
    hireAgent(agent, teamId);
    // Trigger re-render to update hired status
    setAgents([...agents]);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Agent Store</h1>
        <p className="text-slate-400">Browse and hire AI agents for your team</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name, role, or specialty..."
            className="w-full px-4 py-3 pl-12 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30'
                : 'bg-[#020617]/50 text-slate-400 border border-slate-700/50 hover:border-slate-600 hover:text-white'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => {
          const hired = isAgentHired(agent.id, teamId);

          return (
            <div
              key={agent.id}
              className="glass rounded-xl p-6 hover:bg-[#1E293B]/60 transition-all"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={agent.photo_url}
                  alt={agent.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">{agent.name}</h3>
                  <p className="text-sm text-slate-400 truncate">{agent.role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-xs bg-[#6366F1]/20 text-[#6366F1] rounded">
                      Lv {agent.level}
                    </span>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-[#FDE047]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs text-slate-400">{agent.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{agent.description}</p>

              {/* Specialization */}
              <div className="mb-4">
                <div className="text-xs text-slate-500 mb-1">Specialization</div>
                <div className="text-sm text-white">{agent.specialization}</div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {agent.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-[#020617]/50 text-slate-400 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
                {agent.tags.length > 3 && (
                  <span className="px-2 py-1 text-xs text-slate-500">
                    +{agent.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                <div>
                  <div className="text-xs text-slate-500">Cost</div>
                  <div className="text-lg font-semibold text-[#FDE047]">
                    ${agent.price_per_hour.toFixed(2)}/hr
                  </div>
                </div>

                {hired ? (
                  <span className="px-4 py-2 bg-[#10B981]/20 text-[#10B981] text-sm font-medium rounded-lg">
                    ✓ Hired
                  </span>
                ) : (
                  <button
                    onClick={() => handleHireAgent(agent)}
                    className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E3] transition-colors"
                  >
                    Hire Agent
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No agents found</h3>
          <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
