'use client';

import { useState, useEffect } from 'react';
import {
  getKnowledgeGraph,
  getGraphAtTime,
  syncPreferencesToGraph,
  KnowledgeGraph,
  KnowledgeNode,
} from '@/lib/knowledge-graph';
import GraphVisualizer from './GraphVisualizer';
import RAGChat from './RAGChat';
import TimeTravelSlider from './TimeTravelSlider';
import NodeDetailPanel from './NodeDetailPanel';

interface KnowledgeGraphViewProps {
  teamId?: string;
}

export default function KnowledgeGraphView({ teamId }: KnowledgeGraphViewProps) {
  const [fullGraph, setFullGraph] = useState<KnowledgeGraph | null>(null);
  const [displayGraph, setDisplayGraph] = useState<KnowledgeGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isRagChatOpen, setIsRagChatOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // Sync learned preferences from agents to knowledge graph
    syncPreferencesToGraph();

    // Load the updated graph
    const graph = getKnowledgeGraph();
    setFullGraph(graph);
    setDisplayGraph(graph);
  }, []);

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
    if (fullGraph) {
      const historicalGraph = getGraphAtTime(fullGraph, date);
      setDisplayGraph(historicalGraph);
    }
  };

  const handleNodeClick = (node: KnowledgeNode) => {
    setSelectedNode(node);
  };

  const handleHighlightNodes = (nodeIds: string[]) => {
    setHighlightedNodes(nodeIds);
  };

  const handleSelectNodeById = (nodeId: string) => {
    const node = displayGraph?.nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
  };

  if (!displayGraph || !fullGraph) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: '#080E11' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#3A5056]">
            loading knowledge graph…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}
    >
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between border-b px-8 py-3"
        style={{ borderColor: '#162025' }}
      >
        {/* Stats */}
        <div className="flex items-center gap-6">
          {[
            { label: 'nodes', value: displayGraph.nodes.length, color: '#5A9E8F' },
            { label: 'edges', value: displayGraph.edges.length, color: '#7A9EA6' },
            { label: 'evolutions', value: displayGraph.evolutionHistory.length, color: '#BF8A52' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <span
                style={{ fontFamily: "'IBM Plex Mono', monospace", color, fontSize: '15px', fontWeight: 700 }}
              >
                {value}
              </span>
              <span
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                className="text-[10px] uppercase tracking-widest text-[#2E4248]"
              >
                {label}
              </span>
            </div>
          ))}
          <span
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="text-[10px] text-[#2A3E44]"
          >
            {displayGraph.metadata.totalSize}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRagChatOpen(!isRagChatOpen)}
            className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              borderColor: isRagChatOpen ? '#5A9E8F40' : '#1E2D30',
              color: isRagChatOpen ? '#5A9E8F' : '#3A5056',
              background: isRagChatOpen ? '#5A9E8F10' : 'transparent',
            }}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {isRagChatOpen ? 'Hide Chat' : 'Show Chat'}
          </button>

          <button
            onClick={toggleFullscreen}
            className="rounded border p-1.5 transition-all"
            style={{ borderColor: '#1E2D30', color: '#2E4248' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#5A9E8F'; e.currentTarget.style.borderColor = '#5A9E8F30'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#2E4248'; e.currentTarget.style.borderColor = '#1E2D30'; }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 0M4 4l0 5M15 9l5-5m0 0l-5 0m5 0l0 5M9 15l-5 5m0 0l5 0m-5 0l0-5M15 15l5 5m0 0l-5 0m5 0l0-5" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Graph canvas */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <GraphVisualizer
              graph={displayGraph}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNode?.id || null}
              highlightedQuery={highlightedNodes.length > 0 ? 'highlighted' : undefined}
            />
          </div>

          {/* Time travel slider */}
          <div
            className="shrink-0 border-t px-8 py-3"
            style={{ borderColor: '#162025', background: '#080E11' }}
          >
            <TimeTravelSlider
              graph={fullGraph}
              onDateChange={handleDateChange}
            />
          </div>
        </div>

        {/* RAG chat panel */}
        {isRagChatOpen && (
          <div
            className="flex w-[300px] shrink-0 flex-col border-l"
            style={{ borderColor: '#162025', background: '#080E11' }}
          >
            <RAGChat
              graph={displayGraph}
              onHighlightNodes={handleHighlightNodes}
              onSelectNode={handleSelectNodeById}
            />
          </div>
        )}
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          graph={displayGraph}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
