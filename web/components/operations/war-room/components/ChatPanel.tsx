'use client';

import { RefObject } from 'react';
import type { ExecutionMessage } from '@/lib/services/workflows/types';

const SENDER_COLOR: Record<string, string> = {
  user:    '#7BBDAE',
  agent:   '#5A9E8F',
  manager: '#BF8A52',
  system:  '#3A5056',
};

const SENDER_BG: Record<string, string> = {
  user:    '#7BBDAE14',
  agent:   '#5A9E8F12',
  manager: '#BF8A5212',
  system:  '#111A1D',
};

const SENDER_BORDER: Record<string, string> = {
  user:    '#7BBDAE30',
  agent:   '#5A9E8F28',
  manager: '#BF8A5228',
  system:  '#1E2D30',
};

const AVATAR_LABELS: Record<string, string> = { user: 'U', agent: 'A', manager: 'E', system: 'S' };

interface ChatPanelProps {
  messages: ExecutionMessage[];
  isExpanded: boolean;
  newMessage: string;
  isSending: boolean;
  isDisabled: boolean;
  chatContainerRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onMessageChange: (value: string) => void;
  onSend: () => void;
}

export function ChatPanel({
  messages, isExpanded, newMessage, isSending, isDisabled,
  chatContainerRef, onToggle, onMessageChange, onSend,
}: ChatPanelProps) {
  if (!isExpanded) {
    return (
      <div
        className="flex w-10 shrink-0 flex-col items-center border-l py-4 gap-3"
        style={{ background: '#080E11', borderColor: '#162025' }}
      >
        <button
          onClick={onToggle}
          className="relative flex h-8 w-8 items-center justify-center rounded border transition-all"
          style={{ borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
          title="Open Chat"
          onMouseEnter={(e) => { e.currentTarget.style.color = '#5A9E8F'; e.currentTarget.style.borderColor = '#5A9E8F40'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {messages.length > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold"
              style={{ background: '#5A9E8F', color: '#080E11', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {messages.length > 9 ? '9+' : messages.length}
            </span>
          )}
        </button>
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#2A3E44', writingMode: 'vertical-rl' }}
        >
          Chat
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex w-80 shrink-0 flex-col border-l"
      style={{ background: '#080E11', borderColor: '#162025' }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-5 py-3"
        style={{ borderColor: '#162025' }}
      >
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-pulse" />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Execution Chat
          </p>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2A3E44' }}>
            ({messages.length})
          </span>
        </div>
        <button
          onClick={onToggle}
          className="flex h-6 w-6 items-center justify-center rounded border transition-all"
          style={{ borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div
            className="flex h-full items-center justify-center text-center text-[12px] px-4"
            style={{ fontFamily: "'Syne', sans-serif", color: '#2A3E44' }}
          >
            No messages yet. Send a message to communicate with agents during execution.
          </div>
        ) : (
          messages.map((msg) => {
            const color = SENDER_COLOR[msg.sender_type] ?? '#3A5056';
            const bg = SENDER_BG[msg.sender_type] ?? '#111A1D';
            const border = SENDER_BORDER[msg.sender_type] ?? '#1E2D30';
            const label = AVATAR_LABELS[msg.sender_type] ?? 'S';
            return (
              <div key={msg.id} className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-[10px] font-bold"
                  style={{ background: bg, borderColor: border, color, fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '12px', color }}>
                      {msg.sender_name}
                    </span>
                    {msg.message_type !== 'chat' && (
                      <span
                        className="rounded border px-1.5 py-0.5 text-[9px] uppercase"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#2E4248', background: '#111A1D' }}
                      >
                        {msg.message_type}
                      </span>
                    )}
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2A3E44' }}>
                      {new Date(msg.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#B8B2AA', lineHeight: '1.6' }} className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-4 py-4" style={{ borderColor: '#162025' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Message to current agent…"
            disabled={isSending || isDisabled}
            className="flex-1 rounded-md border bg-[#111A1D] px-3 py-2 text-[12px] text-[#D8D4CC] placeholder-[#2A3E44] outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
          />
          <button
            onClick={onSend}
            disabled={!newMessage.trim() || isSending || isDisabled}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#5A9E8F]/40 bg-[#5A9E8F]/10 text-[#5A9E8F] transition-all hover:border-[#5A9E8F]/70 hover:bg-[#5A9E8F]/18 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isSending ? (
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
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#2A3E44' }} className="mt-2">
          Enter to send · Messages go to the current agent
        </p>
      </div>
    </div>
  );
}
