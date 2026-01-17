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
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const animationRef = useRef<number>();

  // Initialize node positions
  useEffect(() => {
    const width = canvasRef.current?.clientWidth || 800;
    const height = canvasRef.current?.clientHeight || 600;

    const initialNodes: NodePosition[] = graph.nodes.map((node, i) => ({
      ...node,
      x: width / 2 + Math.random() * 200 - 100,
      y: height / 2 + Math.random() * 200 - 100,
      vx: 0,
      vy: 0,
    }));

    setNodes(initialNodes);
  }, [graph.nodes]);

  // Simple force-directed layout simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      setNodes((prevNodes) => {
        const newNodes = [...prevNodes];
        const width = canvasRef.current?.clientWidth || 800;
        const height = canvasRef.current?.clientHeight || 600;

        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          let fx = 0;
          let fy = 0;

          // Repulsion between nodes
          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue;
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 5000 / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          // Attraction along edges
          graph.edges.forEach((edge) => {
            const sourceIdx = newNodes.findIndex((n) => n.id === edge.source);
            const targetIdx = newNodes.findIndex((n) => n.id === edge.target);

            if (sourceIdx === i) {
              const dx = newNodes[targetIdx].x - newNodes[i].x;
              const dy = newNodes[targetIdx].y - newNodes[i].y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = dist * 0.01;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
            if (targetIdx === i) {
              const dx = newNodes[sourceIdx].x - newNodes[i].x;
              const dy = newNodes[sourceIdx].y - newNodes[i].y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = dist * 0.01;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
          });

          // Center gravity
          const centerX = width / 2;
          const centerY = height / 2;
          fx += (centerX - newNodes[i].x) * 0.001;
          fy += (centerY - newNodes[i].y) * 0.001;

          // Update velocity and position
          newNodes[i].vx = (newNodes[i].vx + fx) * 0.8;
          newNodes[i].vy = (newNodes[i].vy + fy) * 0.8;
          newNodes[i].x += newNodes[i].vx;
          newNodes[i].y += newNodes[i].vy;

          // Boundary constraints
          newNodes[i].x = Math.max(50, Math.min(width - 50, newNodes[i].x));
          newNodes[i].y = Math.max(50, Math.min(height - 50, newNodes[i].y));
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
  }, [nodes.length, graph.edges]);

  const getConnectedNodes = (nodeId: string): Set<string> => {
    const connected = new Set<string>();
    graph.edges.forEach((edge) => {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    });
    return connected;
  };

  const connectedNodes = hoveredNodeId ? getConnectedNodes(hoveredNodeId) : new Set();

  return (
    <div ref={canvasRef} className="relative w-full h-full bg-[#020617]">
      <svg className="w-full h-full">
        {/* Draw edges */}
        <g>
          {graph.edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const isHighlighted =
              hoveredNodeId === edge.source || hoveredNodeId === edge.target;
            const opacity = hoveredNodeId && !isHighlighted ? 0.1 : 0.4;

            return (
              <g key={edge.id}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={getRelationshipColor(edge.type)}
                  strokeWidth={isHighlighted ? 3 : 2}
                  opacity={opacity}
                  className="transition-all duration-300"
                />
                {/* Edge label */}
                {isHighlighted && (
                  <text
                    x={(sourceNode.x + targetNode.x) / 2}
                    y={(sourceNode.y + targetNode.y) / 2}
                    fill="#94A3B8"
                    fontSize="10"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {edge.label}
                  </text>
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

            const radius = isSelected ? 30 : isHovered ? 25 : 20;
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
                  y={node.y + 5}
                  textAnchor="middle"
                  fill="#020617"
                  fontSize="16"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  {node.type === 'agent' ? '👤' : node.type === 'risk' ? '⚠️' : node.type === 'policy' ? '📋' : node.type === 'document' ? '📄' : node.type === 'decision' ? '✓' : '📍'}
                </text>

                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y + radius + 15}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="11"
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
      </svg>

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
