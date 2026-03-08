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

  const nodeColor = getNodeColor(node.type);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex w-[360px] flex-col overflow-y-auto border-l shadow-2xl scrollbar-hide"
      style={{ background: '#080E11', borderColor: '#162025', fontFamily: "'Syne', sans-serif" }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 shrink-0 border-b px-6 py-5"
        style={{ background: '#080E11', borderColor: '#162025' }}
      >
        <div className="mb-4 flex items-start justify-between">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-md border text-[18px]"
            style={{ background: `${nodeColor}12`, borderColor: `${nodeColor}30` }}
          >
            {node.type === 'agent' ? '◈' : node.type === 'risk' ? '◬' : node.type === 'policy' ? '▣' : node.type === 'document' ? '◧' : node.type === 'decision' ? '◉' : '◎'}
          </div>
          <button
            onClick={onClose}
            className="rounded border p-1.5 transition-all"
            style={{ borderColor: '#1E2D30', color: '#2E4248' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#9E5A5A'; e.currentTarget.style.borderColor = '#9E5A5A30'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#2E4248'; e.currentTarget.style.borderColor = '#1E2D30'; }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h2
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
          className="mb-1.5 text-[16px] text-[#EAE6DF]"
        >
          {node.label}
        </h2>
        <p className="text-[12px] leading-relaxed text-[#4A6A72]">{node.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: nodeColor, borderColor: `${nodeColor}30` }}
            className="rounded border px-1.5 py-0.5 text-[10px] uppercase"
          >
            {node.type}
          </span>
          <span
            style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056' }}
            className="rounded border px-1.5 py-0.5 text-[10px]"
          >
            {node.metadata.department}
          </span>
          {node.metadata.isDeprecated && (
            <span
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#9E5A5A', borderColor: '#9E5A5A30' }}
              className="rounded border px-1.5 py-0.5 text-[10px]"
            >
              DEPRECATED
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-5 px-6 py-5">

        {/* Section helper */}
        {/* Metadata */}
        <section>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-2 text-[10px] uppercase tracking-widest text-[#2E4248]">
            Metadata
          </p>
          <div
            className="divide-y rounded-md border"
            style={{ borderColor: '#1E2D30', background: '#111A1D' }}
          >
            {[
              { label: 'Created', value: formatDate(node.metadata.created) },
              { label: 'Created by', value: node.metadata.createdBy === 'user' ? 'You' : node.metadata.createdBy },
              ...(node.metadata.operationId ? [{ label: 'Operation', value: node.metadata.operationId, mono: true }] : []),
              { label: 'Confidence', value: `${(node.metadata.confidence * 100).toFixed(0)}%` },
            ].map(({ label, value, mono }: any) => (
              <div key={label} className="flex items-center justify-between px-3 py-2.5 gap-3">
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#3A5056]">{label}</span>
                <span
                  style={{ fontFamily: mono ? "'IBM Plex Mono', monospace" : "'Syne', sans-serif", color: mono ? '#5A9E8F' : '#B8B2AA' }}
                  className="truncate text-[11px]"
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Properties */}
        {Object.keys(node.properties).length > 0 && (
          <section>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-2 text-[10px] uppercase tracking-widest text-[#2E4248]">
              Properties
            </p>
            <div
              className="divide-y rounded-md border"
              style={{ borderColor: '#1E2D30', background: '#111A1D' }}
            >
              {Object.entries(node.properties).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="shrink-0 text-[11px] capitalize text-[#3A5056]">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="break-all text-right text-[11px] text-[#7BBDAE]">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Deprecated */}
        {node.metadata.isDeprecated && node.metadata.deprecationReason && (
          <div
            className="rounded-md border px-4 py-3"
            style={{ background: '#9E5A5A12', borderColor: '#9E5A5A30' }}
          >
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="mb-1 text-[12px] text-[#9E5A5A]">
              Deprecated Knowledge
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#7A4A4A]">
              {node.metadata.deprecationReason}
            </p>
          </div>
        )}

        {/* Connections */}
        {connections.length > 0 && (
          <section>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-2 text-[10px] uppercase tracking-widest text-[#2E4248]">
              Connections <span style={{ color: '#3A5056' }}>({connections.length})</span>
            </p>
            <div className="space-y-1.5">
              {connections.slice(0, 5).map((edge) => {
                const otherNodeId = edge.source === node.id ? edge.target : edge.source;
                const otherNode = graph.nodes.find((n) => n.id === otherNodeId);
                const isOut = edge.source === node.id;

                return (
                  <div
                    key={edge.id}
                    className="rounded-md border px-3 py-2.5"
                    style={{ background: '#111A1D', borderColor: '#1E2D30' }}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span style={{ color: isOut ? '#5A9E8F' : '#BF8A52' }} className="text-[11px]">
                        {isOut ? '→' : '←'}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: isOut ? '#5A9E8F' : '#BF8A52' }} className="text-[10px]">
                        {edge.label}
                      </span>
                    </div>
                    {otherNode && (
                      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[12px] text-[#D8D4CC]">
                        {otherNode.label}
                      </p>
                    )}
                    {edge.metadata.evidence && (
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-1 italic text-[10px] text-[#2E4248]">
                        "{edge.metadata.evidence}"
                      </p>
                    )}
                  </div>
                );
              })}
              {connections.length > 5 && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="py-1 text-center text-[10px] text-[#2E4248]">
                  +{connections.length - 5} more
                </p>
              )}
            </div>
          </section>
        )}

        {/* Evolution history */}
        {evolutionEvents.length > 0 && (
          <section>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-3 text-[10px] uppercase tracking-widest text-[#2E4248]">
              Evolution History
            </p>
            <div className="space-y-0">
              {evolutionEvents.map((event, i) => (
                <div
                  key={event.id}
                  className="relative pl-5 pb-4"
                  style={{ borderLeft: `1px solid ${i < evolutionEvents.length - 1 ? '#1E2D30' : 'transparent'}` }}
                >
                  <span
                    className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full border"
                    style={{ background: '#5A9E8F', borderColor: '#080E11' }}
                  />
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-0.5 text-[10px] text-[#2E4248]">
                    {formatDate(event.timestamp)}
                  </p>
                  <p className="text-[12px] text-[#B8B2AA]">{event.description}</p>
                  {event.userFeedback && (
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52' }} className="mt-1 italic text-[10px]">
                      "{event.userFeedback}"
                    </p>
                  )}
                  {event.operationId && (
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-0.5 text-[10px] text-[#2A3E44]">
                      op:{event.operationId}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
