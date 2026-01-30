'use client';

import { useState } from 'react';
import { KnowledgeGraph } from '@/lib/knowledge-graph';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    nodeId: string;
    label: string;
    evidence?: string;
  }>;
  highlightNodes?: string[];
}

interface RAGChatProps {
  graph: KnowledgeGraph;
  onHighlightNodes: (nodeIds: string[]) => void;
  onSelectNode: (nodeId: string) => void;
}

export default function RAGChat({ graph, onHighlightNodes, onSelectNode }: RAGChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your Personal Brand Intelligence assistant. I can help you explore your brand's knowledge graph and strategic decisions.

Try asking:
• "What are my brand colors and why were they chosen?"
• "What's my target audience profile?"
• "Show me my brand personality traits"
• "What content pillars have we defined?"
• "What makes my brand unique?"`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate RAG query (in production, this would call your backend)
    setTimeout(() => {
      const response = simulateRAGQuery(input, graph);
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);

      // Highlight related nodes
      if (response.highlightNodes) {
        onHighlightNodes(response.highlightNodes);
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Context Bar */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#A3FF12] to-[#FFB800] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#0B0E14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Brand Intelligence</div>
            <div className="text-xs text-slate-400">
              Personal Branding • {graph.metadata.totalSize} of brand knowledge
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-[#6366F1] text-white'
                  : 'glass text-slate-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="text-xs font-semibold text-slate-400 mb-2">Sources:</div>
                  {message.sources.map((source, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectNode(source.nodeId)}
                      className="block w-full text-left mb-2 p-2 bg-[#020617]/50 rounded text-xs hover:bg-[#020617]/70 transition-all"
                    >
                      <div className="font-semibold text-[#06B6D4]">{source.label}</div>
                      {source.evidence && (
                        <div className="text-slate-400 mt-1 italic">"{source.evidence}"</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="glass rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#A3FF12] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#FFB800] rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-[#A3FF12] rounded-full animate-bounce delay-200"></div>
                </div>
                <span className="text-xs text-slate-400">Analyzing your brand intelligence...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-slate-700/50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your brand strategy, colors, audience, personality..."
            className="w-full px-4 py-3 pr-12 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#A3FF12] focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#A3FF12] text-[#0B0E14] flex items-center justify-center hover:bg-[#8FE010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// Simulate RAG query (replace with actual backend call in production)
function simulateRAGQuery(query: string, graph: KnowledgeGraph): Message {
  const lowerQuery = query.toLowerCase();

  // Brand colors query
  if (lowerQuery.includes('color') || lowerQuery.includes('palette')) {
    const colorNodes = graph.nodes.filter((n) => n.type === 'decision' && n.label.toLowerCase().includes('color'));
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Your brand color palette has been strategically designed:

**Primary Colors:**
• **Neon Lime (#A3FF12)**: Represents growth, innovation, and forward-thinking energy
• **Electric Cyan (#00F5FF)**: Symbolizes clarity, trust, and digital expertise

**Supporting Colors:**
• **Warm Amber (#FFB800)**: Conveys approachability and optimism
• **Deep Charcoal (#0B0E14)**: Provides sophistication and professional grounding

Aurora (Color Oracle) recommended this palette because it balances bold, modern energy with professional credibility - perfect for standing out while maintaining authority in your space.`,
      sources: [
        {
          nodeId: 'decision-brand-colors',
          label: 'Brand Color Palette Decision',
          evidence: 'Vibrant, modern palette that stands out while maintaining professionalism',
        },
      ],
      highlightNodes: colorNodes.map((n) => n.id),
    };
  }

  // Target audience query
  if (lowerQuery.includes('audience') || lowerQuery.includes('target') || lowerQuery.includes('who')) {
    const audienceNodes = graph.nodes.filter((n) => n.type === 'concept' && n.label.toLowerCase().includes('audience'));
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Your target audience profile has been defined by Atlas (Brand Strategist):

**Primary Audience:**
• **Demographics**: 28-45 years old, digitally native professionals
• **Psychographics**: Early adopters, innovation-seekers, value authenticity
• **Pain Points**: Overwhelmed by generic advice, seeking personalized guidance
• **Aspirations**: Building authority in their field, making meaningful impact

**Secondary Audience:**
• Emerging leaders and solopreneurs (25-35)
• Seeking mentorship and strategic direction

Your brand speaks to people who are ready to level up and want a partner who gets the nuances of their journey.`,
      sources: [
        {
          nodeId: 'concept-target-audience',
          label: 'Target Audience Profile',
          evidence: 'Digitally-native professionals seeking authentic, strategic guidance',
        },
      ],
      highlightNodes: audienceNodes.map((n) => n.id),
    };
  }

  // Brand personality query
  if (lowerQuery.includes('personality') || lowerQuery.includes('traits') || lowerQuery.includes('voice')) {
    const personalityNodes = graph.nodes.filter((n) => n.type === 'preference' || (n.type === 'concept' && n.label.toLowerCase().includes('personality')));
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Your brand personality has been crafted to resonate authentically:

**Core Traits:**
• **Innovative**: Forward-thinking, embracing cutting-edge ideas
• **Authentic**: Real, transparent, no corporate fluff
• **Strategic**: Thoughtful, intentional, data-informed
• **Empowering**: Uplifting, confidence-building, action-oriented

**Brand Voice:**
• Conversational yet professional
• Direct without being harsh
• Inspiring without being preachy
• Knowledgeable without being condescending

Aria (Senior Brand Lead) emphasized that your personality should feel like a trusted advisor who's been in the trenches and genuinely cares about your success.`,
      sources: [
        {
          nodeId: 'preference-brand-voice',
          label: 'Brand Voice & Personality',
          evidence: 'Authentic, strategic, empowering - a trusted advisor approach',
        },
      ],
      highlightNodes: personalityNodes.map((n) => n.id),
    };
  }

  // Content pillars query
  if (lowerQuery.includes('content') || lowerQuery.includes('pillar') || lowerQuery.includes('topics')) {
    const contentNodes = graph.nodes.filter((n) => n.type === 'concept' && n.label.toLowerCase().includes('content'));
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Your content strategy is built on **4 core pillars** defined by Sage (Content Architect):

**1. Strategic Insights** (40%)
• Industry trends and analysis
• Framework breakdowns
• Strategic planning guidance

**2. Personal Growth** (30%)
• Mindset and leadership development
• Skill-building resources
• Career evolution stories

**3. Behind-the-Scenes** (20%)
• Your journey and lessons learned
• Process reveals and case studies
• Authentic vulnerability

**4. Community Engagement** (10%)
• Audience spotlights
• Q&A and collaborative content
• Celebrating wins together

This balance positions you as both an expert guide and a relatable human on the same journey.`,
      sources: [
        {
          nodeId: 'concept-content-pillars',
          label: 'Content Pillar Strategy',
          evidence: 'Strategic insights, personal growth, authenticity, community - balanced approach',
        },
      ],
      highlightNodes: contentNodes.map((n) => n.id),
    };
  }

  // Unique value query
  if (lowerQuery.includes('unique') || lowerQuery.includes('different') || lowerQuery.includes('stand out')) {
    const uniqueNodes = graph.nodes.filter((n) => n.type === 'decision' && n.label.toLowerCase().includes('positioning'));
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `What makes your brand unique has been crystallized by your brand team:

**Your Distinctive Edge:**
• You don't just teach theory - you've built, scaled, and sold real businesses
• You combine data-driven strategy with intuitive creativity
• You're building a movement, not just an audience
• You prioritize depth over virality, substance over trends

**Market Differentiation:**
Unlike generic "gurus" who recycle surface-level advice, you offer:
• Battle-tested frameworks from actual experience
• Nuanced takes that acknowledge complexity
• A community-first approach over transactional relationships
• Systems thinking applied to personal branding

Atlas identified this positioning as your "unfair advantage" - you're speaking from scars, not scripts.`,
      sources: [
        {
          nodeId: 'decision-brand-positioning',
          label: 'Brand Positioning & Differentiation',
          evidence: 'Experience-driven, strategic depth, community-focused approach',
        },
      ],
      highlightNodes: uniqueNodes.map((n) => n.id),
    };
  }

  // Agent/team member query
  if (lowerQuery.includes('aurora') || lowerQuery.includes('atlas') || lowerQuery.includes('lexis') || lowerQuery.includes('sage') || lowerQuery.includes('aria')) {
    const agentNodes = graph.nodes.filter((n) => n.type === 'agent');
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Your personal branding team consists of **5 specialized AI agents**:

**🎨 Aurora** (Color Oracle)
Expert in color psychology and visual identity

**🗺️ Atlas** (Brand Strategist)
Positioning, market analysis, and strategic direction

**✍️ Lexis** (Naming Expert)
Brand naming, taglines, and messaging architecture

**📚 Sage** (Content Architect)
Content strategy, pillars, and editorial planning

**👑 Aria** (Senior Brand Lead)
Overall coordination and strategic oversight

Each agent learns your preferences over time and contributes their expertise to build a cohesive, authentic personal brand.`,
      sources: agentNodes.map((node) => ({
        nodeId: node.id,
        label: node.label,
        evidence: node.description,
      })),
      highlightNodes: agentNodes.map((n) => n.id),
    };
  }

  // Default response
  return {
    id: Date.now().toString(),
    role: 'assistant',
    content: `I searched your brand knowledge graph but couldn't find specific information about "${query}".

Try asking about:
• **Brand Strategy**: "What's my unique positioning?" "Who's my target audience?"
• **Visual Identity**: "What are my brand colors?" "Why these colors?"
• **Content**: "What content pillars have we defined?" "What should I post about?"
• **Personality**: "What's my brand voice?" "How should I communicate?"
• **Team**: "Who's on my brand team?" "What does Aurora recommend?"`,
  };
}
