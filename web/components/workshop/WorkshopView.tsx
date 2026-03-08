'use client';

import { useState } from 'react';
import ToolMarketplace from './ToolMarketplace';
import MyToolbox from './MyToolbox';

export default function WorkshopView() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'toolbox'>('marketplace');

  return (
    <div className="flex h-full flex-col" style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <div className="shrink-0 border-b px-8 pt-5" style={{ borderColor: '#162025' }}>
        <div className="flex items-end justify-between">
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1 text-[10px] uppercase tracking-widest text-[#3A5056]">
              workshop
            </p>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }} className="text-[22px] leading-none text-[#EAE6DF]">
              Tool Marketplace
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex items-center gap-1">
          {([
            { id: 'marketplace', label: 'Marketplace' },
            { id: 'toolbox',     label: 'My Toolbox' },
          ] as const).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 text-[12px] transition-colors"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: isActive ? '#5A9E8F' : '#3A5056',
                  borderBottom: isActive ? '2px solid #5A9E8F' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activeTab === 'marketplace' ? <ToolMarketplace /> : <MyToolbox />}
      </div>
    </div>
  );
}
