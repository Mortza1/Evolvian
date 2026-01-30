'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMarketplace, useTeamAgents } from '@/lib/services/agents';
import type { AgentTemplate } from '@/lib/services/agents';

interface TalentHubViewProps {
  teamId: string;
}

export default function TalentHubView({ teamId }: TalentHubViewProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hiringId, setHiringId] = useState<string | null>(null);

  // Fetch marketplace templates
  const {
    templates,
    categories,
    isLoading: loadingTemplates,
    error: templatesError,
    hireAgent,
  } = useMarketplace({ autoFetch: true });

  // Fetch team's hired agents to check hire status
  const {
    agents: hiredAgents,
    isLoading: loadingHired,
    refresh: refreshHired,
  } = useTeamAgents({ teamId: parseInt(teamId, 10), autoFetch: true });

  // Filter templates
  const [filteredTemplates, setFilteredTemplates] = useState<AgentTemplate[]>([]);

  useEffect(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (t) => t.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.role.toLowerCase().includes(query) ||
          t.specialty.toLowerCase().includes(query) ||
          t.skills.some((s) => s.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, searchQuery]);

  // Check if agent is already hired
  const isHired = useCallback(
    (templateId: string) => {
      return hiredAgents.some((a) => a.avatar_seed === templateId);
    },
    [hiredAgents]
  );

  // Handle hiring
  const handleHireAgent = async (template: AgentTemplate) => {
    setHiringId(template.id);
    try {
      const hired = await hireAgent({
        team_id: parseInt(teamId, 10),
        template_id: template.id,
      });

      if (hired) {
        await refreshHired();
      }
    } catch (err) {
      console.error('Failed to hire agent:', err);
    } finally {
      setHiringId(null);
    }
  };

  // Build category list from API or use defaults
  const categoryList = [
    { id: 'all', name: 'All Agents', icon: '👥' },
    ...(categories.length > 0
      ? categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))
      : [
          { id: 'management', name: 'Management', icon: '👔' },
          { id: 'research', name: 'Research', icon: '🔬' },
          { id: 'creative', name: 'Creative', icon: '🎨' },
          { id: 'technical', name: 'Technical', icon: '💻' },
          { id: 'operations', name: 'Operations', icon: '⚙️' },
        ]),
  ];

  const isLoading = loadingTemplates || loadingHired;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Agent Marketplace</h1>
        <p className="text-slate-400">
          Browse and hire AI specialists for your team
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name, role, or skills..."
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
        {categoryList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              selectedCategory === cat.id
                ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30'
                : 'bg-[#020617]/50 text-slate-400 border border-slate-700/50 hover:border-slate-600 hover:text-white'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Error State */}
      {templatesError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{templatesError}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass rounded-xl p-6 animate-pulse">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-700" />
                <div className="flex-1">
                  <div className="h-5 bg-slate-700 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-12 bg-slate-700 rounded mb-4" />
              <div className="h-8 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Agent Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const hired = isHired(template.id);
            const isHiring = hiringId === template.id;

            return (
              <div
                key={template.id}
                className={`glass rounded-xl p-6 transition-all ${
                  hired
                    ? 'border border-emerald-500/30 bg-emerald-500/5'
                    : 'hover:bg-[#1E293B]/60'
                }`}
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                      {template.name.charAt(0)}
                    </div>
                    {template.is_featured && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-xs">⭐</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-400 truncate">
                      {template.role}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-xs bg-[#6366F1]/20 text-[#6366F1] rounded">
                        Lv {template.level}
                      </span>
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4 text-[#FDE047]"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs text-slate-400">
                          {template.rating.toFixed(1)}
                        </span>
                      </div>
                      {template.is_premium && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                          Premium
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                  {template.description}
                </p>

                {/* Specialty */}
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-1">Specialty</div>
                  <div className="text-sm text-white">{template.specialty}</div>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.skills.slice(0, 3).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs bg-[#020617]/50 text-slate-400 rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                  {template.skills.length > 3 && (
                    <span className="px-2 py-1 text-xs text-slate-500">
                      +{template.skills.length - 3}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <div>
                    <div className="text-xs text-slate-500">Cost</div>
                    <div className="text-lg font-semibold text-[#FDE047]">
                      ${template.base_cost_per_hour.toFixed(2)}/hr
                    </div>
                  </div>

                  {hired ? (
                    <span className="px-4 py-2 bg-[#10B981]/20 text-[#10B981] text-sm font-medium rounded-lg flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Hired
                    </span>
                  ) : (
                    <button
                      onClick={() => handleHireAgent(template)}
                      disabled={isHiring}
                      className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isHiring ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Hiring...
                        </>
                      ) : (
                        'Hire Agent'
                      )}
                    </button>
                  )}
                </div>

                {/* Hires count */}
                {template.hires_count > 0 && (
                  <div className="mt-3 text-xs text-slate-500 text-center">
                    {template.hires_count.toLocaleString()} teams have hired this agent
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-600"
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
          <h3 className="text-lg font-semibold text-white mb-2">
            No agents found
          </h3>
          <p className="text-slate-400 text-sm">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
