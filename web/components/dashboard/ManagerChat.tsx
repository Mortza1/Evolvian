'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '@/lib/api';

interface Message {
  id: number;
  from: 'user' | 'manager';
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

  // Load chat history when component mounts or teamId changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!teamId || teamId === 'undefined' || teamId === 'null') {
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const history = await chatAPI.getChatHistory(teamId);

        if (history.messages && history.messages.length > 0) {
          const loadedMessages: Message[] = history.messages.map((msg) => ({
            id: msg.id,
            from: msg.role === 'user' ? 'user' : 'manager',
            text: msg.content,
            timestamp: new Date(msg.created_at),
          }));
          setMessages(loadedMessages);
        } else {
          // Show welcome message if no history
          setMessages([
            {
              id: 1,
              from: 'manager',
              text: 'Hello! I\'m Evo, your AI Manager. How can I help you manage your team today?',
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err: any) {
        // Suppress "Team not found" error for new teams - this is expected
        if (!err.message?.includes('Team not found')) {
          console.error('Failed to load chat history:', err);
        }
        // Show welcome message on error (including "Team not found" for new teams)
        setMessages([
          {
            id: 1,
            from: 'manager',
            text: 'Hello! I\'m Evo, your AI Manager. How can I help you manage your team today?',
            timestamp: new Date(),
          },
        ]);
        // Clear the error so user can still use the chat
        setError(null);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [teamId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    // Validate teamId
    if (!teamId || teamId === 'undefined' || teamId === 'null') {
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
      from: 'manager',
      text: '...',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, loadingMsg]);
    setIsLoading(true);

    try {
      // Call the backend API
      const response = await chatAPI.sendManagerMessage(teamId, userMessage);

      // Remove loading message and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            from: 'manager',
            text: response.response,
            timestamp: new Date(),
          },
        ];
      });
    } catch (err: any) {
      // Remove loading message
      setMessages(prev => prev.filter(m => !m.isLoading));

      // Show error
      setError(err.message || 'Failed to get response');

      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          from: 'manager',
          text: 'Sorry, I\'m having trouble connecting right now. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">EVO</span>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#020617]"></div>
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
              <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-slate-400">Loading chat history...</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
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
            </div>
          </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed to bottom */}
      <form onSubmit={handleSend} className="flex-shrink-0 p-4 border-t border-slate-800 bg-[#020617]">
        {error && (
          <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isLoading ? "Waiting for response..." : "Ask your manager..."}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6366F1]"
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
