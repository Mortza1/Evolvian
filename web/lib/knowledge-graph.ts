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
    // Personal Branding Team Agents
    {
      id: 'agent-aria',
      type: 'agent',
      label: 'Aria',
      description: 'Senior Brand Lead - Strategic oversight and brand coordination',
      metadata: {
        created: new Date('2024-01-01'),
        createdBy: 'system',
        department: 'Personal Branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Senior Brand Lead',
        level: 8,
        specialization: 'Brand Leadership',
      },
    },
    {
      id: 'agent-aurora',
      type: 'agent',
      label: 'Aurora',
      description: 'Color Oracle - Color psychology and visual identity expert',
      metadata: {
        created: new Date('2024-01-01'),
        createdBy: 'system',
        department: 'Personal Branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Color Oracle',
        level: 7,
        specialization: 'Color Psychology',
      },
    },
    {
      id: 'agent-atlas',
      type: 'agent',
      label: 'Atlas',
      description: 'Brand Strategist - Positioning, market analysis, strategic direction',
      metadata: {
        created: new Date('2024-01-01'),
        createdBy: 'system',
        department: 'Personal Branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Brand Strategist',
        level: 7,
        specialization: 'Strategic Positioning',
      },
    },
    {
      id: 'agent-lexis',
      type: 'agent',
      label: 'Lexis',
      description: 'Naming Expert - Brand naming, taglines, and messaging architecture',
      metadata: {
        created: new Date('2024-01-02'),
        createdBy: 'system',
        department: 'Personal Branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Naming Expert',
        level: 6,
        specialization: 'Messaging & Naming',
      },
    },
    {
      id: 'agent-sage',
      type: 'agent',
      label: 'Sage',
      description: 'Content Architect - Content strategy, pillars, and editorial planning',
      metadata: {
        created: new Date('2024-01-02'),
        createdBy: 'system',
        department: 'Personal Branding',
        confidence: 1.0,
      },
      properties: {
        role: 'Content Architect',
        level: 7,
        specialization: 'Content Strategy',
      },
    },
    // Brand Concepts
    {
      id: 'concept-target-audience',
      type: 'concept',
      label: 'Target Audience',
      description: 'Digitally-native professionals (28-45) seeking authentic strategic guidance',
      metadata: {
        created: new Date('2024-01-03'),
        createdBy: 'agent-atlas',
        department: 'Personal Branding',
        confidence: 0.95,
      },
      properties: {
        category: 'strategy',
        importance: 'critical',
        demographics: '28-45, professionals',
      },
    },
    {
      id: 'concept-brand-personality',
      type: 'concept',
      label: 'Brand Personality',
      description: 'Innovative, authentic, strategic, and empowering - trusted advisor approach',
      metadata: {
        created: new Date('2024-01-03'),
        createdBy: 'agent-aria',
        department: 'Personal Branding',
        confidence: 0.93,
      },
      properties: {
        category: 'messaging',
        importance: 'critical',
        traits: ['innovative', 'authentic', 'strategic', 'empowering'],
      },
    },
    {
      id: 'concept-content-pillars',
      type: 'concept',
      label: 'Content Pillars',
      description: 'Strategic Insights (40%), Personal Growth (30%), Behind-Scenes (20%), Community (10%)',
      metadata: {
        created: new Date('2024-01-04'),
        createdBy: 'agent-sage',
        department: 'Personal Branding',
        confidence: 0.91,
      },
      properties: {
        category: 'content-strategy',
        importance: 'high',
        pillars: 4,
      },
    },
    {
      id: 'concept-brand-voice',
      type: 'concept',
      label: 'Brand Voice',
      description: 'Conversational yet professional, direct, inspiring, knowledgeable',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-lexis',
        department: 'Personal Branding',
        confidence: 0.92,
      },
      properties: {
        category: 'messaging',
        importance: 'critical',
      },
    },
    {
      id: 'concept-visual-identity',
      type: 'concept',
      label: 'Visual Identity System',
      description: 'Neural Midnight palette with bold, modern energy and professional credibility',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-aurora',
        department: 'Personal Branding',
        confidence: 0.96,
      },
      properties: {
        category: 'visual-identity',
        importance: 'high',
      },
    },
    {
      id: 'concept-differentiation',
      type: 'concept',
      label: 'Market Differentiation',
      description: 'Experience-driven depth vs surface-level advice, community-first approach',
      metadata: {
        created: new Date('2024-01-06'),
        createdBy: 'agent-atlas',
        department: 'Personal Branding',
        confidence: 0.89,
      },
      properties: {
        category: 'strategy',
        importance: 'critical',
      },
    },
    // Brand Documents
    {
      id: 'doc-brand-strategy',
      type: 'document',
      label: 'Personal Brand Strategy Document',
      description: 'Comprehensive strategy covering positioning, audience, and differentiation',
      metadata: {
        created: new Date('2024-01-10'),
        createdBy: 'agent-atlas',
        department: 'Personal Branding',
        confidence: 1.0,
      },
      properties: {
        documentType: 'strategy',
        pageCount: 35,
        version: '2.1',
      },
    },
    {
      id: 'doc-visual-identity',
      type: 'document',
      label: 'Visual Identity Guide',
      description: 'Neural Midnight color palette, logo usage, and visual guidelines',
      metadata: {
        created: new Date('2024-01-12'),
        createdBy: 'agent-aurora',
        department: 'Personal Branding',
        confidence: 1.0,
      },
      properties: {
        documentType: 'visual-guide',
        pageCount: 24,
        version: '1.5',
      },
    },
    {
      id: 'doc-content-strategy',
      type: 'document',
      label: 'Content Strategy & Editorial Calendar',
      description: 'Content pillars, posting schedule, and engagement tactics',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'agent-sage',
        department: 'Personal Branding',
        confidence: 0.94,
      },
      properties: {
        documentType: 'content-plan',
        timeframe: 'Q1-Q2 2024',
        platformCount: 4,
      },
    },
    {
      id: 'doc-messaging-framework',
      type: 'document',
      label: 'Messaging & Voice Framework',
      description: 'Brand voice guidelines, taglines, and messaging architecture',
      metadata: {
        created: new Date('2024-01-18'),
        createdBy: 'agent-lexis',
        department: 'Personal Branding',
        confidence: 0.92,
      },
      properties: {
        documentType: 'messaging-guide',
        pageCount: 18,
        version: '1.0',
      },
    },
    // Strategic Decisions
    {
      id: 'decision-brand-colors',
      type: 'decision',
      label: 'Neural Midnight Color Palette',
      description: 'Neon Lime (#A3FF12), Electric Cyan (#00F5FF), Warm Amber (#FFB800), Deep Charcoal (#0B0E14)',
      metadata: {
        created: new Date('2024-01-20'),
        createdBy: 'agent-aurora',
        department: 'Personal Branding',
        confidence: 0.97,
        operationId: 'op-brand-001',
      },
      properties: {
        approvedBy: 'user',
        validUntil: '2025-06-01',
        primaryColors: ['#A3FF12', '#00F5FF', '#FFB800', '#0B0E14'],
      },
    },
    {
      id: 'decision-brand-positioning',
      type: 'decision',
      label: 'Experience-Driven Authority',
      description: 'Positioned as battle-tested expert vs surface-level gurus, depth over virality',
      metadata: {
        created: new Date('2024-01-22'),
        createdBy: 'agent-atlas',
        department: 'Personal Branding',
        confidence: 0.94,
        operationId: 'op-brand-002',
      },
      properties: {
        approvedBy: 'user',
        differentiator: 'Experience & Depth',
        marketPosition: 'Premium Authority',
      },
    },
    {
      id: 'decision-content-pillars',
      type: 'decision',
      label: '4-Pillar Content Strategy',
      description: 'Strategic Insights (40%), Personal Growth (30%), Behind-Scenes (20%), Community (10%)',
      metadata: {
        created: new Date('2024-01-25'),
        createdBy: 'agent-sage',
        department: 'Personal Branding',
        confidence: 0.92,
        operationId: 'op-brand-003',
      },
      properties: {
        approvedBy: 'user',
        pillars: ['Strategic Insights', 'Personal Growth', 'Behind-the-Scenes', 'Community Engagement'],
        distribution: '40/30/20/10',
      },
    },
    {
      id: 'decision-tagline',
      type: 'decision',
      label: 'Brand Tagline',
      description: '"Building depth in a world of surface" - Core positioning statement',
      metadata: {
        created: new Date('2024-01-28'),
        createdBy: 'agent-lexis',
        department: 'Personal Branding',
        confidence: 0.89,
        operationId: 'op-brand-004',
      },
      properties: {
        approvedBy: 'user',
        tagline: 'Building depth in a world of surface',
      },
    },
    // Learned User Preferences
    {
      id: 'pref-brand-voice',
      type: 'preference',
      label: 'Authentic Communication',
      description: 'User values genuine, no-BS communication over corporate marketing speak',
      metadata: {
        created: new Date('2024-01-30'),
        createdBy: 'agent-lexis',
        department: 'Personal Branding',
        confidence: 0.95,
      },
      properties: {
        category: 'communication-style',
        appliedCount: 18,
        learnedFrom: 'user-feedback',
      },
    },
    {
      id: 'pref-depth-over-virality',
      type: 'preference',
      label: 'Depth Over Virality',
      description: 'User prioritizes substantial, thoughtful content over viral trends',
      metadata: {
        created: new Date('2024-02-02'),
        createdBy: 'agent-sage',
        department: 'Personal Branding',
        confidence: 0.91,
      },
      properties: {
        category: 'content-philosophy',
        appliedCount: 14,
        learnedFrom: 'user-feedback',
      },
    },
    {
      id: 'pref-community-first',
      type: 'preference',
      label: 'Community-First Approach',
      description: 'User wants to build genuine relationships, not just follower counts',
      metadata: {
        created: new Date('2024-02-05'),
        createdBy: 'agent-atlas',
        department: 'Personal Branding',
        confidence: 0.88,
      },
      properties: {
        category: 'audience-philosophy',
        appliedCount: 9,
        learnedFrom: 'user-feedback',
      },
    },
    {
      id: 'pref-bold-colors',
      type: 'preference',
      label: 'Bold Visual Expression',
      description: 'User prefers vibrant, eye-catching colors (Neural Midnight palette)',
      metadata: {
        created: new Date('2024-02-08'),
        createdBy: 'agent-aurora',
        department: 'Personal Branding',
        confidence: 0.93,
      },
      properties: {
        category: 'visual-preference',
        appliedCount: 12,
        learnedFrom: 'user-feedback',
      },
    },
  ],
  edges: [
    // Aria (Senior Lead) coordinates the team
    {
      id: 'edge-1',
      source: 'agent-aria',
      target: 'concept-brand-personality',
      type: 'identified',
      label: 'defined',
      metadata: {
        created: new Date('2024-01-03'),
        createdBy: 'agent-aria',
        confidence: 0.93,
      },
    },
    {
      id: 'edge-2',
      source: 'agent-aria',
      target: 'doc-brand-strategy',
      type: 'references',
      label: 'coordinates',
      metadata: {
        created: new Date('2024-01-10'),
        createdBy: 'agent-aria',
        confidence: 1.0,
      },
    },
    // Aurora (Color Oracle) visual identity work
    {
      id: 'edge-3',
      source: 'agent-aurora',
      target: 'concept-visual-identity',
      type: 'identified',
      label: 'designed',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-aurora',
        confidence: 0.96,
      },
    },
    {
      id: 'edge-4',
      source: 'agent-aurora',
      target: 'decision-brand-colors',
      type: 'references',
      label: 'proposed',
      metadata: {
        created: new Date('2024-01-20'),
        createdBy: 'agent-aurora',
        confidence: 0.97,
        operationId: 'op-brand-001',
      },
    },
    {
      id: 'edge-5',
      source: 'decision-brand-colors',
      target: 'doc-visual-identity',
      type: 'within',
      label: 'documented in',
      metadata: {
        created: new Date('2024-01-20'),
        createdBy: 'agent-aurora',
        confidence: 1.0,
      },
    },
    // Atlas (Brand Strategist) strategic work
    {
      id: 'edge-6',
      source: 'agent-atlas',
      target: 'concept-target-audience',
      type: 'identified',
      label: 'researched',
      metadata: {
        created: new Date('2024-01-03'),
        createdBy: 'agent-atlas',
        confidence: 0.95,
      },
    },
    {
      id: 'edge-7',
      source: 'agent-atlas',
      target: 'concept-differentiation',
      type: 'identified',
      label: 'defined',
      metadata: {
        created: new Date('2024-01-06'),
        createdBy: 'agent-atlas',
        confidence: 0.89,
      },
    },
    {
      id: 'edge-8',
      source: 'agent-atlas',
      target: 'decision-brand-positioning',
      type: 'references',
      label: 'proposed',
      metadata: {
        created: new Date('2024-01-22'),
        createdBy: 'agent-atlas',
        confidence: 0.94,
        operationId: 'op-brand-002',
      },
    },
    {
      id: 'edge-9',
      source: 'concept-differentiation',
      target: 'decision-brand-positioning',
      type: 'requires',
      label: 'informs',
      metadata: {
        created: new Date('2024-01-22'),
        createdBy: 'agent-atlas',
        confidence: 0.91,
      },
    },
    // Lexis (Naming Expert) messaging work
    {
      id: 'edge-10',
      source: 'agent-lexis',
      target: 'concept-brand-voice',
      type: 'identified',
      label: 'crafted',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-lexis',
        confidence: 0.92,
      },
    },
    {
      id: 'edge-11',
      source: 'agent-lexis',
      target: 'decision-tagline',
      type: 'references',
      label: 'created',
      metadata: {
        created: new Date('2024-01-28'),
        createdBy: 'agent-lexis',
        confidence: 0.89,
        operationId: 'op-brand-004',
      },
    },
    {
      id: 'edge-12',
      source: 'agent-lexis',
      target: 'doc-messaging-framework',
      type: 'references',
      label: 'authored',
      metadata: {
        created: new Date('2024-01-18'),
        createdBy: 'agent-lexis',
        confidence: 0.92,
      },
    },
    // Sage (Content Architect) content strategy
    {
      id: 'edge-13',
      source: 'agent-sage',
      target: 'concept-content-pillars',
      type: 'identified',
      label: 'designed',
      metadata: {
        created: new Date('2024-01-04'),
        createdBy: 'agent-sage',
        confidence: 0.91,
      },
    },
    {
      id: 'edge-14',
      source: 'agent-sage',
      target: 'decision-content-pillars',
      type: 'references',
      label: 'proposed',
      metadata: {
        created: new Date('2024-01-25'),
        createdBy: 'agent-sage',
        confidence: 0.92,
        operationId: 'op-brand-003',
      },
    },
    {
      id: 'edge-15',
      source: 'agent-sage',
      target: 'doc-content-strategy',
      type: 'references',
      label: 'authored',
      metadata: {
        created: new Date('2024-01-15'),
        createdBy: 'agent-sage',
        confidence: 0.94,
      },
    },
    // Learned preferences from agents
    {
      id: 'edge-16',
      source: 'agent-lexis',
      target: 'pref-brand-voice',
      type: 'learned_from',
      label: 'learned',
      metadata: {
        created: new Date('2024-01-30'),
        createdBy: 'system',
        confidence: 0.95,
        evidence: 'User emphasized authentic, genuine communication',
      },
    },
    {
      id: 'edge-17',
      source: 'agent-sage',
      target: 'pref-depth-over-virality',
      type: 'learned_from',
      label: 'learned',
      metadata: {
        created: new Date('2024-02-02'),
        createdBy: 'system',
        confidence: 0.91,
        evidence: 'User rejected viral content trends in favor of depth',
      },
    },
    {
      id: 'edge-18',
      source: 'agent-atlas',
      target: 'pref-community-first',
      type: 'learned_from',
      label: 'learned',
      metadata: {
        created: new Date('2024-02-05'),
        createdBy: 'system',
        confidence: 0.88,
        evidence: 'User values genuine relationships over metrics',
      },
    },
    {
      id: 'edge-19',
      source: 'agent-aurora',
      target: 'pref-bold-colors',
      type: 'learned_from',
      label: 'learned',
      metadata: {
        created: new Date('2024-02-08'),
        createdBy: 'system',
        confidence: 0.93,
        evidence: 'User approved vibrant Neural Midnight palette',
      },
    },
    // Cross-concept relationships
    {
      id: 'edge-20',
      source: 'concept-brand-personality',
      target: 'concept-brand-voice',
      type: 'requires',
      label: 'informs',
      metadata: {
        created: new Date('2024-01-05'),
        createdBy: 'agent-lexis',
        confidence: 0.92,
      },
    },
    {
      id: 'edge-21',
      source: 'concept-target-audience',
      target: 'concept-content-pillars',
      type: 'requires',
      label: 'shapes',
      metadata: {
        created: new Date('2024-01-04'),
        createdBy: 'agent-sage',
        confidence: 0.89,
      },
    },
    {
      id: 'edge-22',
      source: 'concept-differentiation',
      target: 'concept-brand-personality',
      type: 'requires',
      label: 'supports',
      metadata: {
        created: new Date('2024-01-06'),
        createdBy: 'agent-atlas',
        confidence: 0.87,
      },
    },
    // Preferences influencing decisions
    {
      id: 'edge-23',
      source: 'pref-bold-colors',
      target: 'decision-brand-colors',
      type: 'references',
      label: 'influenced',
      metadata: {
        created: new Date('2024-02-08'),
        createdBy: 'agent-aurora',
        confidence: 0.93,
      },
    },
    {
      id: 'edge-24',
      source: 'pref-depth-over-virality',
      target: 'decision-content-pillars',
      type: 'references',
      label: 'shaped',
      metadata: {
        created: new Date('2024-02-02'),
        createdBy: 'agent-sage',
        confidence: 0.90,
      },
    },
    {
      id: 'edge-25',
      source: 'pref-community-first',
      target: 'decision-brand-positioning',
      type: 'references',
      label: 'informed',
      metadata: {
        created: new Date('2024-02-05'),
        createdBy: 'agent-atlas',
        confidence: 0.86,
      },
    },
    // Documents cross-reference
    {
      id: 'edge-26',
      source: 'concept-brand-voice',
      target: 'doc-messaging-framework',
      type: 'within',
      label: 'detailed in',
      metadata: {
        created: new Date('2024-01-18'),
        createdBy: 'agent-lexis',
        confidence: 0.92,
      },
    },
    {
      id: 'edge-27',
      source: 'concept-target-audience',
      target: 'doc-brand-strategy',
      type: 'within',
      label: 'analyzed in',
      metadata: {
        created: new Date('2024-01-10'),
        createdBy: 'agent-atlas',
        confidence: 0.95,
      },
    },
  ],
  evolutionHistory: [
    {
      id: 'evt-1',
      timestamp: new Date('2024-01-03'),
      type: 'node_added',
      nodeId: 'concept-target-audience',
      agentId: 'agent-atlas',
      description: 'Atlas identified target audience: digitally-native professionals (28-45)',
    },
    {
      id: 'evt-2',
      timestamp: new Date('2024-01-03'),
      type: 'node_added',
      nodeId: 'concept-brand-personality',
      agentId: 'agent-aria',
      description: 'Aria defined brand personality: innovative, authentic, strategic, empowering',
    },
    {
      id: 'evt-3',
      timestamp: new Date('2024-01-04'),
      type: 'node_added',
      nodeId: 'concept-content-pillars',
      agentId: 'agent-sage',
      description: 'Sage designed 4-pillar content strategy (40/30/20/10 distribution)',
    },
    {
      id: 'evt-4',
      timestamp: new Date('2024-01-05'),
      type: 'node_added',
      nodeId: 'concept-brand-voice',
      agentId: 'agent-lexis',
      description: 'Lexis crafted brand voice: conversational yet professional',
    },
    {
      id: 'evt-5',
      timestamp: new Date('2024-01-05'),
      type: 'node_added',
      nodeId: 'concept-visual-identity',
      agentId: 'agent-aurora',
      description: 'Aurora designed Neural Midnight visual identity system',
    },
    {
      id: 'evt-6',
      timestamp: new Date('2024-01-06'),
      type: 'node_added',
      nodeId: 'concept-differentiation',
      agentId: 'agent-atlas',
      description: 'Atlas defined market differentiation: experience-driven depth vs surface-level advice',
    },
    {
      id: 'evt-7',
      timestamp: new Date('2024-01-20'),
      type: 'node_added',
      nodeId: 'decision-brand-colors',
      agentId: 'agent-aurora',
      operationId: 'op-brand-001',
      description: 'Neural Midnight color palette approved',
      userFeedback: 'User approved: Neon Lime, Electric Cyan, Warm Amber, Deep Charcoal',
    },
    {
      id: 'evt-8',
      timestamp: new Date('2024-01-22'),
      type: 'node_added',
      nodeId: 'decision-brand-positioning',
      agentId: 'agent-atlas',
      operationId: 'op-brand-002',
      description: 'Brand positioning established: experience-driven authority',
      userFeedback: 'User endorsed: battle-tested expert, depth over virality',
    },
    {
      id: 'evt-9',
      timestamp: new Date('2024-01-25'),
      type: 'node_added',
      nodeId: 'decision-content-pillars',
      agentId: 'agent-sage',
      operationId: 'op-brand-003',
      description: '4-pillar content strategy approved for brand consistency',
    },
    {
      id: 'evt-10',
      timestamp: new Date('2024-01-28'),
      type: 'node_added',
      nodeId: 'decision-tagline',
      agentId: 'agent-lexis',
      operationId: 'op-brand-004',
      description: 'Brand tagline created: "Building depth in a world of surface"',
      userFeedback: 'User approved tagline for core positioning',
    },
    {
      id: 'evt-11',
      timestamp: new Date('2024-01-30'),
      type: 'learning',
      nodeId: 'pref-brand-voice',
      agentId: 'agent-lexis',
      description: 'Lexis learned preference for authentic communication',
      userFeedback: 'User emphasized genuine, no-BS communication',
    },
    {
      id: 'evt-12',
      timestamp: new Date('2024-02-02'),
      type: 'learning',
      nodeId: 'pref-depth-over-virality',
      agentId: 'agent-sage',
      description: 'Sage learned user prioritizes depth over virality',
      userFeedback: 'User rejected viral trends in favor of substantial content',
    },
    {
      id: 'evt-13',
      timestamp: new Date('2024-02-05'),
      type: 'learning',
      nodeId: 'pref-community-first',
      agentId: 'agent-atlas',
      description: 'Atlas learned community-first approach',
      userFeedback: 'User values genuine relationships over follower metrics',
    },
    {
      id: 'evt-14',
      timestamp: new Date('2024-02-08'),
      type: 'learning',
      nodeId: 'pref-bold-colors',
      agentId: 'agent-aurora',
      description: 'Aurora learned preference for bold visual expression',
      userFeedback: 'User approved vibrant Neural Midnight color palette',
    },
  ],
  metadata: {
    totalSize: '1.2GB',
    nodeCount: 24,
    edgeCount: 27,
    lastUpdated: new Date('2024-02-08'),
    departments: ['Personal Branding', 'Strategy', 'Visual Identity', 'Content', 'Messaging'],
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
