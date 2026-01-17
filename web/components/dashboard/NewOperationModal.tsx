'use client';

import { useState, useEffect } from 'react';
import { getAgents, Agent } from '@/lib/agents';

interface NewOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (config: OperationConfig) => void;
}

export interface OperationConfig {
  title: string;
  description: string;
  department: string;
  selectedAgents: Agent[];
  files: File[];
  rulebook: string;
}

export default function NewOperationModal({ isOpen, onClose, onLaunch }: NewOperationModalProps) {
  const [step, setStep] = useState<'context' | 'briefing'>('context');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [rulebook, setRulebook] = useState('default');

  useEffect(() => {
    const allAgents = getAgents();
    setAgents(allAgents);
  }, []);

  const handleAgentToggle = (agent: Agent) => {
    if (selectedAgents.find((a) => a.id === agent.id)) {
      setSelectedAgents(selectedAgents.filter((a) => a.id !== agent.id));
    } else {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleNext = () => {
    if (selectedAgents.length > 0 && title && description) {
      setStep('briefing');
    }
  };

  const handleLaunch = () => {
    onLaunch({
      title,
      description,
      department,
      selectedAgents,
      files,
      rulebook,
    });
    onClose();
  };

  if (!isOpen) return null;

  const estimatedCost = selectedAgents.reduce((sum, agent) => sum + agent.price_per_hour * 0.1, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">New Operation</h2>
              <p className="text-sm text-slate-400 mt-1">
                {step === 'context' ? 'Set up your task' : 'Review and launch'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 'context' ? (
            <div className="space-y-6">
              {/* Title & Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Operation Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., GDPR Compliance Audit"
                  className="w-full px-4 py-3 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you need the team to do..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Upload Documents (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-700/50 rounded-lg p-8 text-center hover:border-[#6366F1]/50 transition-all cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-slate-400 mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-500">PDF, DOCX, CSV, TXT up to 50MB</p>
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Team Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Select Team ({selectedAgents.length} selected)
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                  {agents.slice(0, 10).map((agent) => {
                    const isSelected = selectedAgents.find((a) => a.id === agent.id);
                    return (
                      <div
                        key={agent.id}
                        onClick={() => handleAgentToggle(agent)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#6366F1] bg-[#6366F1]/10'
                            : 'border-slate-700/50 bg-[#020617]/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={agent.photo_url}
                            alt={agent.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {agent.name}
                            </div>
                            <div className="text-xs text-slate-400 truncate">{agent.role}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Briefing */}
              <div className="p-6 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">E</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Manager's Plan</h3>
                    <p className="text-slate-300 mb-4">
                      I've analyzed the task "<strong>{title}</strong>". I'm assigning:
                    </p>
                    <ul className="space-y-2 mb-4">
                      {selectedAgents.map((agent) => (
                        <li key={agent.id} className="text-sm text-slate-300">
                          • <strong>{agent.name}</strong> - {agent.specialization}
                        </li>
                      ))}
                    </ul>
                    <p className="text-slate-300">
                      Estimated cost: <strong className="text-[#FDE047]">${estimatedCost.toFixed(2)}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Rulebook Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Operation Rulebook
                </label>
                <select
                  value={rulebook}
                  onChange={(e) => setRulebook(e.target.value)}
                  className="w-full px-4 py-3 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
                >
                  <option value="default">Default - Standard Operating Procedures</option>
                  <option value="creative">Creative - High autonomy, innovative solutions</option>
                  <option value="conservative">Conservative - Strict guidelines, low risk</option>
                  <option value="fast">Fast - Speed prioritized, less verification</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          {step === 'context' ? (
            <button
              onClick={handleNext}
              disabled={!title || !description || selectedAgents.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-medium rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Review Plan →
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('context')}
                className="px-6 py-2.5 text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleLaunch}
                className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-medium rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200"
              >
                Commence Operation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
