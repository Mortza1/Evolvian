'use client';

import { KnowledgeNode, KnowledgeGraph, getNodeColor } from '@/lib/knowledge-graph';

interface NodeDetailPanelProps {
  node: KnowledgeNode | null;
  graph: KnowledgeGraph;
  onClose: () => void;
}

export default function NodeDetailPanel({ node, graph, onClose }: NodeDetailPanelProps) {
  if (!node) return null;

  // Get related evolution events
  const evolutionEvents = graph.evolutionHistory.filter(
    (e) => e.nodeId === node.id || e.edgeId === node.id
  );

  // Get connected nodes
  const connections = graph.edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 glass border-l border-slate-700/50 shadow-2xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[#1E293B]/95 backdrop-blur-sm p-6 border-b border-slate-700/50">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: getNodeColor(node.type) + '30' }}
          >
            {node.type === 'agent' ? '👤' : node.type === 'risk' ? '⚠️' : node.type === 'policy' ? '📋' : node.type === 'document' ? '📄' : node.type === 'decision' ? '✓' : '📍'}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">{node.label}</h2>
        <p className="text-sm text-slate-400">{node.description}</p>

        <div className="mt-4 flex items-center gap-2">
          <span
            className="px-2 py-1 text-xs rounded-md font-medium"
            style={{
              backgroundColor: getNodeColor(node.type) + '30',
              color: getNodeColor(node.type),
            }}
          >
            {node.type}
          </span>
          <span className="px-2 py-1 text-xs bg-slate-800/50 text-slate-400 rounded-md">
            {node.metadata.department}
          </span>
          {node.metadata.isDeprecated && (
            <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-md">
              Deprecated
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Metadata */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Metadata</h3>
          <div className="glass-light rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Created:</span>
              <span className="text-white">{formatDate(node.metadata.created)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Created By:</span>
              <span className="text-white">
                {node.metadata.createdBy === 'user' ? 'You' : node.metadata.createdBy}
              </span>
            </div>
            {node.metadata.operationId && (
              <div className="flex justify-between">
                <span className="text-slate-400">Operation:</span>
                <span className="text-[#6366F1] font-mono text-xs">
                  {node.metadata.operationId}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Confidence:</span>
              <span className="text-white">
                {(node.metadata.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Properties */}
        {Object.keys(node.properties).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Properties</h3>
            <div className="glass-light rounded-lg p-4 space-y-2 text-sm">
              {Object.entries(node.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-slate-400 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-white font-mono text-xs">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deprecation Notice */}
        {node.metadata.isDeprecated && node.metadata.deprecationReason && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <div className="text-sm font-semibold text-red-400 mb-1">
                  Deprecated Knowledge
                </div>
                <div className="text-xs text-red-300">{node.metadata.deprecationReason}</div>
              </div>
            </div>
          </div>
        )}

        {/* Connections */}
        {connections.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Connections ({connections.length})
            </h3>
            <div className="space-y-2">
              {connections.slice(0, 5).map((edge) => {
                const otherNodeId = edge.source === node.id ? edge.target : edge.source;
                const otherNode = graph.nodes.find((n) => n.id === otherNodeId);
                const direction = edge.source === node.id ? '→' : '←';

                return (
                  <div key={edge.id} className="glass-light rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-500">{direction}</span>
                      <span className="text-[#6366F1] text-xs">{edge.label}</span>
                    </div>
                    {otherNode && (
                      <div className="text-white font-medium">{otherNode.label}</div>
                    )}
                    {edge.metadata.evidence && (
                      <div className="text-xs text-slate-400 mt-1 italic">
                        "{edge.metadata.evidence}"
                      </div>
                    )}
                  </div>
                );
              })}
              {connections.length > 5 && (
                <div className="text-xs text-slate-500 text-center py-2">
                  +{connections.length - 5} more connections
                </div>
              )}
            </div>
          </div>
        )}

        {/* Evolution History */}
        {evolutionEvents.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#FDE047]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Evolution History
            </h3>
            <div className="space-y-3">
              {evolutionEvents.map((event) => (
                <div key={event.id} className="relative pl-6 pb-4 border-l-2 border-[#6366F1]/30">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-[#6366F1]"></div>
                  <div className="text-xs text-slate-500 mb-1">
                    {formatDate(event.timestamp)}
                  </div>
                  <div className="text-sm text-white mb-1">{event.description}</div>
                  {event.userFeedback && (
                    <div className="text-xs text-[#FDE047] italic">
                      💬 "{event.userFeedback}"
                    </div>
                  )}
                  {event.operationId && (
                    <div className="text-xs text-slate-600 mt-1">
                      Operation: {event.operationId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
