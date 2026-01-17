'use client';

import { useState, useEffect } from 'react';

interface WelcomeReceptionProps {
  onComplete: () => void;
}

export default function WelcomeReception({ onComplete }: WelcomeReceptionProps) {
  const [messages, setMessages] = useState<Array<{ from: string; text: string }>>([]);
  const [showContinue, setShowContinue] = useState(false);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];

    // Simulate typing effect for Manager's greeting
    const welcomeSequence = [
      { delay: 500, text: "Good morning." },
      { delay: 1500, text: "I'm Evo, your Chief of Staff. I'll be handling the coordination of your agents and ensuring they learn from your feedback." },
      { delay: 3000, text: "To get started, should we set up your first department?" },
    ];

    welcomeSequence.forEach((msg, index) => {
      const timeout = setTimeout(() => {
        setMessages((prev) => [...prev, { from: 'manager', text: msg.text }]);

        // Show continue button after last message
        if (index === welcomeSequence.length - 1) {
          const continueTimeout = setTimeout(() => setShowContinue(true), 500);
          timeouts.push(continueTimeout);
        }
      }, msg.delay);
      timeouts.push(timeout);
    });

    // Cleanup function to prevent duplicate messages
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-6">
      {/* Background ambiance */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#6366F1] rounded-full filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#FDE047] rounded-full filter blur-[128px] opacity-10 animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* The Lobby */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-white font-bold text-3xl">E</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome to Evolvian
          </h1>
          <p className="text-slate-400 text-lg">
            Your workforce headquarters
          </p>
        </div>

        {/* Manager Chat Interface */}
        <div className="glass rounded-2xl p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700/50">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">EVO</span>
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-[#020617]"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Evo</h3>
              <p className="text-sm text-slate-400">Your Chief of Staff</p>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-6 min-h-[200px]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className="flex justify-start animate-fadeIn"
              >
                <div className="glass-light rounded-lg p-4 max-w-[85%]">
                  <p className="text-slate-200 leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Continue Button */}
          {showContinue && (
            <div className="flex justify-center animate-fadeIn">
              <button
                onClick={onComplete}
                className="px-8 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all duration-200"
              >
                Let's Set Up My First Department
              </button>
            </div>
          )}
        </div>

        {/* Subtle hint */}
        <p className="text-center text-slate-500 text-sm mt-6">
          This will take less than 60 seconds
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
