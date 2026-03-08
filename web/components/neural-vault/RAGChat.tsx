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
    <div
      className="flex h-full max-h-screen flex-col"
      style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}
    >
      {/* Header */}
      <div
        className="shrink-0 border-b px-4 py-3"
        style={{ borderColor: '#162025' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
            style={{ background: '#0F1E1B', borderColor: '#5A9E8F30' }}
          >
            <svg className="h-3.5 w-3.5 text-[#5A9E8F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }} className="text-[13px] text-[#D8D4CC] leading-none">
              Intelligence
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-0.5 text-[10px] text-[#2E4248]">
              {graph.metadata.totalSize} indexed
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[88%] rounded-md px-3 py-2.5 text-[12px] leading-relaxed"
                style={{
                  background: isUser ? '#182E2B' : '#111A1D',
                  border: `1px solid ${isUser ? '#5A9E8F28' : '#1E2D30'}`,
                  borderBottomRightRadius: isUser ? 2 : undefined,
                  borderBottomLeftRadius: !isUser ? 2 : undefined,
                  color: isUser ? '#D8D4CC' : '#B8B2AA',
                }}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 border-t pt-2.5" style={{ borderColor: '#1E2D30' }}>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] uppercase tracking-widest text-[#2E4248]">
                      Sources
                    </p>
                    {msg.sources.map((source, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSelectNode(source.nodeId)}
                        className="block w-full rounded border px-2.5 py-2 text-left text-[11px] transition-all"
                        style={{ background: '#0B1215', borderColor: '#1E2D30', color: '#5A9E8F' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5A9E8F30'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
                      >
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>{source.label}</p>
                        {source.evidence && (
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-0.5 italic text-[10px] text-[#3A5056]">
                            "{source.evidence}"
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div
              className="rounded-md rounded-bl-[2px] border px-3 py-2.5"
              style={{ background: '#111A1D', borderColor: '#1E2D30' }}
            >
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t px-4 py-3"
        style={{ borderColor: '#162025' }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query the graph…"
            className="flex-1 rounded-md border bg-[#111A1D] px-3 py-2 text-[12px] text-[#D8D4CC] placeholder-[#2E4248] outline-none transition-all"
            style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border transition-all disabled:cursor-not-allowed disabled:opacity-30"
            style={{ borderColor: '#5A9E8F40', background: '#5A9E8F12', color: '#5A9E8F' }}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
