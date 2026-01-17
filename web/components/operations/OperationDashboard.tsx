'use client';

import { useState } from 'react';
import type { Agent } from '@/lib/agents';

interface OperationDashboardProps {
  agents: Agent[];
  onStartOperation: (config: OperationConfig) => void;
  onBack?: () => void;
}

export interface OperationConfig {
  title: string;
  document?: File;
  rulebook: string;
  context: string;
}

export default function OperationDashboard({ agents, onStartOperation, onBack }: OperationDashboardProps) {
  const [operationTitle, setOperationTitle] = useState('');
  const [selectedRulebook, setSelectedRulebook] = useState('gdpr');
  const [context, setContext] = useState('');
  const [document, setDocument] = useState<File | null>(null);

  const rulebooks = [
    { id: 'gdpr', name: 'GDPR Standard', description: 'EU General Data Protection Regulation' },
    { id: 'hipaa', name: 'HIPAA Compliance', description: 'US Healthcare Privacy' },
    { id: 'soc2', name: 'SOC 2', description: 'Security & Availability Controls' },
    { id: 'iso27001', name: 'ISO 27001', description: 'Information Security Management' },
    { id: 'custom', name: 'Custom Rulebook', description: 'Upload your own policies' },
  ];

  const totalCost = agents.reduce((sum, agent) => sum + agent.price_per_hour, 0).toFixed(2);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocument(e.target.files[0]);
      if (!operationTitle) {
        setOperationTitle(`Review: ${e.target.files[0].name.replace(/\.[^/.]+$/, '')}`);
      }
    }
  };

  const handleStartOperation = () => {
    if (document || operationTitle) {
      onStartOperation({
        title: operationTitle || 'New Operation',
        document: document || undefined,
        rulebook: selectedRulebook,
        context,
      });
    }
  };

  const canStart = (document || operationTitle.trim()) && agents.length > 0;

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-[#1E293B] rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">New Operation</h1>
              <p className="text-sm text-slate-400">Configure your team's first mission</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-slate-400">Operational Cost</div>
              <div className="text-lg font-bold text-[#FDE047]">${totalCost}/hr</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Operation Setup */}
            <div className="lg:col-span-2 space-y-6">
              {/* Operation Title */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Operation Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Operation Name
                    </label>
                    <input
                      type="text"
                      value={operationTitle}
                      onChange={(e) => setOperationTitle(e.target.value)}
                      placeholder="e.g., GDPR Compliance Review"
                      className="w-full px-4 py-3 bg-[#020617] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    />
                  </div>
                </div>
              </div>

              {/* Document Upload */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Upload Document</h2>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    document
                      ? 'border-[#6366F1] bg-[#6366F1]/5'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {document ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 bg-[#6366F1]/20 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-8 h-8 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{document.name}</p>
                          <p className="text-sm text-slate-400">
                            {(document.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setDocument(null);
                          }}
                          className="text-sm text-slate-400 hover:text-white"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">Drop your file here</p>
                          <p className="text-sm text-slate-400">or click to browse</p>
                        </div>
                        <p className="text-xs text-slate-500">PDF, DOC, DOCX, TXT up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Rulebook Selection */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Select Rulebook</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rulebooks.map((rulebook) => (
                    <button
                      key={rulebook.id}
                      onClick={() => setSelectedRulebook(rulebook.id)}
                      className={`p-4 rounded-lg text-left transition-all ${
                        selectedRulebook === rulebook.id
                          ? 'bg-[#6366F1] text-white ring-2 ring-[#6366F1]'
                          : 'bg-[#020617] text-slate-300 hover:bg-[#1E293B] border border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1">{rulebook.name}</div>
                      <div className={`text-xs ${selectedRulebook === rulebook.id ? 'text-white/80' : 'text-slate-500'}`}>
                        {rulebook.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Context Field */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Additional Context (Optional)</h2>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g., Be extra strict on termination clauses, focus on data retention policies..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#020617] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Provide specific instructions or areas of focus for your team
                </p>
              </div>
            </div>

            {/* Right: Team Summary */}
            <div className="space-y-6">
              {/* Active Team */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Active Team</h2>
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="bg-[#020617]/50 rounded-lg p-3 flex items-center gap-3"
                    >
                      <img
                        src={agent.photo_url}
                        alt={agent.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{agent.name}</div>
                        <div className="text-xs text-slate-400 truncate">{agent.role}</div>
                      </div>
                      <div className="text-xs font-semibold text-[#FDE047]">
                        ${agent.price_per_hour}/hr
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manager Briefing */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">EVO</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Evo</div>
                    <div className="text-xs text-slate-400">Your Chief of Staff</div>
                  </div>
                </div>
                <div className="glass-light rounded-lg p-4">
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {agents.length === 0 ? (
                      "You haven't hired any agents yet. Please select your team first."
                    ) : (
                      <>
                        Excellent choices, CEO. You've assembled {agents.length} specialized {agents.length === 1 ? 'agent' : 'agents'}.
                        Our current operational cost is <span className="font-bold text-[#FDE047]">${totalCost}/hr</span>.
                        {canStart ? " Ready to commence your first operation?" : " Upload a document to get started."}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartOperation}
                disabled={!canStart}
                className={`w-full py-4 rounded-xl font-semibold transition-all ${
                  canStart
                    ? 'bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {canStart ? 'Commence Operation' : 'Upload Document to Start'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
