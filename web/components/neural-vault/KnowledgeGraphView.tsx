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
    <div className="h-full flex flex-col bg-[#0B0E14]">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-[#161B22] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-[#E2E8F0]">Knowledge Graph</h1>

            {/* Inline Stats */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">Nodes:</span>
                <span className="font-semibold text-[#00F5FF]">{displayGraph.nodes.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">Connections:</span>
                <span className="font-semibold text-[#A3FF12]">{displayGraph.edges.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">Evolutions:</span>
                <span className="font-semibold text-[#FFB800]">{displayGraph.evolutionHistory.length}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            {displayGraph.metadata.totalSize} of intelligence
          </p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Graph Visualizer - Takes most space */}
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

          {/* Time Travel Slider - Compact */}
          <div className="flex-shrink-0 px-6 py-2 border-t border-[#161B22]">
            <TimeTravelSlider
              graph={fullGraph}
              onDateChange={handleDateChange}
            />
          </div>
        </div>

        {/* Right: RAG Chat - Smaller */}
        <div className="w-80 border-l border-[#161B22] bg-[#161B22]/30 flex flex-col min-h-0">
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
