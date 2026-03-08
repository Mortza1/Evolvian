'use client';

import type { WorkflowNode, NodeStatus } from '../types';

// Teal spectrum — no indigo/purple
const NODE_ACCENTS = ['#5A9E8F', '#7BBDAE', '#BF8A52', '#7A8FA0'];

interface FlatWorkflowViewProps {
  workflowNodes: WorkflowNode[];
  nodeStatuses: NodeStatus[];
  getAgentPhoto: (name: string) => string | undefined;
}

export function FlatWorkflowView({ workflowNodes, nodeStatuses, getAgentPhoto }: FlatWorkflowViewProps) {
  return (
    <div className="flex items-center justify-center gap-0 min-w-max">
      {workflowNodes.map((node, idx) => {
        const status = nodeStatuses.find(s => s.nodeId === node.id);
        const accent = NODE_ACCENTS[idx % NODE_ACCENTS.length];
        const isActive    = status?.status === 'active';
        const isCompleted = status?.status === 'completed';
        const isFailed    = status?.status === 'failed';
        const isWaiting   = status?.status === 'waiting_for_input';

        const displayColor = isFailed ? '#9E5A5A' : isWaiting ? '#BF8A52' : accent;
        const agentPhoto = node.agentPhoto || getAgentPhoto(node.agentName || node.agentRole);

        const borderColor =
          isCompleted ? '#5A9E8F40' :
          isFailed    ? '#9E5A5A40' :
          isWaiting   ? '#BF8A5240' :
          isActive    ? `${displayColor}70` :
                        '#1E2D30';

        const bgColor =
          isCompleted ? '#5A9E8F08' :
          isFailed    ? '#9E5A5A08' :
          isWaiting   ? '#BF8A5208' :
          isActive    ? `${displayColor}10` :
                        '#111A1D';

        return (
          <div key={node.id} className="flex items-center">
            {/* Card */}
            <div className="relative" style={{ opacity: isCompleted ? 0.75 : 1 }}>
              {/* Active glow */}
              {(isActive || isWaiting) && (
                <div
                  className="absolute -inset-3 rounded-md opacity-10 animate-pulse"
                  style={{ background: displayColor }}
                />
              )}

              <div
                className="relative w-56 rounded-md border p-5 transition-all"
                style={{ background: bgColor, borderColor }}
              >
                {/* Color top bar */}
                <div
                  className="absolute inset-x-0 top-0 h-[2px] rounded-t-md"
                  style={{ background: `${displayColor}70` }}
                />

                {/* Step badge */}
                <div
                  className="absolute -top-2.5 left-4 flex h-5 min-w-[20px] items-center justify-center rounded-sm px-1.5 text-[10px] font-semibold"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    background: isCompleted ? '#5A9E8F' : isFailed ? '#9E5A5A' : isWaiting ? '#BF8A52' : displayColor,
                    color: '#080E11',
                  }}
                >
                  {isCompleted ? '✓' : isFailed ? '✕' : isWaiting ? '?' : node.order}
                </div>

                {/* Avatar */}
                <div className="mb-4 flex justify-center mt-2">
                  {agentPhoto ? (
                    <img
                      src={agentPhoto}
                      alt={node.agentName || node.agentRole}
                      className="h-14 w-14 rounded-sm object-cover border-2"
                      style={{ borderColor: displayColor, boxShadow: isActive ? `0 0 0 3px ${displayColor}20` : 'none' }}
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-sm border-2 text-[15px] font-bold"
                      style={{ background: `${displayColor}18`, borderColor: displayColor, color: displayColor, fontFamily: "'Syne', sans-serif" }}
                    >
                      {(node.agentName || node.agentRole).substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name / role */}
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: '#D8D4CC' }} className="text-center mb-0.5">
                  {node.agentName || node.agentRole}
                </h3>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056' }} className="text-center mb-2">
                  {node.agentRole}
                </p>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', color: '#4A6A72', lineHeight: '1.5' }} className="text-center mb-3">
                  {node.name || node.action || node.description}
                </p>

                {/* Active tool */}
                {isActive && status?.activeTool && (
                  <div
                    className="mb-3 flex items-center justify-center gap-2 rounded border px-2 py-1.5"
                    style={{ background: `${displayColor}0A`, borderColor: `${displayColor}30` }}
                  >
                    <svg className="h-3 w-3 animate-spin" style={{ color: displayColor }} viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: displayColor }}>
                      {status.activeTool}
                    </span>
                  </div>
                )}

                {/* Progress bar */}
                {(isActive || isCompleted) && status?.progress !== undefined && (
                  <div className="mb-3 w-full h-1 rounded-full overflow-hidden" style={{ background: '#162025' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${status.progress}%`, background: isCompleted ? '#5A9E8F' : displayColor }}
                    />
                  </div>
                )}

                {/* Status label */}
                <div className="border-t pt-2.5 text-center" style={{ borderColor: '#162025' }}>
                  {isCompleted && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#5A9E8F' }}>Completed</span>
                  )}
                  {isFailed && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#9E5A5A' }}>Failed</span>
                  )}
                  {isWaiting && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#BF8A52' }}>⚠ Needs input</span>
                  )}
                  {isActive && !isWaiting && (
                    <div className="flex items-center justify-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="block h-1.5 w-1.5 rounded-full animate-typing-dot"
                          style={{ background: displayColor, animationDelay: `${i * 0.18}s` }}
                        />
                      ))}
                    </div>
                  )}
                  {status?.status === 'pending' && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }}>Pending</span>
                  )}
                </div>

                {/* Truncated output */}
                {status?.output && (
                  <div
                    className="mt-3 rounded border px-2 py-1.5 text-[11px] max-h-16 overflow-hidden"
                    style={{ background: '#0B1215', borderColor: '#1E2D30', color: '#4A6A72', fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {status.output.substring(0, 100)}…
                  </div>
                )}
              </div>
            </div>

            {/* Arrow connector */}
            {idx < workflowNodes.length - 1 && (
              <div className="flex items-center mx-4">
                <div className="h-px w-8" style={{ background: '#1E2D30' }} />
                <svg className="h-4 w-4" style={{ color: '#2A3E44' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
