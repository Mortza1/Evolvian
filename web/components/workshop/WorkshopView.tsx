'use client';

import { useState } from 'react';
import ToolMarketplace from './ToolMarketplace';
import MyToolbox from './MyToolbox';

export default function WorkshopView() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'toolbox'>('marketplace');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">The Workshop</h1>
            <p className="text-sm text-slate-400">
              Equip your workforce with specialized tools and integrations
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-[#020617]/50 rounded-lg">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'marketplace'
                  ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab('toolbox')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'toolbox'
                  ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Toolbox
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'marketplace' ? <ToolMarketplace /> : <MyToolbox />}
      </div>
    </div>
  );
}
