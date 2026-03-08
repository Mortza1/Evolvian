'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { evoService } from '@/lib/services/evo';
import { chatAPI } from '@/lib/api';
import ManagerMarketplaceModal from './ManagerMarketplaceModal';

interface Message {
  id: number;
  from: 'user' | 'evo';
  text: string;
  displayText: string;
  isTyping: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

interface EvoChatProps {
  teamId: string;
  onAriaHired?: () => void;
}

// Shared markdown components styled to design system
const mdComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>,
  li: ({ children }: any) => <li>{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold" style={{ color: '#EAE6DF' }}>{children}</strong>,
  em: ({ children }: any) => <em className="italic opacity-80">{children}</em>,
  h1: ({ children }: any) => <h1 style={{ fontFamily: "'Syne', sans-serif", color: '#EAE6DF' }} className="mb-2 text-base font-bold">{children}</h1>,
  h2: ({ children }: any) => <h2 style={{ fontFamily: "'Syne', sans-serif", color: '#EAE6DF' }} className="mb-2 text-sm font-bold">{children}</h2>,
  h3: ({ children }: any) => <h3 style={{ fontFamily: "'Syne', sans-serif", color: '#EAE6DF' }} className="mb-1 text-sm font-semibold">{children}</h3>,
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

export default function EvoChat({ teamId, onAriaHired }: EvoChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManagerMarketplace, setShowManagerMarketplace] = useState(false);
  const [userObjective, setUserObjective] = useState<string>('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const teamIdNum = parseInt(teamId, 10);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const typeMessage = useCallback((text: string, messageId: number, onComplete?: () => void) => {
    let charIndex = 0;
    const typingSpeed = 20;

    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        setMessages(prev => {
          const updated = [...prev];
          const msgIndex = updated.findIndex(m => m.id === messageId);
          if (msgIndex !== -1) {
            updated[msgIndex] = { ...updated[msgIndex], displayText: text.substring(0, charIndex + 1) };
          }
          return updated;
        });
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setMessages(prev => {
          const updated = [...prev];
          const msgIndex = updated.findIndex(m => m.id === messageId);
          if (msgIndex !== -1) {
            updated[msgIndex] = { ...updated[msgIndex], isTyping: false };
          }
          return updated;
        });
        onComplete?.();
      }
    }, typingSpeed);

    return () => clearInterval(typeInterval);
  }, []);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!teamId || teamId === 'undefined' || teamId === 'null' || isNaN(teamIdNum)) {
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const history = await chatAPI.getChatHistory(teamId);

        if (history.messages && history.messages.length > 0) {
          const loadedMessages: Message[] = history.messages
            .filter((msg: { context?: { ariaChat?: boolean; agentChat?: boolean } }) =>
              !msg.context?.ariaChat && !msg.context?.agentChat
            )
            .map((msg: { id: number; role: string; content: string; created_at: string }) => ({
              id: msg.id,
              from: msg.role === 'user' ? 'user' : 'evo',
              text: msg.content,
              displayText: msg.content,
              isTyping: false,
              timestamp: new Date(msg.created_at),
            }));

          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
          } else {
            sendInitialMessage();
          }
        } else {
          sendInitialMessage();
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (!errorMessage.includes('Team not found')) {
          console.error('Failed to load chat history:', err);
        }
        sendInitialMessage();
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [teamId, teamIdNum]);

  const sendInitialMessage = () => {
    const welcomeText = 'Welcome to your new team workspace. I\'m Evo, your AI Chief Operating Officer. I\'ll help you build and manage your digital workforce.\n\nTo get started, **what is the primary objective** for this team? What do you want to accomplish?';

    const welcomeMessage: Message = {
      id: 1,
      from: 'evo',
      text: welcomeText,
      displayText: '',
      isTyping: true,
      timestamp: new Date(),
    };

    setMessages([welcomeMessage]);
    typeMessage(welcomeText, 1);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    if (!teamId || teamId === 'undefined' || teamId === 'null' || isNaN(teamIdNum)) {
      setError('No team selected. Please select a team first.');
      return;
    }

    const userMessage = message.trim();
    setMessage('');
    setError(null);

    const userMsg: Message = {
      id: Date.now(),
      from: 'user',
      text: userMessage,
      displayText: userMessage,
      isTyping: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);

    const loadingId = Date.now() + 1;
    const loadingMsg: Message = {
      id: loadingId,
      from: 'evo',
      text: '...',
      displayText: '...',
      isTyping: false,
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, loadingMsg]);
    setIsLoading(true);

    try {
      const isFirstResponse = messages.length === 1;
      const isSecondResponse = messages.length === 3;

      if (isFirstResponse) {
        setUserObjective(userMessage);
      }

      if (isSecondResponse) {
        const lowerMessage = userMessage.toLowerCase();
        const choosingLeadManager =
          lowerMessage.includes('lead') ||
          lowerMessage.includes('manager') ||
          lowerMessage.includes('aria') ||
          lowerMessage.includes('hire') ||
          lowerMessage.includes('recommended') ||
          lowerMessage.includes('1') ||
          lowerMessage.includes('first') ||
          lowerMessage.includes('specialist');

        if (choosingLeadManager) {
          setShowManagerMarketplace(true);
          setIsLoading(false);
          setMessages(prev => prev.filter(m => !m.isLoading));
          return;
        }
      }

      let context: Record<string, unknown> = { source: 'evo_onboarding' };

      if (isFirstResponse) {
        context = {
          ...context,
          isFirstResponse: true,
          instruction: `The user just shared their objective: "${userMessage}".

Based on their objective, offer them two paths:

1. **Hire a Lead Manager (Recommended)**: Bring on a specialist like Aria Martinez (Senior Brand Lead). She will handle hiring specialized agents, clear assumptions with them, and manage the workflow.

2. **Direct Management (DIY)**: They hire agents themselves from the Store and give them direct tasks.

Parse keywords from their objective and acknowledge them. Then present these two options clearly. Keep it concise.`,
        };
      }

      const response = await evoService.chat(teamIdNum, userMessage, context);

      const responseId = Date.now() + 2;
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [
          ...filtered,
          {
            id: responseId,
            from: 'evo' as const,
            text: response.response,
            displayText: '',
            isTyping: true,
            timestamp: new Date(),
          },
        ];
      });

      setTimeout(() => {
        typeMessage(response.response, responseId);
      }, 50);

    } catch (err: unknown) {
      setMessages(prev => prev.filter(m => !m.isLoading));
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          from: 'evo',
          text: 'I apologize, but I\'m having trouble connecting right now. Please try again.',
          displayText: 'I apologize, but I\'m having trouble connecting right now. Please try again.',
          isTyping: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAriaHired = () => {
    setShowManagerMarketplace(false);

    const handoverText = "Excellent choice. I'm bringing Aria Martinez onboard now. She's a Level 10 Senior Brand Lead with expertise in personal branding and executive positioning.\n\nI'm handing the floor to her. She'll review your objective and start building your team.";
    const handoverId = Date.now();

    const handoverMessage: Message = {
      id: handoverId,
      from: 'evo',
      text: handoverText,
      displayText: '',
      isTyping: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, handoverMessage]);

    typeMessage(handoverText, handoverId, () => {
      localStorage.setItem('userObjective', userObjective);
      setTimeout(() => {
        onAriaHired?.();
      }, 800);
    });
  };

  return (
    <>
      <ManagerMarketplaceModal
        isOpen={showManagerMarketplace}
        onClose={() => setShowManagerMarketplace(false)}
        onHireAria={handleAriaHired}
        teamId={teamId}
      />

      <div className="flex h-full flex-col" style={{ background: '#0B1215' }}>

        {/* Header */}
        <header
          className="flex shrink-0 items-center gap-4 border-b px-8 py-5"
          style={{ borderColor: '#162025', background: '#080E11' }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-[11px] font-bold"
            style={{ background: '#5A9E8F', color: '#080E11', fontFamily: "'Syne', sans-serif" }}
          >
            EVO
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3">
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' }} className="text-[17px] text-[#D8D4CC] leading-none">
                Evo
              </h2>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#5A9E8F]">online</span>
            </div>
            <p className="mt-1 text-[12px] text-[#3A5056]">AI Chief Operating Officer</p>
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
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold self-end"
                        style={{ background: '#5A9E8F', color: '#080E11', fontFamily: "'Syne', sans-serif" }}
                      >
                        EVO
                      </div>
                    )}
                    <div className={`max-w-[75%]`}>
                      <div
                        className={`rounded-md px-4 py-3 text-[13px] border ${isUser ? 'rounded-br-none' : 'rounded-bl-none'}`}
                        style={{
                          background: isUser ? '#182E2B' : '#111A1D',
                          borderColor: isUser ? '#5A9E8F28' : '#1E2D30',
                          color: isUser ? '#D8D4CC' : '#C8C4BC',
                        }}
                      >
                        {msg.isLoading ? (
                          <TypingDots />
                        ) : (
                          <div className="prose prose-sm max-w-none" style={{ color: isUser ? '#D8D4CC' : '#C8C4BC' }}>
                            <ReactMarkdown components={mdComponents}>{msg.displayText}</ReactMarkdown>
                            {msg.isTyping && (
                              <span
                                className="inline-block ml-0.5 align-middle"
                                style={{ width: '1px', height: '14px', background: '#5A9E8F', animation: 'blink 0.8s step-end infinite' }}
                              />
                            )}
                          </div>
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
          {error && (
            <div
              className="mb-3 flex items-center justify-between rounded-md border px-4 py-2 text-[12px]"
              style={{ background: '#9E5A5A10', borderColor: '#9E5A5A30', color: '#9E5A5A', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <span>{error}</span>
              <button onClick={() => setError(null)} style={{ color: '#9E5A5A' }}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isLoading ? 'Evo is thinking…' : 'Message Evo…'}
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
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </>
  );
}
