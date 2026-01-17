'use client';

import { useState, useEffect } from 'react';
import { getInstalledTools, InstalledTool, getCategoryColor, uninstallTool } from '@/lib/tools';
import { getAgents } from '@/lib/agents';

export default function MyToolbox() {
  const [tools, setTools] = useState<InstalledTool[]>([]);
  const agents = getAgents();

  useEffect(() => {
    setTools(getInstalledTools());
  }, []);

  const handleUninstall = (toolId: string) => {
    if (confirm('Are you sure you want to uninstall this tool?')) {
      uninstallTool(toolId);
      setTools(getInstalledTools());
    }
  };

  if (tools.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No tools installed yet</h3>
          <p className="text-slate-400 mb-6">Browse the Marketplace to equip your workforce</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 gap-4">
        {tools.map((installedTool) => {
          const tool = installedTool.tool;
          const assignedAgentsList = agents.filter((a) =>
            installedTool.assignedAgents.includes(a.id)
          );

          return (
            <div key={installedTool.toolId} className="glass rounded-xl p-6">
              <div className="flex items-start gap-6">
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ backgroundColor: getCategoryColor(tool.category) + '30' }}
                >
                  {tool.icon}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{tool.name}</h3>
                      <p className="text-sm text-slate-400">{tool.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 text-xs rounded-md font-medium ${
                          installedTool.status === 'connected'
                            ? 'bg-[#10B981]/20 text-[#10B981]'
                            : installedTool.status === 'error'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-700/50 text-slate-400'
                        }`}
                      >
                        {installedTool.status}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="p-3 bg-[#020617]/50 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Total Uses</div>
                      <div className="text-lg font-semibold text-white">
                        {installedTool.usage.totalCalls.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-[#020617]/50 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Total Cost</div>
                      <div className="text-lg font-semibold text-[#FDE047]">
                        ${installedTool.usage.totalCost.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-[#020617]/50 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Access</div>
                      <div className="text-lg font-semibold text-white">
                        {installedTool.usagePolicy.permissions}
                      </div>
                    </div>
                    <div className="p-3 bg-[#020617]/50 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Assigned To</div>
                      <div className="text-lg font-semibold text-white">
                        {installedTool.assignedAgents.length} agents
                      </div>
                    </div>
                  </div>

                  {/* Assigned Agents */}
                  {assignedAgentsList.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-slate-500 mb-2">Equipped Agents:</div>
                      <div className="flex flex-wrap gap-2">
                        {assignedAgentsList.map((agent) => (
                          <div
                            key={agent.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#020617]/50 rounded-lg"
                          >
                            <img
                              src={agent.photo_url}
                              alt={agent.name}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm text-white">{agent.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E3] transition-colors">
                      Configure
                    </button>
                    <button className="px-4 py-2 bg-[#020617]/50 border border-slate-700/50 text-slate-300 text-sm font-medium rounded-lg hover:bg-[#020617]/70 hover:border-slate-600 transition-all">
                      View Usage
                    </button>
                    <button
                      onClick={() => handleUninstall(installedTool.toolId)}
                      className="px-4 py-2 text-red-400 text-sm font-medium hover:text-red-300 transition-colors"
                    >
                      Uninstall
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
