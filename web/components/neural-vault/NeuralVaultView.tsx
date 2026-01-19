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
    <div className="h-full flex flex-col bg-[#020617]">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-[#020617]">
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === 'files'
                  ? 'bg-[#1E293B] text-white border-t border-l border-r border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              File Storage
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === 'knowledge'
                  ? 'bg-[#1E293B] text-white border-t border-l border-r border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
