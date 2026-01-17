'use client';

import { useState, useEffect } from 'react';
import { Tool, InstalledTool, saveInstalledTool, getCategoryColor, getInstalledTools } from '@/lib/tools';
import { getAgents, Agent } from '@/lib/agents';

interface ToolInstallModalProps {
  tool: Tool;
  isOpen: boolean;
  onClose: () => void;
}

export default function ToolInstallModal({ tool, isOpen, onClose }: ToolInstallModalProps) {
  const [step, setStep] = useState<'overview' | 'config' | 'assign'>('overview');
  const [configuration, setConfiguration] = useState<Record<string, string>>({});
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<'read' | 'write' | 'full'>('read');
  const [requireApproval, setRequireApproval] = useState(false);
  const [dailyBudget, setDailyBudget] = useState<string>('');

  const agents = getAgents();
  const installedTools = getInstalledTools();
  const isInstalled = installedTools.some((t) => t.toolId === tool.id);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep('overview');
      setConfiguration({});
      setSelectedAgents([]);
      setPermissions('read');
      setRequireApproval(false);
      setDailyBudget('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfigChange = (field: string, value: string) => {
    setConfiguration((prev) => ({ ...prev, [field]: value }));
  };

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleInstall = () => {
    const installedTool: InstalledTool = {
      toolId: tool.id,
      tool: tool,
      installedAt: new Date(),
      configuration,
      status: tool.requiresConfig ? 'disconnected' : 'connected',
      assignedAgents: selectedAgents,
      usagePolicy: {
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
        requireApproval,
        permissions,
      },
      usage: {
        totalCalls: 0,
        totalCost: 0,
      },
    };

    saveInstalledTool(installedTool);
    onClose();
  };

  const canProceed = () => {
    if (step === 'config' && tool.requiresConfig) {
      return tool.configFields?.every((field) => {
        if (!field.required) return true;
        return configuration[field.name] && configuration[field.name].trim() !== '';
      });
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: getCategoryColor(tool.category) + '30' }}
              >
                {tool.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{tool.name}</h2>
                <p className="text-sm text-slate-400">by {tool.developer}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            <div
              className={`flex-1 h-1 rounded-full ${
                step === 'overview' || step === 'config' || step === 'assign'
                  ? 'bg-[#6366F1]'
                  : 'bg-slate-700'
              }`}
            />
            <div
              className={`flex-1 h-1 rounded-full ${
                step === 'config' || step === 'assign' ? 'bg-[#6366F1]' : 'bg-slate-700'
              }`}
            />
            <div className={`flex-1 h-1 rounded-full ${step === 'assign' ? 'bg-[#6366F1]' : 'bg-slate-700'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          {step === 'overview' && (
            <div>
              <p className="text-slate-300 mb-6">{tool.description}</p>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">Capabilities</h3>
                <div className="grid grid-cols-2 gap-2">
                  {tool.capabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                      {cap}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Pricing</div>
                    {tool.pricingModel === 'free' ? (
                      <div className="text-lg font-bold text-[#10B981]">Free</div>
                    ) : (
                      <div>
                        <span className="text-2xl font-bold text-[#FDE047]">
                          ${tool.pricing.amount}
                        </span>
                        <span className="text-sm text-slate-400 ml-2">{tool.pricing.unit}</span>
                      </div>
                    )}
                  </div>
                  {tool.status && tool.status !== 'available' && (
                    <span className="px-3 py-1.5 bg-[#FDE047]/20 text-[#FDE047] text-xs font-semibold uppercase rounded-md">
                      {tool.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'config' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>

              {!tool.requiresConfig ? (
                <div className="p-6 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-[#10B981]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-white font-semibold mb-1">No configuration required</p>
                  <p className="text-sm text-slate-400">This tool is ready to use immediately</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tool.configFields?.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>

                      {field.type === 'oauth' ? (
                        <button className="w-full px-4 py-3 bg-[#6366F1] text-white rounded-lg hover:bg-[#5558E3] transition-colors font-medium">
                          Connect with OAuth
                        </button>
                      ) : field.type === 'select' ? (
                        <select
                          value={configuration[field.name] || ''}
                          onChange={(e) => handleConfigChange(field.name, e.target.value)}
                          className="w-full px-4 py-3 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === 'password' ? 'password' : 'text'}
                          value={configuration[field.name] || ''}
                          onChange={(e) => handleConfigChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'assign' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Assign to Agents</h3>

              {/* Usage Policy */}
              <div className="mb-6 p-4 bg-[#020617]/50 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Permissions
                  </label>
                  <select
                    value={permissions}
                    onChange={(e) => setPermissions(e.target.value as 'read' | 'write' | 'full')}
                    className="w-full px-4 py-2 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  >
                    <option value="read">Read Only</option>
                    <option value="write">Read & Write</option>
                    <option value="full">Full Access</option>
                  </select>
                </div>

                {tool.pricingModel !== 'free' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Daily Budget (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={dailyBudget}
                        onChange={(e) => setDailyBudget(e.target.value)}
                        placeholder="Unlimited"
                        className="w-full pl-8 pr-4 py-2 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-[#020617]/50 text-[#6366F1] focus:ring-[#6366F1] focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300">Require approval for each use</span>
                </label>
              </div>

              {/* Agent Selection */}
              <div>
                <div className="text-sm font-medium text-slate-300 mb-3">
                  Select Agents ({selectedAgents.length} selected)
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                  {agents.slice(0, 12).map((agent) => {
                    const isSelected = selectedAgents.includes(agent.id);
                    return (
                      <div
                        key={agent.id}
                        onClick={() => handleAgentToggle(agent.id)}
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

          <div className="flex items-center gap-3">
            {step !== 'overview' && (
              <button
                onClick={() =>
                  setStep(step === 'assign' ? 'config' : step === 'config' ? 'overview' : 'overview')
                }
                className="px-6 py-2.5 text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
            )}

            {step === 'overview' && (
              <button
                onClick={() => setStep(tool.requiresConfig ? 'config' : 'assign')}
                className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-medium rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200"
              >
                {isInstalled ? 'Reconfigure' : 'Next'} →
              </button>
            )}

            {step === 'config' && (
              <button
                onClick={() => setStep('assign')}
                disabled={!canProceed()}
                className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-medium rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Next →
              </button>
            )}

            {step === 'assign' && (
              <button
                onClick={handleInstall}
                className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-medium rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200"
              >
                {isInstalled ? 'Update' : 'Install'} Tool
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
