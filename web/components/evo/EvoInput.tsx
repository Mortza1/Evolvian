'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface EvoInputProps {
  onSend: (message: string) => void;
  onAnalyze?: (task: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  showAnalyzeButton?: boolean;
}

export function EvoInput({
  onSend,
  onAnalyze,
  isLoading = false,
  placeholder = 'Message Evo...',
  disabled = false,
  showAnalyzeButton = false,
}: EvoInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || isLoading || disabled) return;
    onSend(message.trim());
    setMessage('');
  };

  const handleAnalyze = () => {
    if (!message.trim() || isLoading || disabled || !onAnalyze) return;
    onAnalyze(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Evo is thinking...' : placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
        </div>

        <div className="flex gap-2">
          {/* Analyze Button (optional) */}
          {showAnalyzeButton && onAnalyze && (
            <button
              onClick={handleAnalyze}
              disabled={isLoading || disabled || !message.trim()}
              title="Analyze task"
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </button>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isLoading || disabled || !message.trim()}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Hint text */}
      <div className="mt-2 text-xs text-slate-500">
        Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Enter</kbd> to send,{' '}
        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Shift + Enter</kbd> for new line
      </div>
    </div>
  );
}

export default EvoInput;
