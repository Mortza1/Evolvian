'use client';

import { useState, useEffect, useRef } from 'react';
import { HiredAgent, addExperience, addLearnedPreference, updateHiredAgent } from '@/lib/agents';
import { updateTask } from '@/lib/tasks';
import { getKnowledgeGraph, saveKnowledgeGraph, KnowledgeNode, KnowledgeEdge, EvolutionEvent } from '@/lib/knowledge-graph';

interface WarRoomLiveProps {
  taskId: number;
  teamId: string;
  workflowNodes: {
    id: string;
    agent: HiredAgent;
    action: string;
    order: number;
  }[];
  taskDescription: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  agent: string;
  message: string;
  type: 'info' | 'tool' | 'output' | 'complete' | 'file';
}

interface NodeStatus {
  nodeId: string;
  status: 'pending' | 'active' | 'completed' | 'waiting';
  activeTool?: string;
  progress?: number;
  waitingReason?: string;
}

interface IntermediateData {
  fromNode: string;
  toNode: string;
  data: {
    title: string;
    content: string;
  }[];
}

export default function WarRoomLive({ taskId, teamId, workflowNodes, taskDescription }: WarRoomLiveProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatus[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<{ from: number; to: number } | null>(null);
  const [intermediateData, setIntermediateData] = useState<IntermediateData | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Initialize node statuses
  useEffect(() => {
    const initialStatuses = workflowNodes.map((node, idx) => ({
      nodeId: node.id,
      status: idx === 0 ? 'active' : 'pending',
      progress: idx === 0 ? 0 : undefined,
    }));
    setNodeStatuses(initialStatuses as NodeStatus[]);

    // Start simulation
    simulateExecution();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (agent: string, message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      agent,
      message,
      type,
    };
    setLogs(prev => [...prev, newLog]);
  };

  const updateNodeStatus = (nodeId: string, updates: Partial<NodeStatus>) => {
    setNodeStatuses(prev =>
      prev.map(status =>
        status.nodeId === nodeId ? { ...status, ...updates } : status
      )
    );
  };

  const addPreferenceToGraph = (agentId: string, agentName: string, preference: string, context: string) => {
    try {
      const graph = getKnowledgeGraph();

      // Create preference node
      const prefId = `pref-${Date.now()}`;
      const prefNode: KnowledgeNode = {
        id: prefId,
        type: 'preference',
        label: preference,
        description: `CEO preference: ${context}`,
        metadata: {
          created: new Date(),
          createdBy: agentId,
          department: 'branding',
          confidence: 1.0, // CEO decision = 100% confidence
          operationId: `task-${taskId}`,
        },
        properties: {
          category: 'Strategic Direction',
          rule: context,
          source: 'CEO Decision',
        },
      };

      graph.nodes.push(prefNode);

      // Create edge from agent to preference
      const edgeId = `edge-${agentId}-${prefId}`;
      const edge: KnowledgeEdge = {
        id: edgeId,
        source: agentId,
        target: prefId,
        type: 'learned_from',
        label: 'learned from CEO',
        metadata: {
          created: new Date(),
          createdBy: 'system',
          confidence: 1.0,
          evidence: `CEO decision in Task #${taskId}`,
          operationId: `task-${taskId}`,
        },
      };

      graph.edges.push(edge);

      // Add evolution event
      const event: EvolutionEvent = {
        id: `evt-${Date.now()}`,
        timestamp: new Date(),
        type: 'learning',
        nodeId: prefId,
        agentId: agentId,
        operationId: `task-${taskId}`,
        description: `${agentName} learned: ${preference} - ${context}`,
        userFeedback: context,
      };

      graph.evolutionHistory.push(event);

      // Update metadata
      graph.metadata.nodeCount = graph.nodes.length;
      graph.metadata.edgeCount = graph.edges.length;
      graph.metadata.lastUpdated = new Date();

      // Save to localStorage
      saveKnowledgeGraph(graph);

      addLog('System', `Knowledge Graph updated: "${preference}" preference stored`, 'complete');
    } catch (error) {
      console.error('Failed to add preference to graph:', error);
    }
  };

  const simulateExecution = async () => {
    // Simulate execution for demo purposes - extended duration
    for (let i = 0; i < workflowNodes.length; i++) {
      const node = workflowNodes[i];

      // Start node
      updateNodeStatus(node.id, { status: 'active', progress: 0 });
      addLog(node.agent.name, `Starting: ${node.action}`, 'info');

      await new Promise(resolve => setTimeout(resolve, 2500));

      // Initial research/setup
      updateNodeStatus(node.id, { progress: 8 });
      addLog(node.agent.name, `Initializing workspace...`, 'info');

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Vault file retrieval
      const templates = [
        'Brand_Strategy_Template.docx',
        'Color_Palette_Framework.pdf',
        'Messaging_Guidelines.docx',
      ];
      updateNodeStatus(node.id, { progress: 15 });
      addLog(node.agent.name, `Retrieved ${templates[i]} from Vault`, 'file');

      await new Promise(resolve => setTimeout(resolve, 2500));

      // Tool usage phase 1
      const tools = ['Web Search Pro', 'Market Analyzer', 'Content Generator'];
      const tool = tools[i % tools.length];
      updateNodeStatus(node.id, { activeTool: tool, progress: 22 });
      addLog(node.agent.name, `Using tool: ${tool}`, 'tool');

      await new Promise(resolve => setTimeout(resolve, 4000));

      // Data collection
      updateNodeStatus(node.id, { progress: 32 });
      addLog(node.agent.name, `Collecting and synthesizing data...`, 'info');

      await new Promise(resolve => setTimeout(resolve, 4500));

      // Analysis phase
      updateNodeStatus(node.id, { progress: 45 });
      addLog(node.agent.name, `Analyzing results...`, 'info');

      await new Promise(resolve => setTimeout(resolve, 4000));

      // Human-in-the-loop pause for 2nd agent (Color Oracle / Aurora)
      if (i === 1) {
        // Pause for decision
        updateNodeStatus(node.id, { status: 'waiting', progress: 50 });
        addLog(node.agent.name, `Needs CEO decision on strategic direction...`, 'info');

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Show the question in logs
        addLog('System', `Inbox notification sent to CEO`, 'info');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Simulate CEO response after a few seconds (hardcoded for demo)
        addLog('System', `CEO responded: "Prioritize Authority"`, 'complete');

        // Add preference to Knowledge Graph
        addPreferenceToGraph(
          node.agent.id,
          node.agent.name,
          'Authority over Innovation',
          'For executive branding, prioritize authority and credibility over innovation and disruption'
        );

        // Add learned preference to agent
        addLearnedPreference(
          node.agent.id,
          teamId,
          'Strategic Direction',
          'Prioritize Authority over Innovation for executive branding',
          95
        );

        addLog(node.agent.name, `Proceeding with authority-focused approach`, 'info');

        // Resume execution
        updateNodeStatus(node.id, { status: 'active', progress: 50 });

        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Refinement
      updateNodeStatus(node.id, { progress: 62 });
      addLog(node.agent.name, `Refining output...`, 'info');

      await new Promise(resolve => setTimeout(resolve, 3500));

      // Quality check
      updateNodeStatus(node.id, { progress: 72 });
      addLog(node.agent.name, `Running quality checks...`, 'info');

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Output generation
      updateNodeStatus(node.id, { progress: 82 });
      addLog(node.agent.name, `Generating deliverable...`, 'output');

      await new Promise(resolve => setTimeout(resolve, 3500));

      // File output to Vault
      const outputs = [
        { name: 'Market_Analysis_Report.pdf', path: '/Workflow Outputs/Market_Analysis_Report.pdf' },
        { name: 'Color_Strategy_Document.pdf', path: '/Workflow Outputs/Color_Strategy_Document.pdf' },
        { name: 'Brand_Manifesto.docx', path: '/Workflow Outputs/Brand_Manifesto.docx' },
      ];
      updateNodeStatus(node.id, { progress: 92 });
      addLog(node.agent.name, `Saved ${outputs[i].name} to ${outputs[i].path}`, 'file');

      await new Promise(resolve => setTimeout(resolve, 2500));

      // Final validation
      updateNodeStatus(node.id, { progress: 97 });
      addLog(node.agent.name, `Validating deliverable integrity...`, 'info');

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete
      updateNodeStatus(node.id, { status: 'completed', progress: 100, activeTool: undefined });
      addLog(node.agent.name, `Work completed successfully`, 'complete');

      // Award XP and update agent (Knowledge Harvest)
      const xpGained = 50;
      addExperience(node.agent.id, teamId, xpGained);

      // Update tasks completed count
      updateHiredAgent(node.agent.id, teamId, {
        tasksCompleted: (node.agent as any).tasksCompleted + 1,
      });

      addLog('System', `${node.agent.name} gained ${xpGained} XP`, 'complete');

      // Special: Color Oracle gains specialization after human-in-the-loop learning
      if (i === 1) {
        updateHiredAgent(node.agent.id, teamId, {
          specialization: 'Executive Branding',
        });
        addLog('System', `${node.agent.name} specialized in: Executive Branding`, 'complete');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // All nodes completed - update task status in backend
    addLog('System', 'All agents have completed their work. Finalizing operation...', 'complete');

    try {
      await updateTask(taskId, {
        status: 'completed',
        progress: 100,
      });
      addLog('System', 'Operation completed successfully!', 'complete');
    } catch (error) {
      console.error('Failed to update task status:', error);
      addLog('System', 'Failed to save completion status', 'info');
    }
  };

  const handleConnectionClick = (fromIdx: number, toIdx: number) => {
    const fromNode = workflowNodes[fromIdx];
    const toNode = workflowNodes[toIdx];

    // Generate mock intermediate data
    const mockData: IntermediateData = {
      fromNode: fromNode.agent.name,
      toNode: toNode.agent.name,
      data: [
        {
          title: 'Market Analysis',
          content: 'Analyzed 14 competitors in AI consulting space. Key findings: emphasis on tech-forward aesthetics, blue/purple color schemes dominant.',
        },
        {
          title: 'Trend Insights',
          content: 'Current trends favor minimalist designs with bold typography. Gradient overlays and glassmorphism are prevalent.',
        },
        {
          title: 'Color Signatures',
          content: 'Extracted color palettes from top performers. Primary colors: #6366F1, #8B5CF6, #EC4899 showing strong engagement.',
        },
      ],
    };

    setIntermediateData(mockData);
    setSelectedConnection({ from: fromIdx, to: toIdx });
  };

  const colors = ['#6366F1', '#8B5CF6', '#EC4899'];

  return (
    <div className="h-full flex flex-col bg-[#020617]">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-semibold text-white">Execution Theatre</h1>
            <p className="text-sm text-slate-500 mt-1">{taskDescription}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-[#6366F1]/20 border border-[#6366F1]/30 rounded text-sm">
              <span className="text-[#6366F1] font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workflow Graph */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="flex items-center justify-center gap-6 min-w-max">
            {workflowNodes.map((node, idx) => {
              const nodeStatus = nodeStatuses.find(s => s.nodeId === node.id);
              const nodeColor = colors[idx % colors.length];
              const isActive = nodeStatus?.status === 'active';
              const isCompleted = nodeStatus?.status === 'completed';
              const isWaiting = nodeStatus?.status === 'waiting';
              const displayColor = isWaiting ? '#F59E0B' : nodeColor; // Amber for waiting

              return (
                <div key={node.id} className="flex items-center">
                  {/* Node */}
                  <div className="relative">
                    {/* Pulsing glow for active or waiting node */}
                    {(isActive || isWaiting) && (
                      <div
                        className="absolute -inset-4 rounded-lg blur-2xl opacity-40 animate-pulse"
                        style={{ backgroundColor: displayColor }}
                      ></div>
                    )}

                    {/* Node card */}
                    <div
                      className={`relative bg-[#0A0A0F] border rounded-lg p-5 w-64 transition-all ${
                        (isActive || isWaiting) ? 'border-opacity-100' : 'border-opacity-50'
                      } ${isCompleted ? 'opacity-60' : ''}`}
                      style={{ borderColor: (isActive || isWaiting) ? displayColor : '#334155' }}
                    >
                      {/* Order badge */}
                      <div
                        className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          isCompleted ? 'bg-slate-700' : ''
                        }`}
                        style={{ backgroundColor: isCompleted ? undefined : displayColor }}
                      >
                        {isCompleted ? '✓' : isWaiting ? '⏸' : node.order}
                      </div>

                      {/* Agent Photo */}
                      <div className="mb-4">
                        <img
                          src={node.agent.photo_url}
                          alt={node.agent.name}
                          className={`w-16 h-16 rounded-full object-cover mx-auto border-2 ${
                            (isActive || isWaiting) ? 'ring-2 ring-offset-2 ring-offset-[#0A0A0F]' : ''
                          }`}
                          style={{ borderColor: (isActive || isWaiting) ? displayColor : '#334155', ringColor: (isActive || isWaiting) ? displayColor : undefined }}
                        />
                      </div>

                      {/* Agent name */}
                      <h3 className="text-base font-semibold text-white text-center mb-1">
                        {node.agent.name}
                      </h3>
                      <div className="text-xs text-slate-500 text-center mb-3">{node.agent.role}</div>

                      {/* Action */}
                      <p className="text-xs text-slate-400 text-center leading-relaxed mb-3">
                        {node.action}
                      </p>

                      {/* Tool indicator */}
                      {isActive && nodeStatus?.activeTool && (
                        <div className="flex items-center justify-center gap-2 p-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded mb-3">
                          <div className="w-3 h-3 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-[#6366F1] font-medium">{nodeStatus.activeTool}</span>
                        </div>
                      )}

                      {/* Waiting indicator */}
                      {isWaiting && (
                        <div className="flex items-center justify-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded mb-3">
                          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-amber-500 font-medium">Awaiting Decision</span>
                        </div>
                      )}

                      {/* Progress bar */}
                      {isActive && nodeStatus?.progress !== undefined && (
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full transition-all duration-500 rounded-full"
                            style={{
                              width: `${nodeStatus.progress}%`,
                              backgroundColor: nodeColor,
                            }}
                          ></div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <div className="text-xs text-center">
                          {isCompleted && <span className="text-green-500">Completed</span>}
                          {isWaiting && <span className="text-amber-500">Waiting for Input</span>}
                          {isActive && <span className="text-[#6366F1]">In Progress</span>}
                          {nodeStatus?.status === 'pending' && <span className="text-slate-500">Pending</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connection line */}
                  {idx < workflowNodes.length - 1 && (
                    <button
                      onClick={() => handleConnectionClick(idx, idx + 1)}
                      className="group relative mx-4 hover:opacity-100 transition-opacity"
                    >
                      {/* Connection line */}
                      <div className="flex items-center">
                        <div className="w-12 h-0.5 bg-slate-700 group-hover:bg-[#6366F1] transition-colors"></div>
                        <svg className="w-4 h-4 text-slate-700 group-hover:text-[#6366F1] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      {/* Hover hint */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        <span className="text-xs text-slate-500">Click to view data</span>
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Vault Indicator */}
          <div className="flex justify-center mt-12 pb-4">
            <div className="px-6 py-4 bg-slate-900/50 border border-slate-700 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FDE047]/10 border border-[#FDE047]/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#FDE047]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-white">Vault Storage</div>
                <div className="text-xs text-slate-500">File outputs saved here</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Preview Panel */}
        {selectedConnection !== null && intermediateData && (
          <div className="w-96 border-l border-slate-800 bg-[#0A0A0F] flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Data Preview</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {intermediateData.fromNode} → {intermediateData.toNode}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedConnection(null);
                  setIntermediateData(null);
                }}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {intermediateData.data.map((item, idx) => (
                <div key={idx} className="p-3 bg-[#020617] border border-slate-800 rounded">
                  <h4 className="text-xs font-semibold text-white mb-2">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Ticker */}
      <div className="flex-shrink-0 h-48 border-t border-slate-800 bg-[#0A0A0F] flex flex-col">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400">LIVE ACTIVITY LOG</h3>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Clear
          </button>
        </div>
        <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 space-y-1 font-mono">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <span className="text-slate-600 flex-shrink-0">
                {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span
                className={`flex-shrink-0 font-medium ${
                  log.type === 'tool'
                    ? 'text-[#6366F1]'
                    : log.type === 'file'
                    ? 'text-[#FDE047]'
                    : log.type === 'output'
                    ? 'text-[#EC4899]'
                    : log.type === 'complete'
                    ? 'text-green-500'
                    : 'text-slate-400'
                }`}
              >
                [{log.agent}]
              </span>
              <span className={`flex-1 ${log.type === 'file' ? 'text-[#FDE047]' : 'text-slate-400'}`}>{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
