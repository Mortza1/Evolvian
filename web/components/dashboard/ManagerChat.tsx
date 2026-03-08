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
  isNew?: boolean;
}

interface ManagerChatProps {
  teamId: string;
}

// ─── Markdown components ──────────────────────────────────────────────────────
const md = {
  p:      ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul:     ({ children }: any) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
  ol:     ({ children }: any) => <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>,
  li:     ({ children }: any) => <li>{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-[#EAE6DF]">{children}</strong>,
  em:     ({ children }: any) => <em className="italic opacity-75">{children}</em>,
  h1:     ({ children }: any) => <h1 style={{ fontFamily: "'Syne',sans-serif" }} className="mb-2 text-[14px] font-bold">{children}</h1>,
  h2:     ({ children }: any) => <h2 style={{ fontFamily: "'Syne',sans-serif" }} className="mb-1.5 text-[13px] font-bold">{children}</h2>,
  h3:     ({ children }: any) => <h3 style={{ fontFamily: "'Syne',sans-serif" }} className="mb-1 text-[12px] font-semibold">{children}</h3>,
  code:   ({ children, className }: any) => {
    const isInline = !className;
    return isInline ? (
      <code style={{ fontFamily: "'IBM Plex Mono',monospace" }} className="rounded border border-[#1E2D30] bg-[#0B1215] px-1 py-0.5 text-[11px] text-[#7BBDAE]">
        {children}
      </code>
    ) : (
      <code style={{ fontFamily: "'IBM Plex Mono',monospace" }} className="block overflow-x-auto rounded border border-[#1E2D30] bg-[#0B1215] p-2.5 text-[11px] text-[#7BBDAE]">
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

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.from === 'user';

  if (isUser) {
    return (
      <div className={`flex justify-end ${msg.isNew ? 'animate-msg-right' : ''}`}>
        <div
          className="max-w-[85%] rounded-md rounded-br-none border px-3.5 py-2.5 text-[13px] text-[#D8D4CC]"
          style={{ background: '#182E2B', borderColor: '#5A9E8F28' }}
        >
          <div className="prose prose-sm max-w-none" style={{ color: '#D8D4CC' }}>
            <ReactMarkdown components={md}>{msg.text}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-start ${msg.isNew ? 'animate-msg-left' : ''}`}>
      <div
        className="max-w-[85%] rounded-md rounded-bl-none border px-3.5 py-2.5 text-[13px] text-[#B8B2AA]"
        style={{ background: '#111A1D', borderColor: '#1E2D30' }}
      >
        {msg.isLoading ? (
          <TypingDots />
        ) : (
          <div className="prose prose-sm max-w-none" style={{ color: '#B8B2AA' }}>
            <ReactMarkdown components={md}>{msg.text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ManagerChat({ teamId }: ManagerChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const teamIdNum = parseInt(teamId, 10);

  useEffect(() => {
    const load = async () => {
      if (!teamId || isNaN(teamIdNum)) { setIsLoadingHistory(false); return; }
      setIsLoadingHistory(true);
      try {
        const history = await chatAPI.getChatHistory(teamId);
        if (history.messages?.length > 0) {
          setMessages(history.messages.map((m: any) => ({
            id: m.id,
            from: m.role === 'user' ? 'user' : 'evo',
            text: m.content,
            timestamp: new Date(m.created_at),
          })));
        } else {
          setMessages([{
            id: 1,
            from: 'evo',
            text: "Hello — I'm **Evo**, your AI COO.\n\nI can help you:\n- **Analyze tasks** and break them into steps\n- **Plan workflows** for your team\n- **Suggest agents** to hire\n- **Answer questions** about Evolvian\n\nWhat would you like to work on?",
            timestamp: new Date(),
          }]);
        }
      } catch (err: any) {
        if (!err?.message?.includes('Team not found')) console.error(err);
        setMessages([{
          id: 1,
          from: 'evo',
          text: "Hello — I'm Evo, your AI COO. How can I help you manage your team today?",
          timestamp: new Date(),
        }]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    load();
  }, [teamId, teamIdNum]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent, preset?: string) => {
    e.preventDefault();
    const text = preset || message.trim();
    if (!text || isLoading) return;
    if (!teamId || isNaN(teamIdNum)) { setError('No team selected.'); return; }

    setMessage('');
    setError(null);

    const userMsg: Message = { id: Date.now(), from: 'user', text, timestamp: new Date(), isNew: true };
    const loadingMsg: Message = { id: Date.now() + 1, from: 'evo', text: '', timestamp: new Date(), isLoading: true, isNew: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      const resp = await evoService.chat(teamIdNum, text, { source: 'manager_sidebar' });
      setMessages(prev => [
        ...prev.filter(m => !m.isLoading),
        { id: Date.now() + 2, from: 'evo', text: resp.response, timestamp: new Date(), isNew: true },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev.filter(m => !m.isLoading),
        { id: Date.now() + 2, from: 'evo', text: "I'm having trouble connecting right now. Please try again.", timestamp: new Date(), isNew: true },
      ]);
      setError(err?.message || 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Analyze task',   action: 'Help me analyze a new task' },
    { label: 'Plan workflow',  action: 'Help me plan a workflow' },
    { label: 'Team status',    action: 'Give me a quick team status update' },
  ];

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-4"
        style={{ borderColor: '#162025' }}
      >
        {/* Evo mark — echoes the sidebar E logo */}
        <div
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#5A9E8F]/40 bg-[#0F1E1B]"
        >
          <span
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', letterSpacing: '-0.04em' }}
            className="text-[#5A9E8F] leading-none"
          >
            E
          </span>
          {/* Online dot */}
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#080E11] bg-[#5A9E8F]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
              className="text-[14px] text-[#D8D4CC] leading-none"
            >
              Evo
            </h3>
            <span
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              className="text-[10px] text-[#5A9E8F]"
            >
              online
            </span>
          </div>
          <p
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="mt-0.5 text-[10px] text-[#2E4248]"
          >
            AI COO · Always available
          </p>
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-4 py-5 min-h-0"
      >
        {isLoadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <Bubble key={msg.id} msg={msg} />
            ))}

            {/* Quick actions — only on first message */}
            {messages.length <= 1 && !isLoading && (
              <div className="mt-3 flex flex-col gap-1.5">
                {quickActions.map(qa => (
                  <button
                    key={qa.label}
                    onClick={() => handleSend({ preventDefault: () => {} } as any, qa.action)}
                    className="w-full rounded border border-[#1E2D30] bg-[#0F1719] px-3 py-2 text-left text-[11px] text-[#3A5056] transition-all hover:border-[#5A9E8F]/30 hover:bg-[#0F1E1B] hover:text-[#5A9E8F]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {qa.label} →
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="shrink-0 border-t px-4 py-4"
        style={{ borderColor: '#162025' }}
      >
        {/* Error */}
        {error && (
          <div className="mb-2 flex items-center justify-between rounded border border-[#9E5A5A]/30 bg-[#9E5A5A]/8 px-3 py-2">
            <span className="text-[11px] text-[#9E5A5A]">{error}</span>
            <button type="button" onClick={() => setError(null)} className="ml-2 text-[#9E5A5A]/60 hover:text-[#9E5A5A]">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={isLoading ? 'Thinking…' : 'Ask Evo…'}
            disabled={isLoading}
            className="flex-1 rounded-md border bg-[#111A1D] px-3 py-2.5 text-[12px] text-[#D8D4CC] placeholder-[#2E4248] outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: '#1E2D30',
              fontFamily: "'Syne', sans-serif",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#1E2D30'; }}
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md border border-[#5A9E8F]/40 bg-[#5A9E8F]/10 text-[#5A9E8F] transition-all hover:border-[#5A9E8F]/70 hover:bg-[#5A9E8F]/18 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isLoading ? (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
