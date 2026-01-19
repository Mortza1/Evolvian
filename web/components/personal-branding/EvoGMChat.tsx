'use client';

import { useState, useEffect, useRef } from 'react';

interface EvoGMChatProps {
  teamName: string;
  onComplete: () => void;
}

interface Message {
  id: string;
  sender: 'evo' | 'user';
  content: string;
  displayText: string;
  isTyping: boolean;
  timestamp: Date;
}

// Utility to generate unique IDs
let messageCounter = 0;
const generateUniqueId = (prefix: string): string => {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}-${Math.random().toString(36).substr(2, 9)}`;
};

export default function EvoGMChat({ teamName, onComplete }: EvoGMChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    let intervals: NodeJS.Timeout[] = [];

    // Initial message from Evo
    const firstContent = `Welcome, CEO. I'm **Evo**, your General Manager. I've successfully initialized the **${teamName}** department.`;
    const firstMessage: Message = {
      id: generateUniqueId('evo-welcome'),
      sender: 'evo',
      content: firstContent,
      displayText: '',
      isTyping: true,
      timestamp: new Date(),
    };

    setMessages([firstMessage]);

    // Type first message
    let charIndex = 0;
    const typingSpeed = 30;

    const firstInterval = setInterval(() => {
      if (charIndex < firstContent.length) {
        setMessages(prev => {
          const updated = [...prev];
          updated[0] = {
            ...updated[0],
            displayText: firstContent.substring(0, charIndex + 1)
          };
          return updated;
        });
        charIndex++;
      } else {
        clearInterval(firstInterval);
        setMessages(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], isTyping: false };
          return updated;
        });

        // Second message after a delay
        const secondTimeout = setTimeout(() => {
          setIsTyping(true);
          const thirdTimeout = setTimeout(() => {
            const secondContent = `To make this operation professional, I recommend hiring a **Lead Branding Manager** to handle the specialists and coordinate your branding strategy.\n\nOr, if you want to be hands-on, we can go straight to the **Marketplace** to build your team yourself.\n\nWhat would you prefer?`;
            const secondMessage: Message = {
              id: generateUniqueId('evo-recommend'),
              sender: 'evo',
              content: secondContent,
              displayText: '',
              isTyping: true,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, secondMessage]);
            setIsTyping(false);

            // Type second message
            let charIndex2 = 0;
            const secondInterval = setInterval(() => {
              if (charIndex2 < secondContent.length) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[1] = {
                    ...updated[1],
                    displayText: secondContent.substring(0, charIndex2 + 1)
                  };
                  return updated;
                });
                charIndex2++;
              } else {
                clearInterval(secondInterval);
                setMessages(prev => {
                  const updated = [...prev];
                  updated[1] = { ...updated[1], isTyping: false };
                  return updated;
                });
                setShowOptions(true);
              }
            }, typingSpeed);
            intervals.push(secondInterval);
          }, 2000);
          timeouts.push(thirdTimeout);
        }, 1500);
        timeouts.push(secondTimeout);
      }
    }, typingSpeed);
    intervals.push(firstInterval);

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [teamName]);

  const handleChoice = (choice: 'lead' | 'marketplace') => {
    setShowOptions(false);

    const userMessage: Message = {
      id: generateUniqueId('user-choice'),
      sender: 'user',
      content: choice === 'lead' ? 'Hire a Lead Manager' : 'Go to Marketplace',
      displayText: choice === 'lead' ? 'Hire a Lead Manager' : 'Go to Marketplace',
      isTyping: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Evo's response
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        const responseContent = choice === 'lead'
          ? `Excellent choice! I've found the perfect candidate: **Aria - Senior Brand Lead**. She specializes in personal branding and has built brands for over 200 executives. Let me introduce you...`
          : `Great! Opening the Marketplace now. You'll be able to browse and hire specialists directly.`;

        const evoResponse: Message = {
          id: generateUniqueId('evo-response'),
          sender: 'evo',
          content: responseContent,
          displayText: '',
          isTyping: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, evoResponse]);
        setIsTyping(false);

        // Type response
        let charIndex = 0;
        const typingSpeed = 30;
        const responseInterval = setInterval(() => {
          if (charIndex < responseContent.length) {
            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              updated[lastIndex] = {
                ...updated[lastIndex],
                displayText: responseContent.substring(0, charIndex + 1)
              };
              return updated;
            });
            charIndex++;
          } else {
            clearInterval(responseInterval);
            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              updated[lastIndex] = { ...updated[lastIndex], isTyping: false };
              return updated;
            });

            // Complete after showing message
            setTimeout(() => {
              onComplete();
            }, 2500);
          }
        }, typingSpeed);
      }, 1500);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#020617] via-[#0F172A] to-[#020617]">
      <div className="max-w-3xl w-full">
        {/* Header - Evo Profile */}
        <div className="mb-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] p-1">
            <div className="w-full h-full rounded-full bg-[#020617] flex items-center justify-center text-4xl">
              🧠
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Evo</h2>
          <p className="text-sm text-slate-400">General Manager AI</p>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-[#10B981]/20 border border-[#10B981]/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
            <span className="text-xs text-[#10B981] font-medium">Online</span>
          </div>
        </div>

        {/* Chat Container */}
        <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
          {/* Messages */}
          <div className="h-[400px] overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white'
                      : 'bg-[#1E293B] text-slate-100'
                  } rounded-2xl px-4 py-3`}
                >
                  {/* Parse markdown-style bold */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.displayText.split('**').map((part, idx) => (
                      idx % 2 === 0 ? (
                        <span key={idx}>{part}</span>
                      ) : (
                        <strong key={idx} className="font-bold">{part}</strong>
                      )
                    ))}
                    {message.isTyping && (
                      <span className="inline-block w-0.5 h-4 bg-[#6366F1] ml-0.5 animate-blink"></span>
                    )}
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#1E293B] rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Options */}
          {showOptions && (
            <div className="p-6 border-t border-slate-700/50 bg-[#020617]/50">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleChoice('lead')}
                  className="px-6 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="text-lg mb-1">👤 Hire Lead Manager</div>
                  <div className="text-xs opacity-80">Recommended for best results</div>
                </button>

                <button
                  onClick={() => handleChoice('marketplace')}
                  className="px-6 py-4 bg-[#1E293B] border border-slate-700 text-white font-semibold rounded-xl hover:bg-[#334155] transform hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="text-lg mb-1">🏪 Go to Marketplace</div>
                  <div className="text-xs opacity-60">Build team yourself</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-6 p-4 bg-[#0F172A]/50 border border-slate-700/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#6366F1]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-[#6366F1]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-slate-400">
              <span className="font-semibold text-slate-300">Pro Tip:</span> A Lead Manager coordinates specialists, handles strategy, and asks you the right questions to build your brand efficiently.
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        .animate-blink {
          animation: blink 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
