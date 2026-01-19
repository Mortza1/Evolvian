'use client';

import { useState, useEffect } from 'react';

interface WelcomeReceptionProps {
  onComplete: () => void;
}

interface Message {
  text: string;
  displayText: string;
  isTyping: boolean;
  isComplete: boolean;
}

export default function WelcomeReception({ onComplete }: WelcomeReceptionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showContinue, setShowContinue] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Initialize AudioContext once
  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);

      // Enable audio on first user interaction
      const enableAudio = async () => {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        setAudioEnabled(true);
        // Remove listeners after first interaction
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
      };

      document.addEventListener('click', enableAudio);
      document.addEventListener('keydown', enableAudio);

      return () => {
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
        ctx.close();
      };
    } catch (error) {
      console.log('Audio not available:', error);
    }
  }, []);

  // Sound effects using Web Audio API
  const playTypeSound = async () => {
    if (!audioContext || !audioEnabled) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1200;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.03);
    } catch (error) {
      console.log('Audio playback error:', error);
    }
  };

  // No sound for complete button (as requested)

  // Auto-start animation when component mounts
  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    let intervals: NodeJS.Timeout[] = [];

    const messagesToShow = [
      "Good morning.",
      "I'm Evo, your Chief of Staff. I'll be coordinating your AI workforce and ensuring every agent learns from your feedback.",
      "Think of me as your system orchestrator—I keep everyone aligned and working toward your objectives.",
      "Ready to get started?",
    ];

    let currentMessageIndex = 0;
    let delay = 500;

    const typeNextMessage = () => {
      if (currentMessageIndex >= messagesToShow.length) {
        const continueTimeout = setTimeout(() => {
          setShowContinue(true);
          // No sound for continue button
        }, 500);
        timeouts.push(continueTimeout);
        return;
      }

      const fullText = messagesToShow[currentMessageIndex];

      // Add new message
      setMessages(prev => [...prev, {
        text: fullText,
        displayText: '',
        isTyping: true,
        isComplete: false
      }]);

      let charIndex = 0;
      const typingSpeed = 30; // ms per character

      const typeInterval = setInterval(() => {
        if (charIndex < fullText.length) {
          // Play subtle typing sound every 3 characters
          if (charIndex % 3 === 0) {
            playTypeSound();
          }

          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = {
              ...updated[lastIndex],
              displayText: fullText.substring(0, charIndex + 1)
            };
            return updated;
          });
          charIndex++;
        } else {
          clearInterval(typeInterval);

          // Mark as complete
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = {
              ...updated[lastIndex],
              isTyping: false,
              isComplete: true
            };
            return updated;
          });

          // Start next message after a pause
          currentMessageIndex++;
          const nextTimeout = setTimeout(() => typeNextMessage(), 400);
          timeouts.push(nextTimeout);
        }
      }, typingSpeed);

      intervals.push(typeInterval);
    };

    const startTimeout = setTimeout(() => typeNextMessage(), delay);
    timeouts.push(startTimeout);

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [audioContext, audioEnabled]);

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-black">
      {/* Animated background with pulsing orbs */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#6366F1] rounded-full filter blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FDE047] rounded-full filter blur-[128px] animate-pulse delay-1000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Logo with gradient */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-block mb-4 relative">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#6366F1]/40">
                <span className="text-white font-bold text-2xl">E</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Evolvian
            </h1>
            <p className="text-slate-400 text-sm">
              Your AI Workforce Awaits
            </p>
          </div>

          {/* Chat Interface */}
          <div className="relative bg-gradient-to-br from-[#0F0F23] via-[#1a1a2e] to-[#0F0F23] border border-[#6366F1]/20 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/5 via-transparent to-[#818CF8]/5 rounded-2xl pointer-events-none"></div>

            <div className="relative z-10">
              {/* Evo Header */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#6366F1]/20">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-xl flex items-center justify-center shadow-lg shadow-[#6366F1]/30">
                    <span className="text-white font-bold text-base">EVO</span>
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0F0F23]"></div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Evo</h3>
                  <p className="text-xs text-slate-400">Chief of Staff</p>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 mb-6 min-h-[200px]">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className="flex justify-start animate-slide-up"
                  >
                    <div className="bg-gradient-to-br from-[#6366F1]/10 to-[#818CF8]/10 border border-[#6366F1]/30 rounded-xl px-4 py-3 max-w-[85%] backdrop-blur-sm">
                      <p className="text-white leading-relaxed text-sm">
                        {msg.displayText}
                        {msg.isTyping && (
                          <span className="inline-block w-0.5 h-4 bg-[#6366F1] ml-1 animate-blink"></span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue Button */}
              {showContinue && (
                <div className="flex justify-center animate-fade-in">
                  <button
                    onClick={onComplete}
                    className="group px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold text-sm rounded-xl shadow-2xl shadow-[#6366F1]/40 hover:shadow-[#6366F1]/60 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    <span className="flex items-center gap-2">
                      Let's Set Up My First Team
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Subtle hint */}
          <p className="text-center text-slate-600 text-xs mt-6">
            This will take less than 60 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
