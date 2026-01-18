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

// Sample Compliance Knowledge Graph for Demo
export const DEMO_KNOWLEDGE_GRAPH: KnowledgeGraph = {
  nodes: [
    {
      id: 'vendor-acme',
      type: 'entity',
      label: 'Acme Corp',
      description: 'SaaS vendor providing analytics services',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'agent-002',
        department: 'compliance',
        confidence: 0.95,
        operationId: 'op-001',
      },
      properties: {
        category: 'vendor',
        contractValue: 120000,
        region: 'EU',
      },
    },
    {
      id: 'policy-gdpr-art4',
      type: 'policy',
      label: 'GDPR Article 4',
      description: 'Definitions of personal data and processing',
      metadata: {
        created: new Date('2024-01-10'),
        createdBy: 'agent-001',
        department: 'compliance',
        confidence: 1.0,
      },
      properties: {
        regulation: 'GDPR',
        article: '4',
        jurisdiction: 'EU',
      },
    },
    {
      id: 'risk-indemnification',
      type: 'risk',
      label: 'Indemnification Risk',
      description: 'Liability cap below $1M threshold',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'agent-001',
        department: 'compliance',
        confidence: 0.85,
        operationId: 'op-001',
      },
      properties: {
        severity: 'high',
        category: 'financial',
        amount: 500000,
      },
    },
    {
      id: 'agent-sarah',
      type: 'agent',
      label: 'Sarah Mitchell',
      description: 'Compliance Auditor - GDPR Specialist',
      metadata: {
        created: new Date('2024-01-01'),
        createdBy: 'system',
        department: 'compliance',
        confidence: 1.0,
      },
      properties: {
        role: 'Compliance Auditor',
        level: 12,
        specialization: 'GDPR',
      },
    },
    {
      id: 'doc-acme-contract',
      type: 'document',
      label: 'Acme Corp - MSA',
      description: 'Master Service Agreement with Acme Corp',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'user',
        department: 'compliance',
        confidence: 1.0,
      },
      properties: {
        documentType: 'contract',
        pageCount: 47,
        signedDate: '2024-01-10',
      },
    },
    {
      id: 'decision-german-servers',
      type: 'decision',
      label: 'German Servers = Compliant',
      description: 'EU data hosted on German servers meets GDPR requirements',
      metadata: {
        created: new Date('2024-01-20'),
        createdBy: 'agent-001',
        department: 'compliance',
        confidence: 0.92,
        operationId: 'op-002',
      },
      properties: {
        approvedBy: 'user',
        validUntil: '2025-01-20',
      },
    },
    {
      id: 'vendor-dataflow',
      type: 'entity',
      label: 'DataFlow Systems',
      description: 'Data processing vendor',
      metadata: {
        created: new Date('2024-02-01'),
        createdBy: 'agent-002',
        department: 'compliance',
        confidence: 0.90,
      },
      properties: {
        category: 'vendor',
        contractValue: 85000,
        region: 'EU',
      },
    },
    {
      id: 'risk-liability-cap',
      type: 'risk',
      label: 'Low Liability Cap - DataFlow',
      description: 'Liability cap of $750K below threshold',
      metadata: {
        created: new Date('2024-02-01'),
        createdBy: 'agent-001',
        department: 'compliance',
        confidence: 0.88,
      },
      properties: {
        severity: 'medium',
        category: 'financial',
        amount: 750000,
      },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'agent-sarah',
      target: 'risk-indemnification',
      type: 'identified',
      label: 'identified',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'agent-001',
        confidence: 0.85,
        operationId: 'op-001',
        evidence: 'Clause 7.2: Liability limited to $500,000',
      },
    },
    {
      id: 'edge-2',
      source: 'risk-indemnification',
      target: 'doc-acme-contract',
      type: 'within',
      label: 'found within',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'agent-002',
        confidence: 1.0,
        evidence: 'Page 23, Section 7.2',
      },
    },
    {
      id: 'edge-3',
      source: 'risk-indemnification',
      target: 'vendor-acme',
      type: 'references',
      label: 'affects',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'agent-001',
        confidence: 0.95,
      },
    },
    {
      id: 'edge-4',
      source: 'decision-german-servers',
      target: 'policy-gdpr-art4',
      type: 'references',
      label: 'complies with',
      metadata: {
        created: new Date('2024-01-20'),
        createdBy: 'agent-001',
        confidence: 0.92,
        operationId: 'op-002',
      },
    },
    {
      id: 'edge-5',
      source: 'decision-german-servers',
      target: 'agent-sarah',
      type: 'learned_from',
      label: 'learned from feedback',
      metadata: {
        created: new Date('2024-01-20'),
        createdBy: 'system',
        confidence: 1.0,
        evidence: 'CEO correction in Operation #442',
      },
    },
    {
      id: 'edge-6',
      source: 'agent-sarah',
      target: 'risk-liability-cap',
      type: 'identified',
      label: 'identified',
      metadata: {
        created: new Date('2024-02-01'),
        createdBy: 'agent-001',
        confidence: 0.88,
      },
    },
    {
      id: 'edge-7',
      source: 'risk-liability-cap',
      target: 'vendor-dataflow',
      type: 'references',
      label: 'affects',
      metadata: {
        created: new Date('2024-02-01'),
        createdBy: 'agent-001',
        confidence: 0.90,
      },
    },
  ],
  evolutionHistory: [
    {
      id: 'evt-1',
      timestamp: new Date('2024-01-10'),
      type: 'node_added',
      nodeId: 'policy-gdpr-art4',
      agentId: 'agent-001',
      description: 'Added GDPR Article 4 policy from knowledge base',
    },
    {
      id: 'evt-2',
      timestamp: new Date('2024-01-15'),
      type: 'node_added',
      nodeId: 'risk-indemnification',
      agentId: 'agent-001',
      operationId: 'op-001',
      description: 'Identified indemnification risk in Acme Corp contract',
    },
    {
      id: 'evt-3',
      timestamp: new Date('2024-01-20'),
      type: 'learning',
      nodeId: 'decision-german-servers',
      agentId: 'agent-001',
      operationId: 'op-002',
      description: 'Learned that German servers meet GDPR compliance',
      userFeedback: 'CEO confirmed: EU data on German servers is compliant',
    },
    {
      id: 'evt-4',
      timestamp: new Date('2024-02-01'),
      type: 'node_added',
      nodeId: 'risk-liability-cap',
      agentId: 'agent-001',
      description: 'Identified similar liability cap issue with DataFlow Systems',
    },
  ],
  metadata: {
    totalSize: '1.2GB',
    nodeCount: 8,
    edgeCount: 7,
    lastUpdated: new Date('2024-02-01'),
    departments: ['compliance', 'legal', 'finance'],
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

// Helper to get node color by type
export function getNodeColor(type: NodeType): string {
  const colors: Record<NodeType, string> = {
    entity: '#06B6D4',      // Electric Teal
    policy: '#6366F1',      // Electric Indigo
    risk: '#EF4444',        // Red
    agent: '#FDE047',       // Soft Gold
    document: '#8B5CF6',    // Purple
    decision: '#10B981',    // Green
    concept: '#F59E0B',     // Amber
    preference: '#EC4899',  // Pink (for learned preferences)
  };
  return colors[type];
}

// Helper to get relationship color
export function getRelationshipColor(type: RelationshipType): string {
  const colors: Record<RelationshipType, string> = {
    identified: '#06B6D4',      // Teal (Data)
    within: '#6B7280',          // Gray (Reference)
    approved_by: '#10B981',     // Green (Approval)
    contradicts: '#EF4444',     // Red (Conflict)
    references: '#8B5CF6',      // Purple (Link)
    requires: '#F59E0B',        // Amber (Dependency)
    mitigates: '#10B981',       // Green (Mitigation)
    learned_from: '#A855F7',    // Purple (Evolution)
    supersedes: '#F59E0B',      // Amber (Replacement)
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
