'use client';

import { useEffect, useRef, useState } from 'react';
import {
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeEdge,
  getNodeColor,
  getRelationshipColor,
} from '@/lib/knowledge-graph';

interface GraphVisualizerProps {
  graph: KnowledgeGraph;
  onNodeClick: (node: KnowledgeNode) => void;
  selectedNodeId: string | null;
  highlightedQuery?: string;
}

interface NodePosition extends KnowledgeNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function GraphVisualizer({
  graph,
  onNodeClick,
  selectedNodeId,
  highlightedQuery,
}: GraphVisualizerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1600, height: 1000 });
  const animationRef = useRef<number>();

  // Zoom and Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Handle resize and initialize dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const width = Math.min(canvasRef.current.clientWidth, 3000); // Max cap at 3000px
        const height = Math.min(canvasRef.current.clientHeight, 2000); // Max cap at 2000px
        setDimensions({ width, height });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Initialize node positions
  useEffect(() => {
    const { width, height } = dimensions;

    const initialNodes: NodePosition[] = graph.nodes.map((node, i) => ({
      ...node,
      x: width / 2 + Math.random() * 800 - 400,
      y: height / 2 + Math.random() * 800 - 400,
      vx: 0,
      vy: 0,
    }));

    setNodes(initialNodes);
  }, [graph.nodes, dimensions]);

  // Simple force-directed layout simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      setNodes((prevNodes) => {
        const newNodes = [...prevNodes];
        const { width, height } = dimensions;

        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          let fx = 0;
          let fy = 0;

          // Repulsion between nodes (increased for better spacing)
          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue;
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 20000 / (dist * dist); // Increased from 10000
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          // Attraction along edges (slightly reduced to allow more spread)
          graph.edges.forEach((edge) => {
            const sourceIdx = newNodes.findIndex((n) => n.id === edge.source);
            const targetIdx = newNodes.findIndex((n) => n.id === edge.target);

            if (sourceIdx === i) {
              const dx = newNodes[targetIdx].x - newNodes[i].x;
              const dy = newNodes[targetIdx].y - newNodes[i].y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = dist * 0.008; // Slightly reduced from 0.01
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
            if (targetIdx === i) {
              const dx = newNodes[sourceIdx].x - newNodes[i].x;
              const dy = newNodes[sourceIdx].y - newNodes[i].y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = dist * 0.008; // Slightly reduced from 0.01
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
          });

          // Center gravity (reduced to allow more spread)
          const centerX = width / 2;
          const centerY = height / 2;
          fx += (centerX - newNodes[i].x) * 0.0005; // Reduced from 0.001
          fy += (centerY - newNodes[i].y) * 0.0005;

          // Update velocity and position
          newNodes[i].vx = (newNodes[i].vx + fx) * 0.8;
          newNodes[i].vy = (newNodes[i].vy + fy) * 0.8;
          newNodes[i].x += newNodes[i].vx;
          newNodes[i].y += newNodes[i].vy;

          // Boundary constraints (increased margins for larger nodes)
          newNodes[i].x = Math.max(100, Math.min(width - 100, newNodes[i].x));
          newNodes[i].y = Math.max(100, Math.min(height - 100, newNodes[i].y));
        }

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, graph.edges, dimensions]);

  const getConnectedNodes = (nodeId: string): Set<string> => {
    const connected = new Set<string>();
    graph.edges.forEach((edge) => {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    });
    return connected;
  };

  const connectedNodes = hoveredNodeId ? getConnectedNodes(hoveredNodeId) : new Set();

  // Zoom and pan handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.metaKey || e.ctrlKey || e.shiftKey)) {
      // Pan with cmd/ctrl/shift + click
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div ref={canvasRef} className="absolute inset-0 w-full h-full bg-[#0B0E14]">
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
        {/* Draw edges */}
        <g>
          {graph.edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const isHighlighted =
              hoveredNodeId === edge.source || hoveredNodeId === edge.target;
            const opacity = hoveredNodeId && !isHighlighted ? 0.15 : 0.6;

            return (
              <g key={edge.id}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={getRelationshipColor(edge.type)}
                  strokeWidth={isHighlighted ? 4 : 2.5}
                  opacity={opacity}
                  className="transition-all duration-300"
                />
                {/* Edge label */}
                {isHighlighted && (
                  <>
                    <rect
                      x={(sourceNode.x + targetNode.x) / 2 - 35}
                      y={(sourceNode.y + targetNode.y) / 2 - 10}
                      width="70"
                      height="20"
                      fill="#161B22"
                      opacity="0.9"
                      rx="4"
                    />
                    <text
                      x={(sourceNode.x + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y) / 2 + 4}
                      fill="#E2E8F0"
                      fontSize="12"
                      fontWeight="500"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {edge.label}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>

        {/* Draw nodes */}
        <g>
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isConnected = connectedNodes.has(node.id);
            const isDimmed = hoveredNodeId && !isHovered && !isConnected;

            const radius = isSelected ? 55 : isHovered ? 48 : 40;
            const opacity = isDimmed ? 0.2 : 1;

            return (
              <g
                key={node.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => onNodeClick(node)}
                className="transition-all duration-300"
              >
                {/* Glow effect for selected/hovered */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + 10}
                    fill={getNodeColor(node.type)}
                    opacity={0.2}
                    className="animate-pulse"
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={getNodeColor(node.type)}
                  opacity={opacity}
                  stroke={isSelected ? '#FDE047' : getNodeColor(node.type)}
                  strokeWidth={isSelected ? 3 : 1}
                />

                {/* Node icon */}
                <text
                  x={node.x}
                  y={node.y + 10}
                  textAnchor="middle"
                  fill="#020617"
                  fontSize="30"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  {node.type === 'agent' ? '👤' : node.type === 'risk' ? '⚠️' : node.type === 'policy' ? '📋' : node.type === 'document' ? '📄' : node.type === 'decision' ? '✓' : node.type === 'preference' ? '💡' : node.type === 'concept' ? '🎯' : '📍'}
                </text>

                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y + radius + 22}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="15"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  className="pointer-events-none select-none"
                  opacity={isDimmed ? 0.3 : 1}
                >
                  {node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label}
                </text>
              </g>
            );
          })}
        </g>
        </g>
      </svg>

      {/* Help Instructions */}
      <div className="absolute top-4 right-4 glass rounded-lg p-3 max-w-xs">
        <h4 className="text-xs font-semibold text-white mb-2">Navigation Controls</h4>
        <div className="space-y-1 text-xs text-slate-400">
          <div>🖱️ <span className="text-slate-300">Scroll</span> to zoom in/out</div>
          <div>⌨️ <span className="text-slate-300">Cmd/Ctrl + Drag</span> to pan</div>
          <div>👆 <span className="text-slate-300">Click node</span> for details</div>
          <div>🎯 <span className="text-slate-300">Hover</span> to highlight connections</div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 translate-y-36 flex flex-col gap-2">
        <button
          onClick={() => setZoom((prev) => Math.min(5, prev * 1.2))}
          className="glass rounded-lg p-2.5 hover:bg-white/10 transition-all text-white font-bold text-lg"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(0.1, prev * 0.8))}
          className="glass rounded-lg p-2.5 hover:bg-white/10 transition-all text-white font-bold text-lg"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="glass rounded-lg p-2 hover:bg-white/10 transition-all text-white text-base"
          title="Reset View"
        >
          ⟲
        </button>
        <div className="glass rounded-lg px-2 py-1.5 text-xs text-slate-400 text-center font-semibold">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg p-4 max-w-xs">
        <h4 className="text-xs font-semibold text-white mb-2">Relationship Types</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5" style={{ backgroundColor: getRelationshipColor('identified') }}></div>
            <span className="text-slate-400">Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5" style={{ backgroundColor: getRelationshipColor('contradicts') }}></div>
            <span className="text-slate-400">Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5" style={{ backgroundColor: getRelationshipColor('learned_from') }}></div>
            <span className="text-slate-400">Evolution</span>
          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 left-4 glass rounded-lg px-4 py-2">
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-white">{graph.nodes.length}</span> nodes ·
          <span className="font-semibold text-white ml-1">{graph.edges.length}</span> connections
        </div>
      </div>
    </div>
  );
}
