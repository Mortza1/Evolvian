'use client';

import ReactMarkdown from 'react-markdown';
import type { EvoMessage as EvoMessageType } from '@/lib/types/evo';

interface EvoMessageProps {
  message: EvoMessageType;
  isTyping?: boolean;
}

export function EvoMessage({ message, isTyping }: EvoMessageProps) {
  const isUser = message.role === 'user';
  const displayTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar for Evo */}
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">E</span>
          </div>
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-md'
        }`}
      >
        <div className="text-sm prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="text-sm">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-white">{children}</strong>
              ),
              em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
              h1: ({ children }) => (
                <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-bold mb-1 text-white">{children}</h3>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-slate-700/50 px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-slate-900/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                    {children}
                  </code>
                );
              },
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  {children}
                </a>
              ),
              hr: () => <hr className="my-3 border-slate-600" />,
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isTyping && (
            <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse" />
          )}
        </div>

        <div
          className={`text-xs mt-2 ${isUser ? 'text-indigo-200' : 'text-slate-500'}`}
        >
          {displayTime}
        </div>
      </div>
    </div>
  );
}

export default EvoMessage;
