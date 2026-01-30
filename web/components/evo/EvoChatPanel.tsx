'use client';

import { useRef, useEffect } from 'react';
import { useEvo } from '@/lib/services/evo';
import { EvoMessage } from './EvoMessage';
import { EvoInput } from './EvoInput';

interface EvoChatPanelProps {
  teamId: number;
  className?: string;
  showHeader?: boolean;
  showAnalyzeButton?: boolean;
  onError?: (error: string) => void;
}

export function EvoChatPanel({
  teamId,
  className = '',
  showHeader = true,
  showAnalyzeButton = true,
  onError,
}: EvoChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    conversation,
    isLoading,
    error,
    pendingQuestions,
    sendMessage,
    analyzeTask,
    clearError,
  } = useEvo({
    teamId,
    onError,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSend = async (message: string) => {
    await sendMessage(message);
  };

  const handleAnalyze = async (task: string) => {
    await analyzeTask(task);
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold text-sm">EVO</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Evo</h3>
              <p className="text-xs text-slate-400">AI Chief Operating Officer</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0"
      >
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-2xl">E</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Hello, I'm Evo
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              I'm your AI Chief Operating Officer. I can help you plan tasks,
              coordinate your team, and design workflows. What would you like to
              accomplish today?
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'Analyze a new task',
                'Plan a workflow',
                'Suggest team members',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {conversation.map((msg) => (
              <EvoMessage key={msg.id} message={msg} />
            ))}
          </>
        )}

        {/* Pending Questions */}
        {pendingQuestions.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-amber-500">
                Questions to answer:
              </span>
            </div>
            <ul className="space-y-2">
              {pendingQuestions.map((question, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-300 pl-4 border-l-2 border-amber-500/50"
                >
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span className="text-sm text-slate-400">Evo is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-red-400">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <EvoInput
        onSend={handleSend}
        onAnalyze={showAnalyzeButton ? handleAnalyze : undefined}
        isLoading={isLoading}
        showAnalyzeButton={showAnalyzeButton}
        placeholder="Ask Evo anything..."
      />
    </div>
  );
}

export default EvoChatPanel;
