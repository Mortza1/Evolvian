'use client';

import { useState, useEffect } from 'react';

interface AgentNode {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  status: 'idle' | 'thinking' | 'working' | 'complete';
  x: number; // Position on canvas
  y: number;
}

interface DataFlow {
  from: string; // agent id
  to: string; // agent id
  label: string; // e.g., "Messaging Doc", "HEX Codes"
  type: string; // e.g., "document", "data", "feedback"
  progress: number; // 0-100
}

interface WatercoolerMessage {
  id: string;
  agentId: string;
  agentName: string;
  avatar: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'thinking' | 'question';
}

export default function WarRoom() {
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [dataFlows, setDataFlows] = useState<DataFlow[]>([]);
  const [watercooler, setWatercooler] = useState<WatercoolerMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Initialize agents in a circular layout
    const demoAgents: AgentNode[] = [
      {
        id: 'strategist',
        name: 'Atlas',
        role: 'Brand Strategist',
        avatar: '🎯',
        color: '#8B5CF6',
        status: 'working',
        x: 200,
        y: 150,
      },
      {
        id: 'color-oracle',
        name: 'Aurora',
        role: 'Color Oracle',
        avatar: '🎨',
        color: '#EC4899',
        status: 'working',
        x: 500,
        y: 150,
      },
      {
        id: 'content-creator',
        name: 'Lyra',
        role: 'Content Creator',
        avatar: '✍️',
        color: '#10B981',
        status: 'thinking',
        x: 350,
        y: 350,
      },
      {
        id: 'visual-identity',
        name: 'Prism',
        role: 'Visual Identity',
        avatar: '🎨',
        color: '#F59E0B',
        status: 'idle',
        x: 650,
        y: 350,
      },
    ];

    setAgents(demoAgents);

    // Simulate data flows
    const flows: DataFlow[] = [
      {
        from: 'strategist',
        to: 'content-creator',
        label: 'Messaging Doc',
        type: 'document',
        progress: 65,
      },
      {
        from: 'color-oracle',
        to: 'visual-identity',
        label: 'HEX Codes',
        type: 'data',
        progress: 45,
      },
    ];

    setDataFlows(flows);

    // Initial watercooler messages
    const initialMessages: WatercoolerMessage[] = [
      {
        id: '1',
        agentId: 'color-oracle',
        agentName: 'Aurora',
        avatar: '🎨',
        message: 'Verified HEX #0A192F for accessibility standards.',
        timestamp: new Date(Date.now() - 60000),
        type: 'success',
      },
      {
        id: '2',
        agentId: 'strategist',
        agentName: 'Atlas',
        avatar: '🎯',
        message: 'Analyzing "Elite Authority" positioning in AI consulting market...',
        timestamp: new Date(Date.now() - 45000),
        type: 'thinking',
      },
      {
        id: '3',
        agentId: 'content-creator',
        agentName: 'Lyra',
        avatar: '✍️',
        message: 'Drafting LinkedIn "About" section using Elite Authority tone.',
        timestamp: new Date(Date.now() - 30000),
        type: 'info',
      },
    ];

    setWatercooler(initialMessages);
    setIsRunning(true);

    // Simulate live updates
    const interval = setInterval(() => {
      // Add new watercooler message
      const newMessages: WatercoolerMessage[] = [
        {
          id: Date.now().toString(),
          agentId: 'color-oracle',
          agentName: 'Aurora',
          avatar: '🎨',
          message: 'Gold accent color (#D4AF37) selected for premium touch.',
          timestamp: new Date(),
          type: 'success',
        },
        {
          id: Date.now().toString(),
          agentId: 'strategist',
          agentName: 'Atlas',
          avatar: '🎯',
          message: 'Competitor analysis: 87% of top firms use blue. Our navy/gold differentiates.',
          timestamp: new Date(),
          type: 'info',
        },
        {
          id: Date.now().toString(),
          agentId: 'content-creator',
          agentName: 'Lyra',
          avatar: '✍️',
          message: 'Question for CEO: Should headline emphasize "Neural Networks" or "Business Impact"?',
          timestamp: new Date(),
          type: 'question',
        },
        {
          id: Date.now().toString(),
          agentId: 'visual-identity',
          agentName: 'Prism',
          avatar: '🎨',
          message: 'Logo mockup ready. Using Champagne Gold (#F7E7CE) with Navy (#0A192F).',
          timestamp: new Date(),
          type: 'success',
        },
      ];

      const randomMessage = newMessages[Math.floor(Math.random() * newMessages.length)];
      setWatercooler((prev) => [...prev, randomMessage].slice(-10)); // Keep last 10

      // Update flow progress
      setDataFlows((prev) =>
        prev.map((flow) => ({
          ...flow,
          progress: Math.min(100, flow.progress + Math.random() * 10),
        }))
      );
    }, 5000); // New message every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
        return 'border-green-500 shadow-green-500/50';
      case 'thinking':
        return 'border-yellow-500 shadow-yellow-500/50';
      case 'complete':
        return 'border-blue-500 shadow-blue-500/50';
      default:
        return 'border-slate-600 shadow-slate-600/50';
    }
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-4 border-green-500 bg-green-500/10';
      case 'thinking':
        return 'border-l-4 border-yellow-500 bg-yellow-500/10';
      case 'question':
        return 'border-l-4 border-blue-500 bg-blue-500/10';
      default:
        return 'border-l-4 border-slate-500 bg-slate-500/10';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Execution Theatre</h2>
            <p className="text-sm text-slate-400">Live agent collaboration - Personal Branding Project</p>
          </div>
          <div className="flex items-center gap-4">
            {isRunning && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400 font-medium">Operation In Progress</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Agent Graph */}
        <div className="flex-1 relative bg-[#020617] p-8">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, #6366F1 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          ></div>

          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {dataFlows.map((flow, idx) => {
              const fromAgent = agents.find((a) => a.id === flow.from);
              const toAgent = agents.find((a) => a.id === flow.to);
              if (!fromAgent || !toAgent) return null;

              return (
                <g key={idx}>
                  <defs>
                    <linearGradient id={`gradient-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={fromAgent.color} stopOpacity="0.8" />
                      <stop offset="100%" stopColor={toAgent.color} stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  <line
                    x1={fromAgent.x + 50}
                    y1={fromAgent.y + 50}
                    x2={toAgent.x + 50}
                    y2={toAgent.y + 50}
                    stroke={`url(#gradient-${idx})`}
                    strokeWidth="3"
                    strokeDasharray="10,5"
                    className="animate-pulse"
                  />
                  {/* Progress indicator */}
                  <circle
                    cx={fromAgent.x + 50 + (toAgent.x - fromAgent.x) * (flow.progress / 100)}
                    cy={fromAgent.y + 50 + (toAgent.y - fromAgent.y) * (flow.progress / 100)}
                    r="6"
                    fill={fromAgent.color}
                    className="animate-pulse"
                  >
                    <animate
                      attributeName="r"
                      values="4;8;4"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Label */}
                  <text
                    x={fromAgent.x + 50 + (toAgent.x - fromAgent.x) * 0.5}
                    y={fromAgent.y + 50 + (toAgent.y - fromAgent.y) * 0.5 - 15}
                    fill="#94a3b8"
                    fontSize="12"
                    textAnchor="middle"
                    className="font-medium"
                  >
                    {flow.label}
                  </text>
                  <text
                    x={fromAgent.x + 50 + (toAgent.x - fromAgent.x) * 0.5}
                    y={fromAgent.y + 50 + (toAgent.y - fromAgent.y) * 0.5}
                    fill="#6366F1"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-bold"
                  >
                    {Math.round(flow.progress)}%
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Agent Nodes */}
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="absolute"
              style={{ left: agent.x, top: agent.y }}
            >
              <div className={`glass rounded-xl p-4 w-28 border-2 ${getStatusColor(agent.status)} transition-all`}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto mb-2"
                  style={{ backgroundColor: agent.color + '30' }}
                >
                  {agent.avatar}
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-white">{agent.name}</div>
                  <div className="text-[10px] text-slate-400">{agent.role}</div>
                  <div className="mt-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                      agent.status === 'working' ? 'bg-green-500/20 text-green-400' :
                      agent.status === 'thinking' ? 'bg-yellow-500/20 text-yellow-400' :
                      agent.status === 'complete' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Watercooler Feed */}
        <div className="w-96 border-l border-slate-800 bg-[#0F172A] flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-sm font-bold text-white">The Watercooler</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Live agent communications</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {watercooler.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg ${getMessageStyle(msg.type)} transition-all animate-slide-in`}
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-lg">{msg.avatar}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{msg.agentName}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{msg.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
