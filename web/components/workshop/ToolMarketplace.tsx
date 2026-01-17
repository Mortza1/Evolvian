'use client';

import { useState, useMemo } from 'react';
import { DEMO_TOOLS, Tool, ToolCategory, getCategoryColor, getInstalledTools } from '@/lib/tools';
import ToolInstallModal from './ToolInstallModal';

export default function ToolMarketplace() {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const installedTools = getInstalledTools();

  const categories: Array<{ id: ToolCategory | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'All Tools', icon: '🛠️' },
    { id: 'research', label: 'Research', icon: '🔍' },
    { id: 'communication', label: 'Communication', icon: '💬' },
    { id: 'analysis', label: 'Analysis', icon: '📊' },
    { id: 'legal', label: 'Legal', icon: '⚖️' },
    { id: 'data', label: 'Data', icon: '🗄️' },
    { id: 'automation', label: 'Automation', icon: '⚡' },
  ];

  const filteredTools = useMemo(() => {
    return DEMO_TOOLS.filter((tool) => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const isInstalled = (toolId: string) => {
    return installedTools.some((t) => t.toolId === toolId);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Search & Filters */}
      <div className="mb-6">
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools..."
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

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
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
              <span className="mr-2">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className="glass rounded-xl p-6 hover:bg-[#1E293B]/60 transition-all cursor-pointer group"
            onClick={() => setSelectedTool(tool)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: getCategoryColor(tool.category) + '30' }}
                >
                  {tool.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-[#6366F1] transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-slate-500">by {tool.developer}</p>
                </div>
              </div>

              {tool.status !== 'available' && (
                <span className="px-2 py-1 text-xs bg-[#FDE047]/20 text-[#FDE047] rounded-md uppercase font-semibold">
                  {tool.status}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{tool.description}</p>

            {/* Capabilities */}
            <div className="flex flex-wrap gap-1 mb-4">
              {tool.capabilities.slice(0, 3).map((cap, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-[#020617]/50 text-slate-400 rounded-md"
                >
                  {cap}
                </span>
              ))}
              {tool.capabilities.length > 3 && (
                <span className="px-2 py-1 text-xs text-slate-500">
                  +{tool.capabilities.length - 3}
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
              <div>
                {tool.pricingModel === 'free' ? (
                  <span className="text-[#10B981] font-semibold">Free</span>
                ) : (
                  <div>
                    <div className="text-[#FDE047] font-semibold">
                      ${tool.pricing.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500">{tool.pricing.unit}</div>
                  </div>
                )}
              </div>

              {isInstalled(tool.id) ? (
                <span className="px-4 py-2 bg-[#10B981]/20 text-[#10B981] text-sm font-medium rounded-lg">
                  ✓ Installed
                </span>
              ) : (
                <button className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E3] transition-colors">
                  Install
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTools.length === 0 && (
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
          <h3 className="text-lg font-semibold text-white mb-2">No tools found</h3>
          <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Install Modal */}
      {selectedTool && (
        <ToolInstallModal
          tool={selectedTool}
          isOpen={!!selectedTool}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </div>
  );
}
