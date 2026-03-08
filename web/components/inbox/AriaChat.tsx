'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '@/lib/api';
import { getAgents, Agent } from '@/lib/agents';
import AgentSuggestionCards from './AgentSuggestionCards';

interface Message {
  id: number;
  from: 'user' | 'aria';
  text: string;
  displayText: string;
  isTyping: boolean;
  timestamp: Date;
  suggestedAgents?: Agent[];
}

interface AriaChatProps {
  teamId: string;
  userObjective: string;
}

const mdComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>,
  li: ({ children }: any) => <li>{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold" style={{ color: '#EAE6DF' }}>{children}</strong>,
  em: ({ children }: any) => <em className="italic opacity-80">{children}</em>,
  code: ({ children, className }: any) => {
    const isInline = !className;
    return isInline ? (
      <code style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#7BBDAE' }} className="rounded border border-[#1E2D30] bg-[#0B1215] px-1.5 py-0.5 text-[12px]">{children}</code>
    ) : (
      <code style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#7BBDAE' }} className="block overflow-x-auto rounded-md border border-[#1E2D30] bg-[#0B1215] p-3 text-[12px]">{children}</code>
    );
  },
  a: ({ children, href }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#5A9E8F' }} className="underline underline-offset-2 opacity-80 hover:opacity-100">{children}</a>
  ),
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  );
}

export default function AriaChat({ teamId, userObjective }: AriaChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseAgentSuggestions = (text: string): { cleanText: string; agents: Agent[] } => {
    const agentBlockRegex = /```agents\s*([\s\S]*?)\s*```/;
    const match = text.match(agentBlockRegex);
    if (!match) return { cleanText: text, agents: [] };
    const agentIds = match[1].split(',').map(id => id.trim()).filter(id => id.length > 0);
    const allAgents = getAgents();
    const suggestedAgents = agentIds.map(id => allAgents.find(a => a.id === id)).filter((a): a is Agent => a !== undefined);
    const cleanText = text.replace(agentBlockRegex, '').trim();
    return { cleanText, agents: suggestedAgents };
  };

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const loadChatHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const history = await chatAPI.getChatHistory(teamId);
        if (history.messages && history.messages.length > 0) {
          const loadedMessages: Message[] = history.messages
            .filter((msg: any) => msg.context?.ariaChat)
            .map((msg: any) => ({
              id: msg.id,
              from: msg.role === 'user' ? 'user' : 'aria',
              text: msg.content,
              displayText: msg.content,
              isTyping: false,
              timestamp: new Date(msg.created_at),
            }));
          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
          } else {
            await sendInitialMessage();
          }
        } else {
          await sendInitialMessage();
        }
      } catch (err: any) {
        console.error('Failed to load Aria chat history:', err);
        await sendInitialMessage();
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadChatHistory();
  }, [teamId]);

  const sendInitialMessage = async () => {
    try {
      const typingMessage: Message = {
        id: Date.now(),
        from: 'aria',
        text: '',
        displayText: '',
        isTyping: true,
        timestamp: new Date(),
      };
      setMessages([typingMessage]);

      const systemPrompt = `You are Aria Martinez, Senior Brand Lead. You've just been hired to help the user build their team.

User's objective: "${userObjective}"

YOUR ROLE (VERY IMPORTANT):
- You are a TEAM MANAGER, not a task executor
- Your ONLY job is to help build the team by suggesting the right specialist agents
- You do NOT solve tasks or do the work yourself
- All actual work happens on the Board where agents collaborate on specific tasks

Your first message should:
1. Greet them professionally
2. Acknowledge you've reviewed their objective
3. Ask 2-3 specific, targeted questions to understand what specialists they need (e.g., target audience, brand tone, existing assets)
4. Keep it conversational and not overwhelming

After getting their answers, suggest specific specialist agents they need and explain that tasks will be created on the Board.

IMPORTANT: When you suggest agents, include their IDs in a special format at the end:
\`\`\`agents
agent-031,agent-032
\`\`\`

Available branding agents:
- agent-031: Aurora (Color Oracle) - Color Psychology & Palettes
- agent-032: Atlas (Brand Strategist) - Market Positioning
- agent-033: Lexis (Naming Expert) - Linguistic Strategy
- agent-034: Sage (Content Architect) - Messaging Framework

Remember to mention that these are the most compatible agents for their needs, but they can explore the marketplace for similar agents at different price points if they prefer.`;

      const response = await chatAPI.sendManagerMessage(teamId, "Start conversation", {
        ariaChat: true,
        isInitial: true,
        systemPrompt: systemPrompt,
      });

      const { cleanText, agents } = parseAgentSuggestions(response.response);

      setMessages(prev => {
        const updated = [...prev];
        updated[0] = { ...updated[0], text: cleanText, displayText: '', isTyping: true, suggestedAgents: agents.length > 0 ? agents : undefined };
        return updated;
      });

      typeOutMessage(cleanText, 0);
    } catch (err) {
      console.error('Failed to send initial message:', err);
      const fallbackText = "Hi CEO, I'm Aria. I've reviewed your objective. To help you build the perfect team, I need to understand a few things: 1) Who is your target audience? 2) What's your desired brand tone (professional, casual, bold)? 3) Do you have any existing brand assets (logo, colors, content)?";
      const welcomeMessage: Message = { id: 1, from: 'aria', text: fallbackText, displayText: '', isTyping: true, timestamp: new Date() };
      setMessages([welcomeMessage]);
      typeOutMessage(fallbackText, 0);
    }
  };

  const typeOutMessage = (text: string, messageIndex: number) => {
    let charIndex = 0;
    const typingSpeed = 25;
    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        setMessages(prev => {
          const updated = [...prev];
          updated[messageIndex] = { ...updated[messageIndex], displayText: text.substring(0, charIndex + 1) };
          return updated;
        });
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setMessages(prev => {
          const updated = [...prev];
          updated[messageIndex] = { ...updated[messageIndex], isTyping: false };
          return updated;
        });
      }
    }, typingSpeed);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');

    const userMsg: Message = {
      id: Date.now(),
      from: 'user',
      text: userMessage,
      displayText: userMessage,
      isTyping: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const typingMsg: Message = { id: Date.now() + 1, from: 'aria', text: '', displayText: '', isTyping: true, timestamp: new Date() };
    setMessages(prev => [...prev, typingMsg]);

    try {
      const systemPrompt = `You are Aria Martinez, the Senior Brand Lead helping the user build their team.

User's objective: "${userObjective}"

YOUR ROLE (CRITICAL):
- You are a TEAM MANAGER, not a task executor
- Your ONLY job is team composition - suggesting agents, hiring, managing team structure
- You do NOT solve tasks, create strategies, or do actual work
- All work is done on the Board where tasks are assigned to specialist agents
- When user asks "what now?" or "next steps" after hiring - guide them to create tasks on the Board

Your responsibilities:
- Understand their requirements to suggest the RIGHT specialists
- Ask follow-up questions to clarify what team members they need
- Suggest 2-3 specific specialist agents when you have enough info
- Explain why each specialist is needed
- Guide users to the Board for task creation (NOT to solve tasks yourself)

Keep the conversation natural and consultative, but STAY IN YOUR ROLE as team manager.

IMPORTANT: When you suggest agents, include their IDs in a special format at the end:
\`\`\`agents
agent-031,agent-032
\`\`\`

Available branding agents:
- agent-031: Aurora (Color Oracle) - Color Psychology & Palettes
- agent-032: Atlas (Brand Strategist) - Market Positioning
- agent-033: Lexis (Naming Expert) - Linguistic Strategy
- agent-034: Sage (Content Architect) - Messaging Framework`;

      const response = await chatAPI.sendManagerMessage(teamId, userMessage, { ariaChat: true, systemPrompt: systemPrompt });
      const { cleanText, agents } = parseAgentSuggestions(response.response);

      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = { ...updated[lastIndex], text: cleanText, displayText: '', isTyping: true, suggestedAgents: agents.length > 0 ? agents : undefined };
        return updated;
      });

      const messageIndex = messages.length + 1;
      typeOutMessage(cleanText, messageIndex);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setIsLoading(false);
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = { ...updated[lastIndex], text: "Sorry, I'm having trouble connecting right now. Please try again.", displayText: "Sorry, I'm having trouble connecting right now. Please try again.", isTyping: false };
        return updated;
      });
    }
  };

  return (
    <div className="flex h-full flex-col" style={{ background: '#0B1215' }}>

      {/* Header */}
      <header
        className="flex shrink-0 items-center gap-4 border-b px-8 py-5"
        style={{ borderColor: '#162025', background: '#080E11' }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-xl"
          style={{ background: '#BF8A5214', borderColor: '#BF8A5230' }}
        >
          👩‍💼
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' }} className="text-[17px] text-[#D8D4CC] leading-none">
              Aria Martinez
            </h2>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#5A9E8F]">online</span>
          </div>
          <p className="mt-1 text-[12px] text-[#3A5056]">Senior Brand Lead · Personal Branding & Executive Positioning</p>
        </div>
      </header>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto scrollbar-hide px-8 py-8 min-h-0">
        {isLoadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map(i => (
                <span key={i} className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => {
              const isUser = msg.from === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end animate-msg-right' : 'items-end gap-3 animate-msg-left'}`}>
                  {!isUser && (
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-base self-end"
                      style={{ background: '#111A1D', borderColor: '#1E2D30' }}
                    >
                      👩‍💼
                    </div>
                  )}
                  <div className="max-w-[75%]">
                    <div
                      className={`rounded-md px-4 py-3 text-[13px] border ${isUser ? 'rounded-br-none' : 'rounded-bl-none'}`}
                      style={{
                        background: isUser ? '#182E2B' : '#111A1D',
                        borderColor: isUser ? '#5A9E8F28' : '#1E2D30',
                        color: isUser ? '#D8D4CC' : '#C8C4BC',
                      }}
                    >
                      {msg.text === '' && msg.isTyping ? (
                        <TypingDots />
                      ) : (
                        <>
                          <div className="prose prose-sm max-w-none" style={{ color: isUser ? '#D8D4CC' : '#C8C4BC' }}>
                            <ReactMarkdown components={mdComponents}>{msg.displayText}</ReactMarkdown>
                            {msg.isTyping && msg.text !== '' && (
                              <span
                                className="inline-block ml-0.5 align-middle"
                                style={{ width: '1px', height: '14px', background: '#5A9E8F', animation: 'blink 0.8s step-end infinite' }}
                              />
                            )}
                          </div>
                          {msg.from === 'aria' && msg.suggestedAgents && msg.suggestedAgents.length > 0 && !msg.isTyping && (
                            <div className="mt-3">
                              <AgentSuggestionCards
                                agents={msg.suggestedAgents}
                                teamId={teamId}
                                onAgentHired={(agent) => { console.log('Agent hired:', agent.name); }}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      className={`mt-1 text-[10px] text-[#2E4248] ${isUser ? 'text-right' : ''}`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="shrink-0 border-t px-8 py-5"
        style={{ borderColor: '#162025', background: '#080E11' }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isLoading ? 'Aria is typing…' : 'Message Aria…'}
            disabled={isLoading}
            className="flex-1 rounded-md border bg-[#111A1D] px-4 py-3 text-[13px] text-[#D8D4CC] placeholder-[#2E4248] outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-md border border-[#5A9E8F]/40 bg-[#5A9E8F]/10 text-[#5A9E8F] transition-all hover:border-[#5A9E8F]/70 hover:bg-[#5A9E8F]/18 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isLoading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
