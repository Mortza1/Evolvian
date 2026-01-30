'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { evoService } from '@/lib/services/evo';
import { chatAPI } from '@/lib/api';

interface Message {
  id: number;
  from: 'user' | 'evo';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ManagerChatProps {
  teamId: string;
}

export default function ManagerChat({ teamId }: ManagerChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Convert teamId to number for API calls
  const teamIdNum = parseInt(teamId, 10);

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
          const loadedMessages: Message[] = history.messages.map((msg: { id: number; role: string; content: string; created_at: string }) => ({
            id: msg.id,
            from: msg.role === 'user' ? 'user' : 'evo',
            text: msg.content,
            timestamp: new Date(msg.created_at),
          }));
          setMessages(loadedMessages);
        } else {
          // Show welcome message if no history
          setMessages([
            {
              id: 1,
              from: 'evo',
              text: "Hello! I'm Evo, your AI COO. I can help you:\n\n- **Analyze tasks** and break them into steps\n- **Plan workflows** for your team\n- **Suggest agents** to hire\n- **Answer questions** about Evolvian\n\nWhat would you like to work on?",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (!errorMessage.includes('Team not found')) {
          console.error('Failed to load chat history:', err);
        }
        // Show welcome message on error
        setMessages([
          {
            id: 1,
            from: 'evo',
            text: "Hello! I'm Evo, your AI COO. How can I help you manage your team today?",
            timestamp: new Date(),
          },
        ]);
        setError(null);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [teamId, teamIdNum]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);

    // Add loading message
    const loadingMsg: Message = {
      id: Date.now() + 1,
      from: 'evo',
      text: '...',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, loadingMsg]);
    setIsLoading(true);

    try {
      // Call Evo service
      const response = await evoService.chat(teamIdNum, userMessage, {
        source: 'manager_sidebar',
      });

      // Remove loading message and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            from: 'evo',
            text: response.response,
            timestamp: new Date(),
          },
        ];
      });
    } catch (err: unknown) {
      // Remove loading message
      setMessages(prev => prev.filter(m => !m.isLoading));
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);

      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          from: 'evo',
          text: 'I apologize, but I\'m having trouble connecting right now. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick action buttons
  const quickActions = [
    { label: 'Analyze task', action: 'Help me analyze a new task' },
    { label: 'Plan workflow', action: 'Help me plan a workflow' },
    { label: 'Team status', action: 'Give me a quick team status update' },
  ];

  const handleQuickAction = (action: string) => {
    setMessage(action);
  };

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-sm">EVO</span>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0B0E14]"></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Evo</h3>
            <p className="text-xs text-slate-400">Always available</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-slate-400">Loading chat...</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3 ${
                    msg.from === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700/50'
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
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-slate-700/50 px-1 py-0.5 rounded text-xs">{children}</code>
                            ) : (
                              <code className="block bg-slate-700/50 p-2 rounded text-xs overflow-x-auto">{children}</code>
                            );
                          },
                          a: ({ children, href }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Quick Actions - Show when no conversation or after welcome */}
            {messages.length <= 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 mt-4">
                {quickActions.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => handleQuickAction(qa.action)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed to bottom */}
      <form onSubmit={handleSend} className="flex-shrink-0 p-4 border-t border-slate-800 bg-[#0B0E14]">
        {error && (
          <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isLoading ? "Thinking..." : "Ask Evo..."}
            disabled={isLoading}
            className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
