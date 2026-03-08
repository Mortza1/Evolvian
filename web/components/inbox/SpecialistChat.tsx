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
  isNew?: boolean;
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

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 animate-msg-left">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#1E2D30] bg-[#111A1D] text-base">
        ···
      </div>
      <div className="rounded-md rounded-bl-none border border-[#1E2D30] bg-[#111A1D] px-4 py-3">
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
  );
}

// ─── Operation group header ───────────────────────────────────────────────────
function OperationHeader({ title, status, messageCount, onClick }: {
  title: string;
  status: string;
  messageCount: number;
  onClick: () => void;
}) {
  const statusColor =
    status === 'completed'          ? '#5A9E8F' :
    status === 'in_progress'        ? '#5A9E8F' :
    status === 'waiting_for_input'  ? '#BF8A52' : '#4A6A72';

  return (
    <button
      onClick={onClick}
      className="group mb-2 flex w-full items-center gap-3 rounded-md border border-[#1E2D30] bg-[#111A1D] px-4 py-3 text-left transition-all hover:border-[#5A9E8F]/30 hover:bg-[#141E22]"
    >
      <svg className="h-4 w-4 shrink-0 text-[#3A5056]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <div className="flex-1 min-w-0">
        <div
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
          className="truncate text-[13px] text-[#C8C4BC] group-hover:text-[#EAE6DF] transition-colors"
        >
          {title}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: statusColor }}
            className="text-[10px]"
          >
            {status.replace('_', ' ')}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2E4248]">
            · {messageCount} {messageCount === 1 ? 'message' : 'messages'}
          </span>
        </div>
      </div>
      <svg className="h-3.5 w-3.5 shrink-0 text-[#2E4248] transition-colors group-hover:text-[#5A9E8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, specialist, isNew }: {
  msg: Message;
  specialist: SpecialistAgent;
  isNew?: boolean;
}) {
  const isUser = msg.from === 'user';

  const markdownComponents = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: any) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
    ol: ({ children }: any) => <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>,
    li: ({ children }: any) => <li>{children}</li>,
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: any) => <em className="italic opacity-80">{children}</em>,
    h1: ({ children }: any) => <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="mb-2 text-base font-bold">{children}</h1>,
    h2: ({ children }: any) => <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="mb-2 text-sm font-bold">{children}</h2>,
    h3: ({ children }: any) => <h3 style={{ fontFamily: "'Syne', sans-serif" }} className="mb-1 text-sm font-semibold">{children}</h3>,
    code: ({ children, className }: any) => {
      const isInline = !className;
      return isInline ? (
        <code
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="rounded border border-[#1E2D30] bg-[#0B1215] px-1.5 py-0.5 text-[12px] text-[#7BBDAE]"
        >
          {children}
        </code>
      ) : (
        <code
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="block overflow-x-auto rounded-md border border-[#1E2D30] bg-[#0B1215] p-3 text-[12px] text-[#7BBDAE]"
        >
          {children}
        </code>
      );
    },
    a: ({ children, href }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#5A9E8F] underline underline-offset-2 opacity-80 hover:opacity-100">
        {children}
      </a>
    ),
  };

  if (isUser) {
    return (
      <div className={`flex justify-end ${isNew ? 'animate-msg-right' : ''}`}>
        <div className="max-w-[75%]">
          <div
            className="rounded-md rounded-br-none border px-4 py-3 text-[13px] text-[#D8D4CC]"
            style={{
              background: '#182E2B',
              borderColor: '#5A9E8F28',
            }}
          >
            {msg.isLoading ? (
              <TypingDots />
            ) : (
              <div className="prose prose-sm max-w-none" style={{ color: '#D8D4CC' }}>
                <ReactMarkdown components={markdownComponents}>{msg.text}</ReactMarkdown>
              </div>
            )}
          </div>
          <div
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="mt-1 text-right text-[10px] text-[#2E4248]"
          >
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-3 ${isNew ? 'animate-msg-left' : ''}`}>
      {/* Avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-md border text-base"
        style={{ background: '#111A1D', borderColor: '#1E2D30' }}
        title={specialist.name}
      >
        {specialist.avatar}
      </div>

      <div className="max-w-[75%]">
        <div
          className="rounded-md rounded-bl-none border px-4 py-3 text-[13px] text-[#C8C4BC]"
          style={{ background: '#111A1D', borderColor: '#1E2D30' }}
        >
          {msg.isLoading ? (
            <TypingDots />
          ) : (
            <div className="prose prose-sm max-w-none" style={{ color: '#C8C4BC' }}>
              <ReactMarkdown components={markdownComponents}>{msg.text}</ReactMarkdown>
            </div>
          )}

          {/* Decision request quick replies */}
          {msg.isDecisionRequest && (
            <div className="mt-3 border-t border-[#1E2D30] pt-3 space-y-2">
              <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#3A5056] mb-2">
                Quick reply:
              </p>
              {['Prioritize Authority', 'Prioritize Innovation'].map((reply) => (
                <button
                  key={reply}
                  className="block w-full rounded border border-[#5A9E8F]/30 bg-[#5A9E8F]/8 px-3 py-2 text-[12px] text-[#5A9E8F] text-left transition-all hover:border-[#5A9E8F]/60 hover:bg-[#5A9E8F]/14"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="mt-1 text-[10px] text-[#2E4248]"
        >
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SpecialistChat({ specialist, teamId }: SpecialistChatProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageGroups, setMessageGroups] = useState<AgentMessageGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newestId, setNewestId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Direct (non-operation) messages that must survive interval re-fetches
  const directMessagesRef = useRef<Message[]>([]);
  // Only scroll when we explicitly request it (user sent / response received)
  const shouldScrollRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Reset direct messages when switching specialist
    directMessagesRef.current = [];
    shouldScrollRef.current = false;
  }, [specialist.id]);

  useEffect(() => {
    const isFirstLoad = { value: true };

    const loadMessages = async () => {
      if (isFirstLoad.value) setLoadingMessages(true);
      try {
        const result = await workflowService.getAgentMessages(parseInt(teamId, 10), specialist.name);
        if (result.success && result.messageGroups && result.messageGroups.length > 0) {
          setMessageGroups(result.messageGroups);
          // Only update messages state if direct messages have changed
          const current = directMessagesRef.current;
          setMessages(prev => {
            if (prev.length === current.length && current.length === 0) return prev;
            return [...current];
          });
        } else {
          setMessageGroups([]);
          if (directMessagesRef.current.length === 0) {
            setMessages([{
              id: 1,
              from: 'specialist',
              text: `Hello! I'm **${specialist.name}**, your ${specialist.role}.\n\nI specialize in ${specialist.specialty}.\n\nOnce you include me in a workflow, all my questions and outputs will appear here. Ready when you are.`,
              timestamp: new Date(),
            }]);
          }
        }
      } catch {
        if (directMessagesRef.current.length === 0) {
          setMessages([{
            id: 1,
            from: 'specialist',
            text: `Hi, I'm ${specialist.name}. I'm having trouble loading our conversation history. Please try refreshing.`,
            timestamp: new Date(),
          }]);
        }
      } finally {
        if (isFirstLoad.value) {
          setLoadingMessages(false);
          isFirstLoad.value = false;
        }
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 30000); // reduced to 30s
    return () => clearInterval(interval);
  }, [specialist, teamId]);

  // Only scroll when explicitly flagged (new message sent/received)
  useEffect(() => {
    if (shouldScrollRef.current) {
      scrollToBottom();
      shouldScrollRef.current = false;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent, quickReply?: string) => {
    e.preventDefault();
    const text = quickReply || message.trim();
    if (!text || isLoading) return;
    setMessage('');

    const userMsg: Message = {
      id: Date.now(),
      from: 'user',
      text,
      timestamp: new Date(),
      isNew: true,
    };
    const loadingMsg: Message = {
      id: Date.now() + 1,
      from: 'specialist',
      text: '',
      timestamp: new Date(),
      isLoading: true,
      isNew: true,
    };

    setNewestId(userMsg.id);
    directMessagesRef.current = [...directMessagesRef.current, userMsg];
    shouldScrollRef.current = true;
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      // Build an agent-persona system prompt so the response comes from
      // this specialist's perspective, not Evo's.
      const systemPrompt = `You are ${specialist.name}, a ${specialist.role} at Evolvian.
Your specialty: ${specialist.specialty}.
Speak in first person as ${specialist.name}. Be helpful, concise, and professional.
If the user asks about your work or capabilities, answer based on your specialty.
You have memory of previous conversations through your knowledge base.`;

      const result = await chatAPI.sendManagerMessage(teamId, text, {
        systemPrompt,
        agentChat: true,
        agentName: specialist.name,
        agentRole: specialist.role,
      });

      const replyText = result?.response || 'I received your message.';
      const replyId = Date.now() + 2;
      const replyMsg: Message = {
        id: replyId,
        from: 'specialist',
        text: replyText,
        timestamp: new Date(),
        isNew: true,
      };

      directMessagesRef.current = [...directMessagesRef.current, replyMsg];
      shouldScrollRef.current = true;
      setMessages((prev) => prev.filter((m) => !m.isLoading).concat(replyMsg));
    } catch {
      setMessages((prev) =>
        prev.filter((m) => !m.isLoading).concat({
          id: Date.now() + 2,
          from: 'specialist',
          text: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          isNew: true,
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ background: '#0B1215', height: '100%', overflow: 'hidden' }}>

      {/* ── Chat header ───────────────────────────────────────────────────── */}
      <header
        className="flex shrink-0 items-center gap-4 border-b px-8 py-5"
        style={{ borderColor: '#162025', background: '#080E11' }}
      >
        {/* Avatar */}
        <div className="relative">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-md border text-2xl"
            style={{
              background: specialist.color + '14',
              borderColor: specialist.color + '28',
            }}
          >
            {specialist.avatar}
          </div>
          {specialist.isOnline && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 bg-[#5A9E8F]"
              style={{ borderColor: '#080E11' }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <h2
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' }}
              className="text-[17px] text-[#D8D4CC] leading-none"
            >
              {specialist.name}
            </h2>
            {specialist.isOnline && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#5A9E8F]">
                online
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-[#3A5056]">{specialist.role} · {specialist.specialty}</p>
        </div>

        {/* Pending badge */}
        {specialist.pendingQuestions > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-md border border-[#BF8A52]/30 bg-[#BF8A52]/8 px-3 py-1.5"
          >
            <svg className="h-3.5 w-3.5 text-[#BF8A52]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[12px] font-semibold text-[#BF8A52]">
              {specialist.pendingQuestions} pending
            </span>
          </div>
        )}
      </header>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto scrollbar-hide px-8 py-8" style={{ minHeight: 0 }}>
        {loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 max-w-3xl mx-auto">
            {/* Operation history groups */}
            {messageGroups.map((group) => (
              <div key={group.operation_id}>
                <OperationHeader
                  title={group.operation_title}
                  status={group.operation_status}
                  messageCount={group.messages.length}
                  onClick={() => router.push(`/dashboard/${teamId}/operations/${group.operation_id}`)}
                />
                <div className="space-y-4 mt-4">
                  {group.messages.map((execMsg) => (
                    <MessageBubble
                      key={execMsg.id}
                      specialist={specialist}
                      msg={{
                        id: execMsg.id,
                        from: execMsg.sender_type === 'user' ? 'user' : 'specialist',
                        text: execMsg.content,
                        timestamp: new Date(execMsg.created_at),
                        isDecisionRequest: execMsg.message_type === 'assumption',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Direct chat messages (intro or live conversation) */}
            {messages.length > 0 && (
              <div className="space-y-4">
                {messageGroups.length > 0 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px" style={{ background: '#162025' }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }}>
                      direct chat
                    </span>
                    <div className="flex-1 h-px" style={{ background: '#162025' }} />
                  </div>
                )}
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id}
                    specialist={specialist}
                    msg={msg}
                    isNew={msg.isNew || (messageGroups.length === 0 && i === 0)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="shrink-0 border-t px-8 py-5"
        style={{ borderColor: '#162025', background: '#080E11' }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isLoading ? 'Waiting for response…' : `Message ${specialist.name}…`}
              disabled={isLoading}
              className="w-full rounded-md border bg-[#111A1D] px-4 py-3 text-[13px] text-[#D8D4CC] placeholder-[#2E4248] outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                borderColor: '#1E2D30',
                fontFamily: "'Syne', sans-serif",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
            />
          </div>

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
  );
}
