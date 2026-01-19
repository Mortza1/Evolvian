'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '@/lib/api';
import ManagerMarketplaceModal from './ManagerMarketplaceModal';

interface Message {
  id: number;
  from: 'user' | 'manager';
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
          // Filter for Evo's messages only (exclude Aria's messages)
          const loadedMessages: Message[] = history.messages
            .filter((msg: any) => !msg.context?.ariaChat) // Only Evo's messages
            .map((msg: any) => ({
              id: msg.id,
              from: msg.role === 'user' ? 'user' : 'manager',
              text: msg.content,
              displayText: msg.content,
              isTyping: false,
              timestamp: new Date(msg.created_at),
            }));

          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
          } else {
            // No Evo messages, send initial message
            sendInitialMessage();
          }
        } else {
          // New team - send initial onboarding message
          sendInitialMessage();
        }
      } catch (err: any) {
        // Suppress "Team not found" error for new teams - this is expected
        if (!err.message?.includes('Team not found')) {
          console.error('Failed to load chat history:', err);
        }
        // On error (like "Team not found" for new teams), send initial message
        sendInitialMessage();
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [teamId]);

  const sendInitialMessage = async () => {
    // Use a hardcoded welcome message for Stage 1 onboarding
    const welcomeText = 'Welcome to your new Branding Department. I see we have a fresh workspace here, but no one\'s at their desks yet. To help me staff this team correctly, what is our primary objective for this department?';

    const welcomeMessage: Message = {
      id: 1,
      from: 'manager',
      text: welcomeText,
      displayText: '',
      isTyping: true,
      timestamp: new Date(),
    };

    setMessages([welcomeMessage]);

    // Type out the message
    let charIndex = 0;
    const typingSpeed = 25;

    const typeInterval = setInterval(() => {
      if (charIndex < welcomeText.length) {
        setMessages(prev => {
          const updated = [...prev];
          updated[0] = {
            ...updated[0],
            displayText: welcomeText.substring(0, charIndex + 1),
          };
          return updated;
        });
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setMessages(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], isTyping: false };
          return updated;
        });
      }
    }, typingSpeed);
  };

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
      displayText: userMessage,
      isTyping: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);

    // Add loading message
    const loadingMsg: Message = {
      id: Date.now() + 1,
      from: 'manager',
      text: '...',
      displayText: '...',
      isTyping: false,
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, loadingMsg]);
    setIsLoading(true);

    try {
      // Check if this is the first user response (only 1 message: welcome)
      const isFirstResponse = messages.length === 1;
      // Check if this is the second user response (choosing path)
      const isSecondResponse = messages.length === 3;

      let contextMessage = userMessage;

      // For first response, store objective and add context about offering the two paths
      if (isFirstResponse) {
        setUserObjective(userMessage);
        contextMessage = `User's objective: "${userMessage}"

Based on their objective, offer them two paths:

1. **Hire a Lead Manager (Recommended)**: You'll bring on a specialist like Aria (Senior Brand Lead). She will handle the specialized agents, clear assumptions with them, and manage the workflow.

2. **Direct Management (DIY)**: They hire the agents themselves from the Workforce Store and give them direct tasks.

Parse keywords from their objective (e.g., "high-end", "personal brand", "AI consulting") and acknowledge them. Then present these two options clearly and ask which path they'd like to take. Keep it concise and professional.`;
      }

      // For second response, detect if they chose Lead Manager
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
          // User chose Lead Manager path - show marketplace
          setShowManagerMarketplace(true);
          // Don't send to LLM, we'll handle this with scripted response
          setIsLoading(false);
          setMessages(prev => prev.filter(m => !m.isLoading));
          return;
        }
      }

      // Call the backend API with Evo context
      const response = await chatAPI.sendManagerMessage(teamId, contextMessage, {
        evoChat: true,
      });

      // Remove loading message and add real response with typing animation
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            from: 'manager',
            text: response.response,
            displayText: '',
            isTyping: true,
            timestamp: new Date(),
          },
        ];
      });

      // Type out the response
      const responseText = response.response;
      let charIndex = 0;
      const typingSpeed = 25;

      const typeInterval = setInterval(() => {
        if (charIndex < responseText.length) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = {
              ...updated[lastIndex],
              displayText: responseText.substring(0, charIndex + 1),
            };
            return updated;
          });
          charIndex++;
        } else {
          clearInterval(typeInterval);
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = { ...updated[lastIndex], isTyping: false };
            return updated;
          });
        }
      }, typingSpeed);
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
          displayText: 'Sorry, I\'m having trouble connecting right now. Please try again.',
          isTyping: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAriaHired = () => {
    // Close marketplace modal
    setShowManagerMarketplace(false);

    // Add Evo's handover message
    const handoverMessage: Message = {
      id: Date.now(),
      from: 'manager',
      text: "Excellent. I'm handing the floor to Aria. She's currently reviewing your objective.",
      displayText: '',
      isTyping: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, handoverMessage]);

    // Type out the handover message
    let charIndex = 0;
    const typingSpeed = 25;
    const fullText = handoverMessage.text;

    const typeInterval = setInterval(() => {
      if (charIndex < fullText.length) {
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = {
            ...updated[lastIndex],
            displayText: fullText.substring(0, charIndex + 1),
          };
          return updated;
        });
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = { ...updated[lastIndex], isTyping: false };
          return updated;
        });

        // After typing completes, trigger Aria to appear in inbox
        localStorage.setItem('userObjective', userObjective);

        // Wait a moment then call the callback to add Aria
        setTimeout(() => {
          if (onAriaHired) {
            onAriaHired();
          }
        }, 800);
      }
    }, typingSpeed);
  };

  return (
    <>
      <ManagerMarketplaceModal
        isOpen={showManagerMarketplace}
        onClose={() => setShowManagerMarketplace(false)}
        onHireAria={handleAriaHired}
        teamId={teamId}
      />
    <div className="h-full flex flex-col bg-[#020617]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-lg border border-slate-700">
              🧠
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#020617]"></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Evo</h3>
            <p className="text-xs text-slate-500">General Manager AI</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#020617]">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-[#6366F1] rounded-full animate-spin mx-auto mb-2"></div>
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
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.from === 'user'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-slate-800 text-slate-100 border border-slate-700'
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
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
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
                    {msg.displayText}
                  </ReactMarkdown>
                  {msg.isTyping && (
                    <span className="inline-block w-0.5 h-4 bg-[#6366F1] ml-0.5 animate-blink"></span>
                  )}
                </div>
              )}
              <div className="text-xs opacity-50 mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom */}
      <form onSubmit={handleSend} className="flex-shrink-0 p-4 border-t border-slate-800 bg-[#0A0A0F]">
        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isLoading ? "Evo is typing..." : "Type a message..."}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="px-4 py-2.5 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6366F1] flex items-center justify-center"
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
    </>
  );
}
