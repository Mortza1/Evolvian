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
      <div className="flex items-center justify-center h-full">
        <div className="p-8">
          <div className="animate-spin w-12 h-12 border-4 border-[#6366F1] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white mb-1">Knowledge Graph</h1>
            <p className="text-sm text-slate-500">
              {displayGraph.metadata.totalSize} of structured intelligence
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xl font-semibold text-[#06B6D4]">{displayGraph.nodes.length}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Nodes</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-[#6366F1]">{displayGraph.edges.length}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Connections</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-[#FDE047]">
                {displayGraph.evolutionHistory.length}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Evolutions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left/Center: Graph Visualizer */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Graph */}
          <div className="flex-1 overflow-hidden relative min-h-0">
            <GraphVisualizer
              graph={displayGraph}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNode?.id || null}
              highlightedQuery={highlightedNodes.length > 0 ? 'highlighted' : undefined}
            />
          </div>

          {/* Time Travel Slider */}
          <div className="flex-shrink-0 p-4 border-t border-slate-800">
            <TimeTravelSlider
              graph={fullGraph}
              onDateChange={handleDateChange}
            />
          </div>
        </div>

        {/* Right: RAG Chat */}
        <div className="w-96 border-l border-slate-800 bg-slate-900/50 flex flex-col min-h-0">
          <RAGChat
            graph={displayGraph}
            onHighlightNodes={handleHighlightNodes}
            onSelectNode={handleSelectNodeById}
          />
        </div>
      </div>

      {/* Node Detail Panel (Slide-out) */}
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
