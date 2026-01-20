'use client';

import { useState, useEffect } from 'react';

interface BriefingBarProps {
  onSubmit?: (text: string) => void;
  placeholders?: string[];
}

const defaultPlaceholders = [
  'Launch a market research campaign...',
  'Design our Q2 brand strategy...',
  'Build a competitive analysis dashboard...',
  'Create a social media content calendar...',
  'Analyze customer feedback data...',
];

export default function BriefingBar({
  onSubmit,
  placeholders = defaultPlaceholders
}: BriefingBarProps) {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  // Cycle through placeholders
  useEffect(() => {
    if (text || isFocused) return; // Don't cycle if user is typing or focused

    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [text, isFocused, placeholders.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && onSubmit) {
      onSubmit(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative">
        {/* Breathing glow effect - only when empty and not focused */}
        {!text && !isFocused && (
          <div className="absolute inset-0 rounded-full animate-breathe-glow pointer-events-none"></div>
        )}

        {/* Input container */}
        <div
          className={`
            relative flex items-center gap-3 px-6 py-4 rounded-full
            bg-[#161B22] border-2 transition-all duration-300
            ${isFocused
              ? 'border-[#00F5FF] backdrop-blur-xl bg-[#161B22]/90 shadow-lg shadow-[#00F5FF]/20'
              : text
                ? 'border-[#2D3748]'
                : 'border-[#2D3748]/50'
            }
          `}
        >
          {/* Search/Briefing icon */}
          <svg
            className={`w-5 h-5 flex-shrink-0 transition-colors ${
              isFocused || text ? 'text-[#00F5FF]' : 'text-slate-600'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>

          {/* Input field */}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholders[currentPlaceholder]}
            className="
              flex-1 bg-transparent border-none outline-none
              text-[#E2E8F0] placeholder:text-slate-600
              text-base font-normal
            "
          />

          {/* Submit button - only visible when text exists */}
          {text && (
            <button
              type="submit"
              className="
                flex-shrink-0 p-2 rounded-full
                bg-[#00F5FF] text-[#0B0E14]
                hover:bg-[#00F5FF]/90 transition-all
                hover:scale-110
              "
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
