'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '@/lib/api';
import { workflowService } from '@/lib/services/workflows/workflow.service';
import type { AgentMessageGroup } from '@/lib/services/workflows/types';

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
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageGroups, setMessageGroups] = useState<AgentMessageGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load specialist-specific execution messages (Phase 5.2)
  useEffect(() => {
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        // Load real execution messages from backend
        const result = await workflowService.getAgentMessages(parseInt(teamId, 10), specialist.name);

        if (result.success && result.messageGroups && result.messageGroups.length > 0) {
          // Store message groups for rendering
          setMessageGroups(result.messageGroups);

          // Flatten all messages for the message list
          const allMessages: Message[] = [];
          result.messageGroups.forEach((group) => {
            group.messages.forEach((msg) => {
              allMessages.push({
                id: msg.id,
                from: msg.sender_type === 'user' ? 'user' : 'specialist',
                text: msg.content,
                timestamp: new Date(msg.created_at),
                isDecisionRequest: msg.message_type === 'assumption',
                decisionContext: {
                  operation_id: group.operation_id,
                  operation_title: group.operation_title,
                  ...msg.context,
                },
              });
            });
          });

          setMessages(allMessages);
        } else {
          // No execution messages yet - show welcome message
          setMessages([
            {
              id: 1,
              from: 'specialist',
              text: `Hello! I'm ${specialist.name}, your **${specialist.role}**.\n\nI specialize in ${specialist.specialty}.\n\nI haven't been assigned to any tasks yet, but once you include me in a workflow, all my questions, outputs, and our conversations will appear here!\n\nReady when you are! 🚀`,
              timestamp: new Date(),
            },
          ]);
          setMessageGroups([]);
        }
      } catch (error) {
        console.error('Failed to load agent messages:', error);
        // Show error message
        setMessages([
          {
            id: 1,
            from: 'specialist',
            text: `Hello! I'm ${specialist.name}. I'm having trouble loading our conversation history. Please try refreshing the page.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoadingMessages(false);
      }
    };

    // Initial load
    loadMessages();

    // Refresh every 10 seconds
    const interval = setInterval(loadMessages, 10000);

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
    <div className="h-[calc(100vh-48px)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
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

      {/* Messages - Grouped by Operation (Phase 5.2) */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#020617] min-h-0">
        {messageGroups.length > 0 ? (
          // Show messages grouped by operation
          messageGroups.map((group) => (
            <div key={group.operation_id} className="space-y-4">
              {/* Operation Header */}
              <button
                onClick={() => router.push(`/dashboard/${teamId}/operations/${group.operation_id}`)}
                className="w-full flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 rounded-lg transition-all group"
              >
                <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {group.operation_title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      group.operation_status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      group.operation_status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      group.operation_status === 'waiting_for_input' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {group.operation_status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {group.messages.length} {group.messages.length === 1 ? 'message' : 'messages'}
                    </span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Messages for this operation */}
              {group.messages.map((execMsg) => {
                const msg: Message = {
                  id: execMsg.id,
                  from: execMsg.sender_type === 'user' ? 'user' : 'specialist',
                  text: execMsg.content,
                  timestamp: new Date(execMsg.created_at),
                  isDecisionRequest: execMsg.message_type === 'assumption',
                };

                return (
                  <div
                    key={execMsg.id}
                    className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-4 ${
                        msg.from === 'user'
                          ? 'bg-[#6366F1] text-white'
                          : 'glass-light text-slate-200'
                      }`}
                    >
                      <div className="text-sm prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            code: ({ children, className }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code className="bg-slate-700/50 px-1 py-0.5 rounded text-xs">{children}</code>
                              ) : (
                                <code className="block bg-slate-700/50 p-2 rounded text-xs overflow-x-auto">{children}</code>
                              );
                            },
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          // Show flat messages if no groups (welcome message or errors)
          messages.map((msg) => (
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
        ))
        )}
      </div>

      {/* Input - Fixed to bottom */}
      <form onSubmit={handleSend} className="flex-shrink-0 p-6 border-t border-slate-800 bg-slate-900/50">
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
