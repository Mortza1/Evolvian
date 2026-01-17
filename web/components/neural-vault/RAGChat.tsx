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
      content: `Hello! I'm your Knowledge Graph assistant. I can help you query the ${graph.metadata.departments.join(', ')} team's institutional memory.

Try asking:
• "Have we ever accepted a liability cap below $1M?"
• "What risks has Sarah Mitchell identified?"
• "Show me all GDPR-related decisions"`,
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
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#06B6D4] flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Querying Neural Vault</div>
            <div className="text-xs text-slate-400">
              {graph.metadata.departments.join(', ')} • {graph.metadata.totalSize} of structured data
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
                  <div className="w-2 h-2 bg-[#06B6D4] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#06B6D4] rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-[#06B6D4] rounded-full animate-bounce delay-200"></div>
                </div>
                <span className="text-xs text-slate-400">Searching knowledge graph...</span>
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
            placeholder="Ask anything about your company's knowledge..."
            className="w-full px-4 py-3 pr-12 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#6366F1] text-white flex items-center justify-center hover:bg-[#5558E3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

  // Example: liability cap query
  if (lowerQuery.includes('liability') && lowerQuery.includes('1m')) {
    const riskNodes = graph.nodes.filter((n) => n.type === 'risk' && n.properties.category === 'financial');
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Yes, we have accepted liability caps below $1M in **two** cases:

1. **Acme Corp**: $500,000 limitation of liability
2. **DataFlow Systems**: $750,000 limitation of liability

Both were flagged as risks by Sarah Mitchell during compliance audits.`,
      sources: [
        {
          nodeId: 'risk-indemnification',
          label: 'Indemnification Risk - Acme Corp',
          evidence: 'Clause 7.2: Liability limited to $500,000',
        },
        {
          nodeId: 'risk-liability-cap',
          label: 'Low Liability Cap - DataFlow',
          evidence: 'Liability cap of $750K below threshold',
        },
      ],
      highlightNodes: riskNodes.map((n) => n.id),
    };
  }

  // Example: Sarah Mitchell query
  if (lowerQuery.includes('sarah') || lowerQuery.includes('mitchell')) {
    const sarahRisks = graph.edges
      .filter((e) => e.source === 'agent-sarah' && e.type === 'identified')
      .map((e) => graph.nodes.find((n) => n.id === e.target))
      .filter((n) => n !== undefined);

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Sarah Mitchell (Compliance Auditor) has identified **${sarahRisks.length} risks** in the knowledge graph:

• Indemnification Risk in Acme Corp contract
• Low Liability Cap in DataFlow Systems contract

She also learned the "German Servers = Compliant" decision from CEO feedback.`,
      sources: sarahRisks.map((node) => ({
        nodeId: node!.id,
        label: node!.label,
        evidence: node!.description,
      })),
      highlightNodes: ['agent-sarah', ...sarahRisks.map((n) => n!.id)],
    };
  }

  // Example: GDPR query
  if (lowerQuery.includes('gdpr')) {
    const gdprNodes = graph.nodes.filter(
      (n) => n.label.toLowerCase().includes('gdpr') || n.description.toLowerCase().includes('gdpr')
    );

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `I found **${gdprNodes.length} GDPR-related items** in the knowledge graph:

• **GDPR Article 4**: Definitions of personal data and processing
• **German Servers Decision**: EU data hosted on German servers meets GDPR requirements

This decision was learned from CEO feedback during Operation #442.`,
      sources: gdprNodes.map((node) => ({
        nodeId: node.id,
        label: node.label,
        evidence: node.description,
      })),
      highlightNodes: gdprNodes.map((n) => n.id),
    };
  }

  // Default response
  return {
    id: Date.now().toString(),
    role: 'assistant',
    content: `I searched through the knowledge graph but couldn't find specific information about "${query}".

Try asking about:
• Specific vendors (e.g., "Acme Corp", "DataFlow")
• Risk categories (e.g., "financial risks", "liability caps")
• Policies and regulations (e.g., "GDPR")
• Agent activities (e.g., "what has Sarah identified?")`,
  };
}
