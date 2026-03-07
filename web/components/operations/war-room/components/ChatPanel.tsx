'use client';

import { RefObject } from 'react';
import type { ExecutionMessage } from '@/lib/services/workflows/types';

const SENDER_STYLES: Record<string, string> = {
  user: 'text-blue-400',
  agent: 'text-purple-400',
  manager: 'text-indigo-400',
  system: 'text-slate-400',
};

const AVATAR_STYLES: Record<string, string> = {
  user: 'bg-blue-500/20 border-blue-500/30',
  agent: 'bg-purple-500/20 border-purple-500/30',
  manager: 'bg-indigo-500/20 border-indigo-500/30',
  system: 'bg-slate-700',
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
      <div className="w-12 border-l border-slate-800 bg-[#0A0A0F] flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="relative p-2 text-slate-500 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors"
          title="Open Chat"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-[10px] text-white flex items-center justify-center">
              {messages.length > 9 ? '9+' : messages.length}
            </span>
          )}
        </button>
        <span className="text-[10px] text-slate-600 mt-2 [writing-mode:vertical-rl]">CHAT</span>
      </div>
    );
  }

  return (
    <div className="w-96 border-l border-slate-800 bg-[#0A0A0F] flex flex-col">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <h3 className="text-xs font-semibold text-slate-400">EXECUTION CHAT</h3>
          <span className="text-xs text-slate-500">({messages.length})</span>
        </div>
        <button onClick={onToggle} className="text-slate-500 hover:text-slate-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="text-center text-slate-600 text-xs py-8">
            No messages yet. Send a message to communicate with agents during execution.
          </div>
        ) : (
          messages.map((msg) => {
            const senderStyle = SENDER_STYLES[msg.sender_type] ?? 'text-slate-400';
            const avatarStyle = AVATAR_STYLES[msg.sender_type] ?? 'bg-slate-700';
            const avatarLabel = AVATAR_LABELS[msg.sender_type] ?? 'S';
            return (
              <div key={msg.id} className="flex items-start gap-2">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center ${avatarStyle}`}>
                  <span className={`text-xs ${senderStyle}`}>{avatarLabel}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${senderStyle}`}>{msg.sender_name}</span>
                    {msg.message_type !== 'chat' && (
                      <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-500 uppercase">{msg.message_type}</span>
                    )}
                    <span className="text-[10px] text-slate-600">
                      {new Date(msg.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Message to current agent..."
            disabled={isSending || isDisabled}
            className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={!newMessage.trim() || isSending || isDisabled}
            className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded text-sm transition-colors flex items-center gap-1"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5">Press Enter to send · Messages go to the current agent</p>
      </div>
    </div>
  );
}
