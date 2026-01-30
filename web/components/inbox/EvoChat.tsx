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

export default function EvoChat({ teamId, onAriaHired }: EvoChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManagerMarketplace, setShowManagerMarketplace] = useState(false);
  const [userObjective, setUserObjective] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Convert teamId to number for API calls
  const teamIdNum = parseInt(teamId, 10);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Type out a message with animation
  const typeMessage = useCallback((text: string, messageId: number, onComplete?: () => void) => {
    let charIndex = 0;
    const typingSpeed = 20;

    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        setMessages(prev => {
          const updated = [...prev];
          const msgIndex = updated.findIndex(m => m.id === messageId);
          if (msgIndex !== -1) {
            updated[msgIndex] = {
              ...updated[msgIndex],
              displayText: text.substring(0, charIndex + 1),
            };
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

  // Load chat history when component mounts or teamId changes
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
          // Filter for Evo's messages only (exclude Aria's messages)
          const loadedMessages: Message[] = history.messages
            .filter((msg: { context?: { ariaChat?: boolean } }) => !msg.context?.ariaChat)
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

    // Add user message
    const userMsg: Message = {
      id: Date.now(),
      from: 'user',
      text: userMessage,
      displayText: userMessage,
      isTyping: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);

    // Add loading message
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
      // Check conversation stage for onboarding flow
      const isFirstResponse = messages.length === 1;
      const isSecondResponse = messages.length === 3;

      // For first response, store objective
      if (isFirstResponse) {
        setUserObjective(userMessage);
      }

      // For second response, check if choosing Lead Manager
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

      // Build context for Evo
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

      // Call Evo service
      const response = await evoService.chat(teamIdNum, userMessage, context);

      // Remove loading message and add response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        const responseId = Date.now() + 2;
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

      // Type out the response
      setTimeout(() => {
        const responseId = Date.now() + 2;
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
      <div className="h-[calc(100vh-48px)] flex flex-col bg-slate-950">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold text-sm">EVO</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Evo</h3>
              <p className="text-xs text-slate-400">AI Chief Operating Officer</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Loading conversation...</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.from === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-md'
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  ) : (
                    <div className="text-sm prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-white">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-white">{children}</h3>,
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-slate-700/50 px-1.5 py-0.5 rounded text-xs">{children}</code>
                            ) : (
                              <code className="block bg-slate-900/50 p-2 rounded text-xs overflow-x-auto">{children}</code>
                            );
                          },
                          a: ({ children, href }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.displayText}
                      </ReactMarkdown>
                      {msg.isTyping && (
                        <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse"></span>
                      )}
                    </div>
                  )}
                  <div className={`text-xs mt-2 ${msg.from === 'user' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-900/50">
          {error && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isLoading ? "Evo is thinking..." : "Message Evo..."}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
