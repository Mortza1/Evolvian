'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '@/lib/api';

interface Message {
  id: number;
  from: 'user' | 'specialist';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
  isDecisionRequest?: boolean;
  decisionContext?: any;
}

interface SpecialistAgent {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatar: string;
  color: string;
  pendingQuestions: number;
  isOnline: boolean;
}

interface SpecialistChatProps {
  specialist: SpecialistAgent;
  teamId: string;
}

export default function SpecialistChat({ specialist, teamId }: SpecialistChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load specialist-specific conversation
  useEffect(() => {
    const loadMessages = async () => {
      try {
        // Try to load real messages from API first
        const history = await chatAPI.getChatHistory(teamId, 100);

        // Filter messages related to this specialist (from_agent matches)
        const specialistMessages = history.messages
          .filter((msg: any) => {
            // Include all user messages and assistant messages from this agent
            return msg.role === 'user' || msg.context?.from_agent === specialist.name;
          })
          .map((msg: any) => ({
            id: msg.id,
            from: msg.role === 'user' ? 'user' : 'specialist',
            text: msg.content,
            timestamp: new Date(msg.created_at),
            isDecisionRequest: msg.context?.type === 'decision_request',
            decisionContext: msg.context,
          }));

        if (specialistMessages.length > 0) {
          setMessages(specialistMessages as Message[]);
          return;
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }

      // Fallback to demo messages if no API messages
      const welcomeMessages: Record<string, Message[]> = {
      'agent-031': [ // Aurora - Color Oracle
        {
          id: 1,
          from: 'specialist',
          text: `Hello! I'm Aurora, your **Color Oracle**. I specialize in color psychology and brand palette strategy.\n\nBefore we dive into design work, I need to understand your vision. Let me ask you some expert questions to ensure we create a palette that truly represents your brand positioning.\n\n**Question 1 of 3:**\n\nLooking at the AI consulting landscape, most established firms use "Trust Blue" palettes (think IBM, Microsoft). This signals stability and enterprise credibility.\n\nFor your brand, do you want to:\n\n- **Blend In** (Safety play - Blues/Grays for corporate trust)\n- **Stand Out** (Disruptor play - Deep Purples/Neon accents for innovation)\n- **Premium Neutral** (Luxury play - Blacks/Golds for exclusivity)\n\nWhich positioning feels right for your consulting firm?`,
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
        },
      ],
      'agent-032': [ // Atlas - Brand Strategist
        {
          id: 1,
          from: 'specialist',
          text: `Hi, I'm Atlas - your **Brand Strategist**. I help position your brand in the market with surgical precision.\n\nI've reviewed your brief for "AI Consulting for high-end clients." Before we proceed, I need to clarify your target audience.\n\n**Critical Question:**\n\nWhen you say "high-end AI consulting," who is sitting across the table from you?\n\n- **CEOs/Board Members** (Focus: Business impact, ROI, competitive advantage)\n- **CTOs/Technical Leaders** (Focus: Architecture, implementation, technical depth)\n- **Product Teams** (Focus: Features, user experience, rapid iteration)\n\nThis fundamentally changes our messaging strategy. Who is your **primary** decision-maker?`,
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
        },
      ],
      'agent-033': [ // Lexis - Naming Expert
        {
          id: 1,
          from: 'specialist',
          text: `Greetings! I'm Lexis, your **Naming Expert**. I specialize in linguistic strategy and brand nomenclature.\n\nA name isn't just a label - it's a positioning statement. I need to understand your linguistic preferences before proposing options.\n\n**Naming Direction Question:**\n\nGiven your neural networks background, we have several strategic directions:\n\n### Technical/Literal:\n- **Synapse Consulting**\n- **Neural Nexus**\n- **Gradient Partners**\n\n*Pros:* Instant credibility with technical audiences\n*Cons:* May feel too "engineer-focused" for C-suite\n\n### Visionary/Abstract:\n- **Horizon AI**\n- **Apex Strategy**\n- **Meridian Group**\n\n*Pros:* Broader appeal, room to grow beyond AI\n*Cons:* Less specific differentiation\n\nWhich direction resonates with your vision?`,
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
        },
      ],
      'agent-034': [ // Sage - Content Architect
        {
          id: 1,
          from: 'specialist',
          text: `Hello! I'm Sage, your **Content Architect**. I specialize in brand messaging and content architecture.\n\nI'm currently **blocked** and waiting for foundational decisions from Aurora (Color) and Atlas (Strategy) before I can proceed with messaging frameworks.\n\n**Why I'm Waiting:**\n\nContent architecture requires:\n- Brand positioning clarity (from Atlas)\n- Visual identity direction (from Aurora)\n- Target audience definition (from Atlas)\n\nOnce they've completed their discovery questions, I'll have specific questions about tone, voice, and messaging style for you.\n\n*Standing by...*`,
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
        },
      ],
    };

      const specialistMessages = welcomeMessages[specialist.id] || [
        {
          id: 1,
          from: 'specialist',
          text: `Hello! I'm ${specialist.name}, your **${specialist.role}**.\n\nI specialize in ${specialist.specialty}. I have some questions to help us deliver perfect results. Ready when you are!`,
          timestamp: new Date(),
        },
      ];

      setMessages(specialistMessages as Message[]);
    };

    // Initial load
    loadMessages();

    // Poll for new messages every 2 seconds
    const interval = setInterval(loadMessages, 2000);

    return () => clearInterval(interval);
  }, [specialist, teamId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent, quickReply?: string) => {
    e.preventDefault();

    const userMessage = quickReply || message.trim();
    if (!userMessage || isLoading) return;

    setMessage('');

    // Add user message optimistically
    const userMsg: Message = {
      id: Date.now(),
      from: 'user',
      text: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Send message via API
      await chatAPI.sendManagerMessage(teamId, userMessage);

      // Message will appear via polling, so we don't need to manually add it
    } catch (error) {
      console.error('Failed to send message:', error);

      // Show error message
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        from: 'specialist',
        text: 'Sorry, I encountered an error sending your message. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg"
              style={{ backgroundColor: specialist.color + '30' }}
            >
              {specialist.avatar}
            </div>
            {specialist.isOnline && (
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"></div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">{specialist.name}</h2>
            <p className="text-sm font-medium" style={{ color: specialist.color }}>
              {specialist.role}
            </p>
            <p className="text-xs text-slate-400 mt-1">{specialist.specialty}</p>
          </div>

          {/* Pending Questions Badge */}
          {specialist.pendingQuestions > 0 && (
            <div className="px-3 py-1 bg-[#6366F1] text-white text-sm font-semibold rounded-full">
              {specialist.pendingQuestions} pending {specialist.pendingQuestions === 1 ? 'question' : 'questions'}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#020617]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                msg.from === 'user'
                  ? 'bg-[#6366F1] text-white'
                  : 'glass-light text-slate-200'
              }`}
            >
              {msg.isLoading ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              ) : (
                <div className="text-sm prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                      code: ({ children, className }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="bg-slate-700/50 px-1 py-0.5 rounded text-xs">{children}</code>
                        ) : (
                          <code className="block bg-slate-700/50 p-2 rounded text-xs overflow-x-auto">{children}</code>
                        );
                      },
                      a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}

              {/* Quick Reply Buttons for Decision Requests */}
              {msg.isDecisionRequest && msg.from === 'specialist' && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
                  <div className="text-xs text-slate-400 mb-1">Quick Reply:</div>
                  <button
                    onClick={async () => {
                      // Send response
                      const response = 'Prioritize Authority';
                      setMessage(response);
                      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                      await handleSend(fakeEvent, response);
                    }}
                    className="w-full px-4 py-2 bg-[#6366F1]/20 hover:bg-[#6366F1]/30 border border-[#6366F1]/50 text-[#6366F1] rounded text-sm font-medium transition-all"
                  >
                    Prioritize Authority
                  </button>
                  <button
                    onClick={async () => {
                      // Send response
                      const response = 'Prioritize Innovation';
                      setMessage(response);
                      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                      await handleSend(fakeEvent, response);
                    }}
                    className="w-full px-4 py-2 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/50 text-[#8B5CF6] rounded text-sm font-medium transition-all"
                  >
                    Prioritize Innovation
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-6 border-t border-slate-800 bg-slate-900/50">
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isLoading ? 'Waiting for response...' : `Respond to ${specialist.name}...`}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-[#1E293B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="px-6 py-3 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6366F1] flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
