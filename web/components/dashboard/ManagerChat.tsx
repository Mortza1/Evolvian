'use client';

import { useState } from 'react';

export default function ManagerChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: 'manager',
      text: 'Welcome back. We have 3 tasks running. What\'s next?',
      timestamp: new Date(),
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message
    setMessages([
      ...messages,
      {
        id: messages.length + 1,
        from: 'user',
        text: message,
        timestamp: new Date(),
      },
    ]);

    // Simulate manager response (skeleton)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          from: 'manager',
          text: 'Got it! I\'ll have the team work on that right away.',
          timestamp: new Date(),
        },
      ]);
    }, 1000);

    setMessage('');
  };

  return (
    <div className="h-[calc(50vh)] border-b border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">GM</span>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#020617]"></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">General Manager</h3>
            <p className="text-xs text-slate-400">Always available</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
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
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask your manager..."
            className="flex-1 px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
