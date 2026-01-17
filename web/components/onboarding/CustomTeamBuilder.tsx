'use client';

import { useState, useMemo } from 'react';
import { getAgents, type Agent } from '@/lib/agents';

interface CustomTeamBuilderProps {
  onComplete: (selectedEmployees: Agent[]) => void;
  onBack: () => void;
}

export default function CustomTeamBuilder({ onComplete, onBack }: CustomTeamBuilderProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedCreatorType, setSelectedCreatorType] = useState<'all' | 'official' | 'community'>('all');
  const [minRating, setMinRating] = useState(0);

  const allAgents = useMemo(() => getAgents(), []);

  // Extract unique values for filters
  const categories = useMemo(() => {
    const cats = new Set(allAgents.map(a => a.category));
    return [
      { id: 'all', name: 'All Categories' },
      ...Array.from(cats).sort().map(cat => ({ id: cat.toLowerCase(), name: cat }))
    ];
  }, [allAgents]);

  const models = useMemo(() => {
    const mods = new Set(allAgents.map(a => a.model));
    return ['all', ...Array.from(mods).sort()];
  }, [allAgents]);

  // Filter agents based on all criteria
  const filteredAgents = useMemo(() => {
    return allAgents.filter(agent => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          agent.name.toLowerCase().includes(query) ||
          agent.role.toLowerCase().includes(query) ||
          agent.specialization.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query) ||
          agent.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && agent.category.toLowerCase() !== selectedCategory) {
        return false;
      }

      // Model filter
      if (selectedModel !== 'all' && agent.model !== selectedModel) {
        return false;
      }

      // Creator type filter
      if (selectedCreatorType !== 'all' && agent.creator_type !== selectedCreatorType) {
        return false;
      }

      // Rating filter
      if (agent.rating < minRating) {
        return false;
      }

      return true;
    });
  }, [allAgents, searchQuery, selectedCategory, selectedModel, selectedCreatorType, minRating]);

  const isSelected = (agentId: string) =>
    selectedEmployees.some((e) => e.id === agentId);

  const toggleEmployee = (agent: Agent) => {
    if (isSelected(agent.id)) {
      setSelectedEmployees(selectedEmployees.filter((e) => e.id !== agent.id));
    } else {
      setSelectedEmployees([...selectedEmployees, agent]);
    }
  };

  const totalCost = selectedEmployees
    .reduce((acc, emp) => acc + emp.price_per_hour, 0)
    .toFixed(2);

  const handleContinue = () => {
    if (selectedEmployees.length > 0) {
      onComplete(selectedEmployees);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedModel('all');
    setSelectedCreatorType('all');
    setMinRating(0);
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#1E293B] rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Agent Marketplace</h1>
              <p className="text-sm text-slate-400">
                Browse {allAgents.length} specialized agents • {filteredAgents.length} shown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-slate-400">Selected</div>
              <div className="text-xl font-bold text-white">{selectedEmployees.length}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Total Cost</div>
              <div className="text-xl font-bold text-[#FDE047]">${totalCost}/hr</div>
            </div>
            <button
              onClick={handleContinue}
              disabled={selectedEmployees.length === 0}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                selectedEmployees.length > 0
                  ? 'bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Continue ({selectedEmployees.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-[#1E293B]/50 border-b border-slate-800 px-6 py-4 sticky top-[73px] z-10">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role, specialization, or tags..."
              className="w-full pl-12 pr-4 py-3 bg-[#020617] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-[#020617] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Model */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-4 py-2 bg-[#020617] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="all">All Models</option>
              {models.filter(m => m !== 'all').map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>

            {/* Creator Type */}
            <select
              value={selectedCreatorType}
              onChange={(e) => setSelectedCreatorType(e.target.value as any)}
              className="px-4 py-2 bg-[#020617] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="all">All Creators</option>
              <option value="official">Evolvian Official</option>
              <option value="community">Community</option>
            </select>

            {/* Rating */}
            <select
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
              className="px-4 py-2 bg-[#020617] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value={0}>All Ratings</option>
              <option value={4.5}>4.5+ Stars</option>
              <option value={4.7}>4.7+ Stars</option>
              <option value={4.9}>4.9+ Stars</option>
            </select>

            {/* Reset */}
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {filteredAgents.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No agents found</h3>
              <p className="text-slate-400 mb-4">Try adjusting your filters or search query</p>
              <button
                onClick={resetFilters}
                className="text-[#6366F1] hover:text-[#818CF8] font-medium"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => {
                const selected = isSelected(agent.id);

                return (
                  <div
                    key={agent.id}
                    onClick={() => toggleEmployee(agent)}
                    className={`glass rounded-xl p-5 cursor-pointer transition-all relative ${
                      selected
                        ? 'ring-2 ring-[#6366F1] bg-[#6366F1]/10'
                        : 'hover:bg-[#1E293B]/80'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-4 right-4">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          selected
                            ? 'bg-[#6366F1] border-[#6366F1]'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {selected && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Agent Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={agent.photo_url}
                          alt={agent.name}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FDE047] rounded-full flex items-center justify-center text-xs font-bold text-[#020617]">
                          {agent.level}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white truncate">{agent.name}</h3>
                        <p className="text-xs text-slate-400 truncate">{agent.role}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs font-semibold text-white">{agent.rating}</span>
                          <span className="text-xs text-slate-500">({agent.total_reviews})</span>
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#6366F1]/20 text-[#6366F1] font-medium">
                        {agent.model}
                      </span>
                      {agent.creator_type === 'official' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#FDE047]/20 text-[#FDE047] font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Official
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                          {agent.creator}
                        </span>
                      )}
                    </div>

                    {/* Specialization */}
                    <p className="text-xs font-semibold text-slate-300 mb-2">{agent.specialization}</p>

                    {/* Description */}
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                      {agent.description}
                    </p>

                    {/* Tools */}
                    {agent.tools.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1">Tools:</p>
                        <div className="flex flex-wrap gap-1">
                          {agent.tools.slice(0, 3).map((tool, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-[#020617]/50 text-slate-400 rounded"
                            >
                              {tool}
                            </span>
                          ))}
                          {agent.tools.length > 3 && (
                            <span className="text-xs px-2 py-0.5 text-slate-500">
                              +{agent.tools.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                      <span className="text-xs text-slate-400">Hourly Rate</span>
                      <span className="text-lg font-bold text-[#FDE047]">${agent.price_per_hour.toFixed(2)}/hr</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
