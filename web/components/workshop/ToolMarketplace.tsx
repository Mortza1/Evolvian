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
    <div className="px-8 py-6" style={{ fontFamily: "'Syne', sans-serif" }}>
      {/* Search + category row */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#2E4248]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools…"
            className="w-[220px] rounded-md border bg-[#111A1D] py-2 pl-8 pr-3 text-[12px] text-[#D8D4CC] placeholder-[#2E4248] outline-none transition-all"
            style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="rounded px-3 py-1.5 text-[11px] transition-all"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: isActive ? '#0F1E1B' : 'transparent',
                  color: isActive ? '#5A9E8F' : '#3A5056',
                  border: `1px solid ${isActive ? '#5A9E8F30' : '#1E2D30'}`,
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTools.map((tool, i) => {
          const installed = isInstalled(tool.id);
          const catColor = getCategoryColor(tool.category);
          return (
            <div
              key={tool.id}
              className="animate-evolve-in group relative flex cursor-pointer flex-col rounded-md border transition-all duration-150"
              style={{
                background: installed ? '#0F1E1B' : '#111A1D',
                borderColor: installed ? '#5A9E8F30' : '#1E2D30',
                animationDelay: `${i * 35}ms`,
              }}
              onClick={() => setSelectedTool(tool)}
              onMouseEnter={(e) => {
                if (!installed) {
                  e.currentTarget.style.borderColor = '#2A4A52';
                  e.currentTarget.style.background = '#131D20';
                }
              }}
              onMouseLeave={(e) => {
                if (!installed) {
                  e.currentTarget.style.borderColor = '#1E2D30';
                  e.currentTarget.style.background = '#111A1D';
                }
              }}
            >
              {/* Category top bar */}
              <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: `${catColor}60` }} />

              <div className="flex flex-1 flex-col p-5">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-[18px]"
                      style={{ background: `${catColor}12`, borderColor: `${catColor}30` }}
                    >
                      {tool.icon}
                    </div>
                    <div className="min-w-0">
                      <h3
                        style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                        className="truncate text-[14px] text-[#EAE6DF] transition-colors group-hover:text-[#5A9E8F]"
                      >
                        {tool.name}
                      </h3>
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2E4248]">
                        by {tool.developer}
                      </p>
                    </div>
                  </div>

                  {tool.status !== 'available' && (
                    <span
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52', borderColor: '#BF8A5230' }}
                      className="shrink-0 rounded border px-1.5 py-0.5 text-[9px] uppercase"
                    >
                      {tool.status}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mb-3 line-clamp-2 text-[12px] leading-relaxed text-[#4A6A72]">
                  {tool.description}
                </p>

                {/* Capabilities */}
                <div className="mb-4 flex flex-wrap gap-1">
                  {tool.capabilities.slice(0, 3).map((cap, idx) => (
                    <span
                      key={idx}
                      style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056' }}
                      className="rounded border bg-[#0B1215] px-2 py-0.5 text-[10px]"
                    >
                      {cap}
                    </span>
                  ))}
                  {tool.capabilities.length > 3 && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="px-1 text-[10px] text-[#2E4248]">
                      +{tool.capabilities.length - 3}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between border-t pt-3" style={{ borderColor: '#162025' }}>
                  <div>
                    {tool.pricingModel === 'free' ? (
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[13px] font-semibold text-[#5A9E8F]">
                        Free
                      </span>
                    ) : (
                      <div>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52' }} className="text-[14px] font-semibold">
                          ${tool.pricing.amount.toFixed(2)}
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="ml-1 text-[10px] text-[#3A5056]">
                          {tool.pricing.unit}
                        </span>
                      </div>
                    )}
                  </div>

                  {installed ? (
                    <div
                      className="flex items-center gap-1.5 rounded border px-2.5 py-1"
                      style={{ background: '#0F1E1B', borderColor: '#5A9E8F30', color: '#5A9E8F' }}
                    >
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px]">Installed</span>
                    </div>
                  ) : (
                    <button
                      className="rounded border px-3 py-1 text-[11px] transition-all"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F40', color: '#5A9E8F' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F20'; e.currentTarget.style.borderColor = '#5A9E8F70'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; e.currentTarget.style.borderColor = '#5A9E8F40'; }}
                    >
                      Install →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty */}
      {filteredTools.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border" style={{ background: '#111A1D', borderColor: '#1E2D30' }}>
            <svg className="h-5 w-5 text-[#2A3E44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[14px] text-[#3A5056]">No tools found</p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-1 text-[11px] text-[#2A3E44]">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Install Modal */}
      {selectedTool && (
        <ToolInstallModal tool={selectedTool} isOpen={!!selectedTool} onClose={() => setSelectedTool(null)} />
      )}
    </div>
  );
}
