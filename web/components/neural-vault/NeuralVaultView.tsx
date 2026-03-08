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
    <div className="h-full flex flex-col" style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}>
      {/* Tab bar */}
      <div className="shrink-0 border-b px-8 pt-5" style={{ borderColor: '#162025' }}>
        <div className="mb-0 flex items-center gap-1">
          {([
            { id: 'files', label: 'File Storage' },
            { id: 'knowledge', label: 'Knowledge Graph' },
          ] as const).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-4 py-2 text-[12px] transition-colors"
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
