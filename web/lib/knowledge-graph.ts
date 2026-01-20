// Knowledge Graph Types and Data Model

export type NodeType =
  | 'entity'      // Companies, people, objects
  | 'policy'      // Rules, regulations, policies
  | 'risk'        // Identified risks
  | 'agent'       // AI agents/employees
  | 'document'    // Source documents
  | 'decision'    // Decision points
  | 'concept'     // Abstract concepts
  | 'preference'; // Learned user preferences

export type RelationshipType =
  | 'identified'      // Agent identified something
  | 'within'          // Found within document
  | 'approved_by'     // Decision approved by
  | 'contradicts'     // Conflicts with
  | 'references'      // References another node
  | 'requires'        // Depends on
  | 'mitigates'       // Reduces risk
  | 'learned_from'    // Agent learned from feedback
  | 'supersedes';     // Replaces old knowledge

export interface KnowledgeNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  metadata: {
    created: Date;
    createdBy: string;  // Agent ID or 'user'
    operationId?: string;
    department: string;
    confidence: number; // 0-1
    isDeprecated?: boolean;
    deprecationReason?: string;
  };
  properties: Record<string, any>;
}

export interface KnowledgeEdge {
  id: string;
  source: string;      // Node ID
  target: string;      // Node ID
  type: RelationshipType;
  label: string;
  metadata: {
    created: Date;
    createdBy: string;
    operationId?: string;
    confidence: number;
    evidence?: string;  // Supporting text/quote
  };
}

export interface EvolutionEvent {
  id: string;
  timestamp: Date;
  type: 'node_added' | 'edge_added' | 'node_updated' | 'correction' | 'learning';
  nodeId?: string;
  edgeId?: string;
  agentId: string;
  operationId?: string;
  description: string;
  userFeedback?: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  evolutionHistory: EvolutionEvent[];
  metadata: {
    totalSize: string;  // e.g., "1.2GB"
    nodeCount: number;
    edgeCount: number;
    lastUpdated: Date;
    departments: string[];
  };
}

// Personal Branding Knowledge Graph for Demo
export const DEMO_KNOWLEDGE_GRAPH: KnowledgeGraph = {
  nodes: [
    // Agents
    {
      id: 'agent-lead-manager',
      type: 'agent',
      label: 'Elena Rodriguez',
      description: 'Lead Manager - Brand Strategy Coordinator',
      metadata: {
        created: new Date('2024-01-01'),
        createdBy: 'system',
        department: 'branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Lead Manager',
        level: 15,
        specialization: 'Brand Strategy',
      },
    },
    {
      id: 'agent-color-psych',
      type: 'agent',
      label: 'Marcus Chen',
      description: 'Color Psychologist - Visual Identity Expert',
      metadata: {
        created: new Date('2024-01-01'),
        createdBy: 'system',
        department: 'branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Color Psychologist',
        level: 12,
        specialization: 'Color Theory',
      },
    },
    {
      id: 'agent-typography',
      type: 'agent',
      label: 'Sofia Andersson',
      description: 'Typography Specialist - Font Systems Designer',
      metadata: {
        created: new Date('2024-01-01'),
        createdBy: 'system',
        department: 'branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Typography Specialist',
        level: 11,
        specialization: 'Font Design',
      },
    },
    {
      id: 'agent-viral-content',
      type: 'agent',
      label: 'Alex Thompson',
      description: 'Viral Content Creator - Engagement Strategist',
      metadata: {
        created: new Date('2024-01-02'),
        createdBy: 'system',
        department: 'branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Viral Content Creator',
        level: 13,
        specialization: 'Social Media',
      },
    },
    {
      id: 'agent-brand-strategist',
      type: 'agent',
      label: 'Priya Sharma',
      description: 'Brand Strategist - Voice & Tone Architect',
      metadata: {
        created: new Date('2024-01-02'),
        createdBy: 'system',
        department: 'branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Brand Strategist',
        level: 14,
        specialization: 'Brand Voice',
      },
    },
    // Concepts
    {
      id: 'concept-color-psychology',
      type: 'concept',
      label: 'Color Psychology',
      description: 'Strategic use of color to evoke emotions and build brand recognition',
      metadata: {
        created: new Date('2024-01-03'),
        createdBy: 'agent-color-psych',
        department: 'branding',
        confidence: 0.95,
      },
      properties: {
        category: 'visual-identity',
        importance: 'high',
      },
    },
    {
      id: 'concept-typography-system',
      type: 'concept',
      label: 'Typography System',
      description: 'Hierarchical font system for consistent brand communication',
      metadata: {
        created: new Date('2024-01-03'),
        createdBy: 'agent-typography',
        department: 'branding',
        confidence: 0.93,
      },
      properties: {
        category: 'visual-identity',
        importance: 'high',
      },
    },
    {
      id: 'concept-viral-mechanics',
      type: 'concept',
      label: 'Viral Content Strategy',
      description: 'Framework for creating shareable, engaging content that resonates',
      metadata: {
        created: new Date('2024-01-04'),
        createdBy: 'agent-viral-content',
        department: 'branding',
        confidence: 0.88,
      },
      properties: {
        category: 'content-strategy',
        importance: 'high',
      },
    },
    {
      id: 'concept-brand-voice',
      type: 'concept',
      label: 'Brand Voice',
      description: 'Consistent personality and tone across all communications',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-brand-strategist',
        department: 'branding',
        confidence: 0.92,
      },
      properties: {
        category: 'messaging',
        importance: 'critical',
      },
    },
    {
      id: 'concept-consistency',
      type: 'concept',
      label: 'Content Consistency',
      description: 'Unified brand experience across all touchpoints and platforms',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-lead-manager',
        department: 'branding',
        confidence: 0.94,
      },
      properties: {
        category: 'strategy',
        importance: 'critical',
      },
    },
    // Documents
    {
      id: 'doc-brand-guidelines',
      type: 'document',
      label: 'Brand Guidelines',
      description: 'Comprehensive guide to visual identity, voice, and usage standards',
      metadata: {
        created: new Date('2024-01-10'),
        createdBy: 'agent-lead-manager',
        department: 'branding',
        confidence: 1.0,
      },
      properties: {
        documentType: 'guidelines',
        pageCount: 42,
        version: '1.0',
      },
    },
    {
      id: 'doc-style-guide',
      type: 'document',
      label: 'Visual Style Guide',
      description: 'Color palettes, typography specs, and design system documentation',
      metadata: {
        created: new Date('2024-01-12'),
        createdBy: 'agent-color-psych',
        department: 'branding',
        confidence: 1.0,
      },
      properties: {
        documentType: 'style-guide',
        pageCount: 28,
        version: '1.0',
      },
    },
    {
      id: 'doc-content-calendar',
      type: 'document',
      label: 'Content Calendar Q1',
      description: 'Strategic content schedule for maximum engagement',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'agent-viral-content',
        department: 'branding',
        confidence: 0.90,
      },
      properties: {
        documentType: 'calendar',
        timeframe: 'Q1 2024',
        platformCount: 5,
      },
    },
    // Decisions
    {
      id: 'decision-color-scheme',
      type: 'decision',
      label: 'Neural Midnight Palette',
      description: 'Approved color scheme: Deep charcoal, electric cyan, neon lime, warm amber',
      metadata: {
        created: new Date('2024-01-18'),
        createdBy: 'agent-color-psych',
        department: 'branding',
        confidence: 0.96,
        operationId: 'op-brand-001',
      },
      properties: {
        approvedBy: 'user',
        validUntil: '2025-01-18',
        primaryColors: ['#0B0E14', '#00F5FF', '#A3FF12', '#FFB800'],
      },
    },
    {
      id: 'decision-typography',
      type: 'decision',
      label: 'Inter + JetBrains Mono',
      description: 'Typography system: Inter for UI, JetBrains Mono for technical content',
      metadata: {
        created: new Date('2024-01-20'),
        createdBy: 'agent-typography',
        department: 'branding',
        confidence: 0.94,
        operationId: 'op-brand-002',
      },
      properties: {
        approvedBy: 'user',
        validUntil: '2025-01-20',
        fonts: ['Inter', 'JetBrains Mono'],
      },
    },
    {
      id: 'decision-content-pillars',
      type: 'decision',
      label: 'Content Pillars',
      description: 'Focus areas: AI innovation, productivity, behind-the-scenes, success stories',
      metadata: {
        created: new Date('2024-01-22'),
        createdBy: 'agent-brand-strategist',
        department: 'branding',
        confidence: 0.91,
        operationId: 'op-brand-003',
      },
      properties: {
        approvedBy: 'user',
        pillars: ['AI Innovation', 'Productivity', 'Behind-the-Scenes', 'Success Stories'],
      },
    },
    // Preferences (learned from user feedback)
    {
      id: 'pref-minimal-design',
      type: 'preference',
      label: 'Minimal Design',
      description: 'User prefers clean, minimal interfaces with strategic use of color',
      metadata: {
        created: new Date('2024-01-25'),
        createdBy: 'agent-lead-manager',
        department: 'branding',
        confidence: 0.89,
      },
      properties: {
        category: 'design-philosophy',
        appliedCount: 12,
        learnedFrom: 'user-feedback',
      },
    },
    {
      id: 'pref-tech-aesthetic',
      type: 'preference',
      label: 'Tech-Forward Aesthetic',
      description: 'Emphasis on digital, futuristic, tech-savvy visual language',
      metadata: {
        created: new Date('2024-01-26'),
        createdBy: 'agent-color-psych',
        department: 'branding',
        confidence: 0.92,
      },
      properties: {
        category: 'visual-style',
        appliedCount: 8,
        learnedFrom: 'user-feedback',
      },
    },
    {
      id: 'pref-animation',
      type: 'preference',
      label: 'Subtle Animations',
      description: 'User prefers smooth, purposeful animations (breathe-glow, topo-wave, etc.)',
      metadata: {
        created: new Date('2024-01-27'),
        createdBy: 'agent-typography',
        department: 'branding',
        confidence: 0.87,
      },
      properties: {
        category: 'interaction-design',
        appliedCount: 15,
        learnedFrom: 'user-feedback',
      },
    },
  ],
  edges: [
    // Lead Manager coordinates all brand concepts
    {
      id: 'edge-1',
      source: 'agent-lead-manager',
      target: 'concept-consistency',
      type: 'identified',
      label: 'defines',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-lead-manager',
        confidence: 0.94,
      },
    },
    {
      id: 'edge-2',
      source: 'agent-lead-manager',
      target: 'doc-brand-guidelines',
      type: 'references',
      label: 'authored',
      metadata: {
        created: new Date('2024-01-10'),
        createdBy: 'agent-lead-manager',
        confidence: 1.0,
      },
    },
    // Color Psychologist's expertise
    {
      id: 'edge-3',
      source: 'agent-color-psych',
      target: 'concept-color-psychology',
      type: 'identified',
      label: 'defines',
      metadata: {
        created: new Date('2024-01-03'),
        createdBy: 'agent-color-psych',
        confidence: 0.95,
      },
    },
    {
      id: 'edge-4',
      source: 'agent-color-psych',
      target: 'decision-color-scheme',
      type: 'references',
      label: 'proposed',
      metadata: {
        created: new Date('2024-01-18'),
        createdBy: 'agent-color-psych',
        confidence: 0.96,
        operationId: 'op-brand-001',
      },
    },
    {
      id: 'edge-5',
      source: 'decision-color-scheme',
      target: 'doc-style-guide',
      type: 'within',
      label: 'documented in',
      metadata: {
        created: new Date('2024-01-18'),
        createdBy: 'agent-color-psych',
        confidence: 1.0,
      },
    },
    // Typography Specialist's work
    {
      id: 'edge-6',
      source: 'agent-typography',
      target: 'concept-typography-system',
      type: 'identified',
      label: 'defines',
      metadata: {
        created: new Date('2024-01-03'),
        createdBy: 'agent-typography',
        confidence: 0.93,
      },
    },
    {
      id: 'edge-7',
      source: 'agent-typography',
      target: 'decision-typography',
      type: 'references',
      label: 'proposed',
      metadata: {
        created: new Date('2024-01-20'),
        createdBy: 'agent-typography',
        confidence: 0.94,
        operationId: 'op-brand-002',
      },
    },
    {
      id: 'edge-8',
      source: 'decision-typography',
      target: 'doc-style-guide',
      type: 'within',
      label: 'documented in',
      metadata: {
        created: new Date('2024-01-20'),
        createdBy: 'agent-typography',
        confidence: 1.0,
      },
    },
    // Viral Content Creator's strategy
    {
      id: 'edge-9',
      source: 'agent-viral-content',
      target: 'concept-viral-mechanics',
      type: 'identified',
      label: 'defines',
      metadata: {
        created: new Date('2024-01-04'),
        createdBy: 'agent-viral-content',
        confidence: 0.88,
      },
    },
    {
      id: 'edge-10',
      source: 'agent-viral-content',
      target: 'doc-content-calendar',
      type: 'references',
      label: 'authored',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'agent-viral-content',
        confidence: 0.90,
      },
    },
    {
      id: 'edge-11',
      source: 'concept-viral-mechanics',
      target: 'decision-content-pillars',
      type: 'requires',
      label: 'informs',
      metadata: {
        created: new Date('2024-01-22'),
        createdBy: 'agent-brand-strategist',
        confidence: 0.91,
      },
    },
    // Brand Strategist's voice work
    {
      id: 'edge-12',
      source: 'agent-brand-strategist',
      target: 'concept-brand-voice',
      type: 'identified',
      label: 'defines',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-brand-strategist',
        confidence: 0.92,
      },
    },
    {
      id: 'edge-13',
      source: 'agent-brand-strategist',
      target: 'decision-content-pillars',
      type: 'references',
      label: 'proposed',
      metadata: {
        created: new Date('2024-01-22'),
        createdBy: 'agent-brand-strategist',
        confidence: 0.91,
        operationId: 'op-brand-003',
      },
    },
    {
      id: 'edge-14',
      source: 'concept-brand-voice',
      target: 'doc-brand-guidelines',
      type: 'within',
      label: 'documented in',
      metadata: {
        created: new Date('2024-01-10'),
        createdBy: 'agent-lead-manager',
        confidence: 1.0,
      },
    },
    // Learned preferences
    {
      id: 'edge-15',
      source: 'agent-lead-manager',
      target: 'pref-minimal-design',
      type: 'learned_from',
      label: 'learned preference',
      metadata: {
        created: new Date('2024-01-25'),
        createdBy: 'system',
        confidence: 0.89,
        evidence: 'User feedback: "make it more minimal"',
      },
    },
    {
      id: 'edge-16',
      source: 'agent-color-psych',
      target: 'pref-tech-aesthetic',
      type: 'learned_from',
      label: 'learned preference',
      metadata: {
        created: new Date('2024-01-26'),
        createdBy: 'system',
        confidence: 0.92,
        evidence: 'User approved Neural Midnight palette',
      },
    },
    {
      id: 'edge-17',
      source: 'agent-typography',
      target: 'pref-animation',
      type: 'learned_from',
      label: 'learned preference',
      metadata: {
        created: new Date('2024-01-27'),
        createdBy: 'system',
        confidence: 0.87,
        evidence: 'User requested animations: topo-wave, pulse-ripple, etc.',
      },
    },
    // Cross-concept relationships
    {
      id: 'edge-18',
      source: 'concept-consistency',
      target: 'concept-brand-voice',
      type: 'requires',
      label: 'depends on',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-lead-manager',
        confidence: 0.93,
      },
    },
    {
      id: 'edge-19',
      source: 'concept-consistency',
      target: 'concept-color-psychology',
      type: 'requires',
      label: 'depends on',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-lead-manager',
        confidence: 0.93,
      },
    },
    {
      id: 'edge-20',
      source: 'concept-consistency',
      target: 'concept-typography-system',
      type: 'requires',
      label: 'depends on',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-lead-manager',
        confidence: 0.93,
      },
    },
    // Preferences inform decisions
    {
      id: 'edge-21',
      source: 'pref-minimal-design',
      target: 'decision-color-scheme',
      type: 'references',
      label: 'influenced',
      metadata: {
        created: new Date('2024-01-25'),
        createdBy: 'agent-lead-manager',
        confidence: 0.89,
      },
    },
    {
      id: 'edge-22',
      source: 'pref-tech-aesthetic',
      target: 'decision-color-scheme',
      type: 'references',
      label: 'influenced',
      metadata: {
        created: new Date('2024-01-26'),
        createdBy: 'agent-color-psych',
        confidence: 0.92,
      },
    },
  ],
  evolutionHistory: [
    {
      id: 'evt-1',
      timestamp: new Date('2024-01-03'),
      type: 'node_added',
      nodeId: 'concept-color-psychology',
      agentId: 'agent-color-psych',
      description: 'Color Psychologist established color psychology framework',
    },
    {
      id: 'evt-2',
      timestamp: new Date('2024-01-03'),
      type: 'node_added',
      nodeId: 'concept-typography-system',
      agentId: 'agent-typography',
      description: 'Typography Specialist defined hierarchical font system',
    },
    {
      id: 'evt-3',
      timestamp: new Date('2024-01-04'),
      type: 'node_added',
      nodeId: 'concept-viral-mechanics',
      agentId: 'agent-viral-content',
      description: 'Viral Content Creator proposed engagement framework',
    },
    {
      id: 'evt-4',
      timestamp: new Date('2024-01-05'),
      type: 'node_added',
      nodeId: 'concept-brand-voice',
      agentId: 'agent-brand-strategist',
      description: 'Brand Strategist defined consistent brand voice',
    },
    {
      id: 'evt-5',
      timestamp: new Date('2024-01-18'),
      type: 'node_added',
      nodeId: 'decision-color-scheme',
      agentId: 'agent-color-psych',
      operationId: 'op-brand-001',
      description: 'Neural Midnight color palette approved',
      userFeedback: 'User approved: Deep charcoal, electric cyan, neon lime, warm amber',
    },
    {
      id: 'evt-6',
      timestamp: new Date('2024-01-20'),
      type: 'node_added',
      nodeId: 'decision-typography',
      agentId: 'agent-typography',
      operationId: 'op-brand-002',
      description: 'Typography system approved: Inter + JetBrains Mono',
      userFeedback: 'User approved: Inter for UI, JetBrains Mono for code',
    },
    {
      id: 'evt-7',
      timestamp: new Date('2024-01-22'),
      type: 'node_added',
      nodeId: 'decision-content-pillars',
      agentId: 'agent-brand-strategist',
      operationId: 'op-brand-003',
      description: 'Content pillars established for brand consistency',
    },
    {
      id: 'evt-8',
      timestamp: new Date('2024-01-25'),
      type: 'learning',
      nodeId: 'pref-minimal-design',
      agentId: 'agent-lead-manager',
      description: 'Learned user preference for minimal design',
      userFeedback: 'User feedback: "make it more minimal"',
    },
    {
      id: 'evt-9',
      timestamp: new Date('2024-01-26'),
      type: 'learning',
      nodeId: 'pref-tech-aesthetic',
      agentId: 'agent-color-psych',
      description: 'Learned user preference for tech-forward aesthetic',
      userFeedback: 'User approved Neural Midnight palette with tech emphasis',
    },
    {
      id: 'evt-10',
      timestamp: new Date('2024-01-27'),
      type: 'learning',
      nodeId: 'pref-animation',
      agentId: 'agent-typography',
      description: 'Learned user preference for subtle, purposeful animations',
      userFeedback: 'User requested: topo-wave, pulse-ripple, particle-stream animations',
    },
  ],
  metadata: {
    totalSize: '856MB',
    nodeCount: 19,
    edgeCount: 22,
    lastUpdated: new Date('2024-01-27'),
    departments: ['branding', 'design', 'content', 'strategy'],
  },
};

// Helper function to get graph at a specific point in time
export function getGraphAtTime(graph: KnowledgeGraph, date: Date): KnowledgeGraph {
  const events = graph.evolutionHistory.filter(e => e.timestamp <= date);

  // Filter nodes and edges created before the date
  const nodes = graph.nodes.filter(n => n.metadata.created <= date);
  const edges = graph.edges.filter(e => e.metadata.created <= date);

  return {
    nodes,
    edges,
    evolutionHistory: events,
    metadata: {
      ...graph.metadata,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      lastUpdated: date,
    },
  };
}

// Helper to get node color by type (Neural Midnight palette)
export function getNodeColor(type: NodeType): string {
  const colors: Record<NodeType, string> = {
    entity: '#00F5FF',      // Neural Accent (Electric Cyan)
    policy: '#6366F1',      // Electric Indigo (kept for variety)
    risk: '#EF4444',        // Red (warning color)
    agent: '#FFB800',       // Neural Alert (Warm Amber)
    document: '#8B5CF6',    // Purple (kept for variety)
    decision: '#A3FF12',    // Neural Success (Neon Lime)
    concept: '#F59E0B',     // Amber (kept for variety)
    preference: '#EC4899',  // Pink (for learned preferences)
  };
  return colors[type];
}

// Helper to get relationship color (Neural Midnight palette)
export function getRelationshipColor(type: RelationshipType): string {
  const colors: Record<RelationshipType, string> = {
    identified: '#00F5FF',      // Neural Accent - Cyan (Data discovery)
    within: '#2D3748',          // Neural Subtle (Reference)
    approved_by: '#A3FF12',     // Neural Success - Lime (Approval)
    contradicts: '#EF4444',     // Red (Conflict/Warning)
    references: '#8B5CF6',      // Purple (Link - kept for variety)
    requires: '#FFB800',        // Neural Alert - Amber (Dependency)
    mitigates: '#A3FF12',       // Neural Success - Lime (Mitigation)
    learned_from: '#EC4899',    // Pink (Evolution/Learning)
    supersedes: '#FFB800',      // Neural Alert - Amber (Replacement)
  };
  return colors[type];
}

// Storage functions
const STORAGE_KEY = 'evolvian_knowledge_graph';

export function saveKnowledgeGraph(graph: KnowledgeGraph): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
  } catch (error) {
    console.error('Failed to save knowledge graph:', error);
  }
}

export function getKnowledgeGraph(): KnowledgeGraph {
  if (typeof window === 'undefined') return DEMO_KNOWLEDGE_GRAPH;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      parsed.nodes = parsed.nodes.map((n: any) => ({
        ...n,
        metadata: {
          ...n.metadata,
          created: new Date(n.metadata.created),
        },
      }));
      parsed.edges = parsed.edges.map((e: any) => ({
        ...e,
        metadata: {
          ...e.metadata,
          created: new Date(e.metadata.created),
        },
      }));
      parsed.evolutionHistory = parsed.evolutionHistory.map((evt: any) => ({
        ...evt,
        timestamp: new Date(evt.timestamp),
      }));
      parsed.metadata.lastUpdated = new Date(parsed.metadata.lastUpdated);
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load knowledge graph:', error);
  }

  return DEMO_KNOWLEDGE_GRAPH;
}

// Function to sync learned preferences from agents to knowledge graph
export function syncPreferencesToGraph(teamId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    // Import getHiredAgents dynamically to avoid circular dependency
    const agentsModule = require('./agents');
    const agents = agentsModule.getHiredAgents(teamId);

    const graph = getKnowledgeGraph();

    // Process each agent's learned preferences
    agents.forEach((agent: any) => {
      if (!agent.learnedPreferences || agent.learnedPreferences.length === 0) return;

      // Ensure agent node exists in graph
      let agentNode = graph.nodes.find(n => n.id === agent.id);
      if (!agentNode) {
        agentNode = {
          id: agent.id,
          type: 'agent',
          label: agent.name,
          description: agent.role,
          metadata: {
            created: agent.hiredAt || new Date(),
            createdBy: 'system',
            department: agent.category || 'general',
            confidence: 1.0,
          },
          properties: {
            role: agent.role,
            level: agent.agentLevel || 1,
            specialization: agent.specialization,
          },
        };
        graph.nodes.push(agentNode);
      }

      // Add each learned preference as a node
      agent.learnedPreferences.forEach((pref: any) => {
        const prefId = `pref-${pref.id}`;

        // Check if preference node already exists
        if (graph.nodes.find(n => n.id === prefId)) return;

        // Create preference node
        const prefNode: KnowledgeNode = {
          id: prefId,
          type: 'preference',
          label: pref.category,
          description: pref.rule,
          metadata: {
            created: pref.learnedAt || new Date(),
            createdBy: agent.id,
            department: agent.category || 'general',
            confidence: pref.confidence / 100, // Convert to 0-1 scale
          },
          properties: {
            category: pref.category,
            rule: pref.rule,
            appliedCount: pref.appliedCount,
          },
        };

        graph.nodes.push(prefNode);

        // Create edge from agent to preference
        const edgeId = `edge-${agent.id}-${pref.id}`;
        if (!graph.edges.find(e => e.id === edgeId)) {
          const edge: KnowledgeEdge = {
            id: edgeId,
            source: agent.id,
            target: prefId,
            type: 'learned_from',
            label: 'learned preference',
            metadata: {
              created: pref.learnedAt || new Date(),
              createdBy: 'system',
              confidence: pref.confidence / 100,
              evidence: `Agent evolved: ${pref.rule}`,
            },
          };
          graph.edges.push(edge);
        }

        // Add evolution event
        const evtId = `evt-pref-${pref.id}`;
        if (!graph.evolutionHistory.find(e => e.id === evtId)) {
          const event: EvolutionEvent = {
            id: evtId,
            timestamp: pref.learnedAt || new Date(),
            type: 'learning',
            nodeId: prefId,
            agentId: agent.id,
            description: `${agent.name} learned: ${pref.category} - ${pref.rule}`,
            userFeedback: pref.rule,
          };
          graph.evolutionHistory.push(event);
        }
      });
    });

    // Update metadata
    graph.metadata.nodeCount = graph.nodes.length;
    graph.metadata.edgeCount = graph.edges.length;
    graph.metadata.lastUpdated = new Date();

    // Save updated graph
    saveKnowledgeGraph(graph);
  } catch (error) {
    console.error('Failed to sync preferences to graph:', error);
  }
}
