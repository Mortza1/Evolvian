'use client';

import { useState } from 'react';
import FileVaultView from './FileVaultView';
import KnowledgeGraphView from './KnowledgeGraphView';

interface NeuralVaultViewProps {
  teamId?: string;
}

export default function NeuralVaultView({ teamId }: NeuralVaultViewProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'knowledge'>('files');

  return (
    <div className="h-full flex flex-col bg-[#0B0E14]">
      {/* Tab Navigation - Compact */}
      <div className="flex-shrink-0 border-b border-[#161B22] bg-[#0B0E14]">
        <div className="px-6 pt-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all ${
                activeTab === 'files'
                  ? 'bg-[#161B22] text-[#E2E8F0] border-t border-l border-r border-[#2D3748]'
                  : 'text-slate-600 hover:text-[#E2E8F0] hover:bg-[#161B22]/50'
              }`}
            >
              File Storage
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all ${
                activeTab === 'knowledge'
                  ? 'bg-[#161B22] text-[#E2E8F0] border-t border-l border-r border-[#2D3748]'
                  : 'text-slate-600 hover:text-[#E2E8F0] hover:bg-[#161B22]/50'
              }`}
            >
              Knowledge Graph
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'files' ? (
          <FileVaultView teamId={teamId} />
        ) : (
          <KnowledgeGraphView teamId={teamId} />
        )}
      </div>
    </div>
  );
}
