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

      const enableAudio = async () => {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        setAudioEnabled(true);
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
        const continueTimeout = setTimeout(() => setShowContinue(true), 500);
        timeouts.push(continueTimeout);
        return;
      }

      const fullText = messagesToShow[currentMessageIndex];

      setMessages(prev => [...prev, {
        text: fullText,
        displayText: '',
        isTyping: true,
        isComplete: false
      }]);

      let charIndex = 0;
      const typingSpeed = 30;

      const typeInterval = setInterval(() => {
        if (charIndex < fullText.length) {
          if (charIndex % 3 === 0) playTypeSound();
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = { ...updated[lastIndex], displayText: fullText.substring(0, charIndex + 1) };
            return updated;
          });
          charIndex++;
        } else {
          clearInterval(typeInterval);
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = { ...updated[lastIndex], isTyping: false, isComplete: true };
            return updated;
          });
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
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: '#080E11' }}>
      {/* Phylogenetic tree SVG background — same motif as AuthPage */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.04 }}
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="#5A9E8F" strokeWidth="1" fill="none">
          <line x1="400" y1="760" x2="400" y2="560" />
          <line x1="400" y1="560" x2="240" y2="420" />
          <line x1="400" y1="560" x2="560" y2="420" />
          <line x1="240" y1="420" x2="160" y2="300" />
          <line x1="240" y1="420" x2="320" y2="300" />
          <line x1="560" y1="420" x2="480" y2="300" />
          <line x1="560" y1="420" x2="640" y2="300" />
          <line x1="160" y1="300" x2="120" y2="200" />
          <line x1="160" y1="300" x2="200" y2="200" />
          <line x1="320" y1="300" x2="280" y2="200" />
          <line x1="320" y1="300" x2="360" y2="200" />
          <line x1="480" y1="300" x2="440" y2="200" />
          <line x1="480" y1="300" x2="520" y2="200" />
          <line x1="640" y1="300" x2="600" y2="200" />
          <line x1="640" y1="300" x2="680" y2="200" />
          {[120, 200, 280, 360, 440, 520, 600, 680].map(x => (
            <circle key={x} cx={x} cy={200} r="4" fill="#5A9E8F" stroke="none" />
          ))}
          <circle cx="400" cy="760" r="5" fill="#5A9E8F" stroke="none" />
        </g>
      </svg>

      {/* Warm radial gradient — subtle depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 80%, #5A9E8F08 0%, transparent 70%)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">

          {/* Wordmark */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-sm text-[13px] font-bold"
              style={{ background: '#5A9E8F', color: '#080E11', fontFamily: "'Syne', sans-serif" }}
            >
              E
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#EAE6DF', fontSize: '18px', letterSpacing: '0.04em' }}>
              Evolvian
            </span>
          </div>

          {/* Chat card */}
          <div
            className="rounded-md border"
            style={{ background: '#111A1D', borderColor: '#1E2D30' }}
          >
            {/* Evo header */}
            <div
              className="flex items-center gap-3 px-5 py-4 border-b"
              style={{ borderColor: '#162025' }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-[11px] font-bold"
                style={{ background: '#5A9E8F', color: '#080E11', fontFamily: "'Syne', sans-serif" }}
              >
                EVO
              </div>
              <div>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#EAE6DF' }}>Evo</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056' }}>Chief of Staff</p>
              </div>
              {/* Status dot */}
              <div className="ml-auto flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#5A9E8F' }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056' }}>online</span>
              </div>
            </div>

            {/* Messages */}
            <div className="px-5 py-5 space-y-3 min-h-[200px]">
              {messages.map((msg, index) => (
                <div key={index} className="animate-evolve-in flex justify-start">
                  <div
                    className="rounded-md border px-4 py-3 max-w-[88%]"
                    style={{ background: '#0B1215', borderColor: '#1E2D30' }}
                  >
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#D8D4CC', lineHeight: '1.65' }}>
                      {msg.displayText}
                      {msg.isTyping && (
                        <span
                          className="inline-block ml-0.5 align-middle"
                          style={{ width: '1px', height: '14px', background: '#5A9E8F', animation: 'blink 0.8s step-end infinite' }}
                        />
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue button */}
            {showContinue && (
              <div
                className="px-5 pb-5 flex justify-end animate-evolve-in border-t pt-4"
                style={{ borderColor: '#162025' }}
              >
                <button
                  onClick={onComplete}
                  className="rounded border px-5 py-2 text-[12px] transition-all"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    background: '#5A9E8F12',
                    borderColor: '#5A9E8F50',
                    color: '#5A9E8F',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#5A9E8F20';
                    e.currentTarget.style.borderColor = '#5A9E8F80';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#5A9E8F12';
                    e.currentTarget.style.borderColor = '#5A9E8F50';
                  }}
                >
                  Set Up My First Team →
                </button>
              </div>
            )}
          </div>

          <p
            className="text-center mt-5"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2A3E44' }}
          >
            This will take less than 60 seconds
          </p>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
