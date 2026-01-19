'use client';

import { useState, useEffect, useRef } from 'react';

interface AriaOnboardingProps {
  teamName: string;
  onHired: () => void;
  showBriefing?: boolean;
  onDiscoveryComplete?: (doc: File | null) => void;
}

interface Message {
  id: string;
  sender: 'aria' | 'user';
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

export default function AriaOnboarding({ teamName, onHired, showBriefing = false, onDiscoveryComplete }: AriaOnboardingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showHireButton, setShowHireButton] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    let intervals: NodeJS.Timeout[] = [];

    if (!showBriefing) {
      // Hiring phase
      const firstContent = `Hi! I'm **Aria**, Senior Brand Lead. I've been building elite personal brands for C-suite executives, thought leaders, and entrepreneurs for over 8 years.`;
      const firstMessage: Message = {
        id: generateUniqueId('aria-intro'),
        sender: 'aria',
        content: firstContent,
        displayText: '',
        isTyping: true,
        timestamp: new Date(),
      };

      setMessages([firstMessage]);

      // Type first message
      let charIndex = 0;
      const typingSpeed = 25;

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

          setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
              const secondContent = `I specialize in:\n\n• **Strategic Positioning** - Finding your unique voice in the market\n• **Content Architecture** - Building a cohesive narrative across platforms\n• **Visual Identity** - Creating memorable, professional aesthetics\n• **Growth Strategy** - Sustainable audience building\n\n**Salary:** $42/hour\n**Experience:** 8+ years\n**Community Rating:** ⭐️ 4.9/5 (247 reviews)\n**Creator:** @BrandMaven`;
              const secondMessage: Message = {
                id: generateUniqueId('aria-skills'),
                sender: 'aria',
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
                  setShowHireButton(true);
                }
              }, typingSpeed);
              intervals.push(secondInterval);
            }, 2500);
          }, 1500);
        }
      }, typingSpeed);
      intervals.push(firstInterval);
    } else {
      // Briefing phase
      const firstContent = `Great! I'm officially on the team. Let's get started building your brand! 🎉`;
      const firstMessage: Message = {
        id: generateUniqueId('aria-welcome'),
        sender: 'aria',
        content: firstContent,
        displayText: '',
        isTyping: true,
        timestamp: new Date(),
      };

      setMessages([firstMessage]);

      // Type first message
      let charIndex = 0;
      const typingSpeed = 25;

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

          setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
              const secondContent = `To build an **elite personal brand**, I'll need to understand your current position, goals, and unique value proposition.\n\nYou can upload a **Facts Sheet** or **Discovery Document** (like your LinkedIn profile, resume, or brand notes), or you can tell me about yourself here.\n\nWhat works best for you?`;
              const secondMessage: Message = {
                id: generateUniqueId('aria-briefing'),
                sender: 'aria',
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
                  setShowUploadOptions(true);
                }
              }, typingSpeed);
              intervals.push(secondInterval);
            }, 2500);
          }, 1500);
        }
      }, typingSpeed);
      intervals.push(firstInterval);
    }

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [showBriefing]);

  const handleHire = () => {
    setShowHireButton(false);

    const userMessage: Message = {
      id: generateUniqueId('user-hire'),
      sender: 'user',
      content: 'Hire Aria as Lead Branding Manager',
      displayText: 'Hire Aria as Lead Branding Manager',
      isTyping: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        const responseContent = `Perfect! I'm excited to work with you on ${teamName}. Processing contract... ✓\n\nI'll be in your **Inbox** shortly to start the discovery process!`;
        const ariaResponse: Message = {
          id: generateUniqueId('aria-hired'),
          sender: 'aria',
          content: responseContent,
          displayText: '',
          isTyping: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, ariaResponse]);
        setIsTyping(false);

        // Type response
        let charIndex = 0;
        const typingSpeed = 25;
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

            setTimeout(() => {
              onHired();
            }, 2000);
          }
        }, typingSpeed);
      }, 1500);
    }, 800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setShowUploadOptions(false);

      const userMessage: Message = {
        id: generateUniqueId('user-upload'),
        sender: 'user',
        content: `📎 Uploaded: ${file.name}`,
        displayText: `📎 Uploaded: ${file.name}`,
        isTyping: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          const responseContent = `Excellent! I've reviewed your document. I can see you have a strong foundation.\n\nBased on your profile, I recommend hiring **three key specialists** to build an elite brand:\n\n1. **The Color Oracle** - RGB Psychology Expert\n2. **Trend-Bot 2026** - Viral Hook Specialist\n3. **Typo-Master** - Readability & Typography Expert\n\nLet me show you their profiles and get your approval...`;
          const ariaResponse: Message = {
            id: generateUniqueId('aria-analysis'),
            sender: 'aria',
            content: responseContent,
            displayText: '',
            isTyping: true,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, ariaResponse]);
          setIsTyping(false);

          // Type response
          let charIndex = 0;
          const typingSpeed = 25;
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

              setTimeout(() => {
                onDiscoveryComplete?.(file);
              }, 3000);
            }
          }, typingSpeed);
        }, 2500);
      }, 1000);
    }
  };

  const handleTellMe = () => {
    setShowUploadOptions(false);

    const userMessage: Message = {
      id: generateUniqueId('user-tell'),
      sender: 'user',
      content: 'Let me tell you about myself',
      displayText: 'Let me tell you about myself',
      isTyping: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        const responseContent = `Perfect! For now, let's proceed with the standard brand-building approach.\n\nI recommend hiring **three key specialists**:\n\n1. **The Color Oracle** - RGB Psychology Expert\n2. **Trend-Bot 2026** - Viral Hook Specialist\n3. **Typo-Master** - Readability & Typography Expert\n\nLet me introduce you to them...`;
        const ariaResponse: Message = {
          id: generateUniqueId('aria-standard'),
          sender: 'aria',
          content: responseContent,
          displayText: '',
          isTyping: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, ariaResponse]);
        setIsTyping(false);

        // Type response
        let charIndex = 0;
        const typingSpeed = 25;
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

            setTimeout(() => {
              onDiscoveryComplete?.(null);
            }, 3000);
          }
        }, typingSpeed);
      }, 2000);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#020617] via-[#0F172A] to-[#020617]">
      <div className="max-w-3xl w-full">
        {/* Header - Aria Profile */}
        <div className="mb-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#EC4899] to-[#F472B6] p-1">
            <div className="w-full h-full rounded-full bg-[#020617] flex items-center justify-center text-4xl">
              👩‍💼
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Aria Martinez</h2>
          <p className="text-sm text-slate-400">Senior Brand Lead</p>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-[#10B981]/20 border border-[#10B981]/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
            <span className="text-xs text-[#10B981] font-medium">Available</span>
          </div>
        </div>

        {/* Chat Container */}
        <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
          {/* Messages */}
          <div className="h-[450px] overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white'
                      : 'bg-[#1E293B] text-slate-100'
                  } rounded-2xl px-4 py-3`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.displayText.split('**').map((part, idx) => (
                      idx % 2 === 0 ? (
                        <span key={idx}>{part}</span>
                      ) : (
                        <strong key={idx} className="font-bold text-[#FDE047]">{part}</strong>
                      )
                    ))}
                    {message.isTyping && (
                      <span className="inline-block w-0.5 h-4 bg-[#EC4899] ml-0.5 animate-blink"></span>
                    )}
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

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

          {/* Actions */}
          <div className="p-6 border-t border-slate-700/50 bg-[#020617]/50">
            {showHireButton && (
              <button
                onClick={handleHire}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white font-semibold rounded-xl shadow-lg shadow-[#EC4899]/30 hover:shadow-[#EC4899]/50 transform hover:scale-[1.02] transition-all duration-200"
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="text-lg">💼</span>
                  <div className="text-left">
                    <div className="font-bold">Hire Aria - $42/hour</div>
                    <div className="text-xs opacity-80">Add to {teamName}</div>
                  </div>
                </div>
              </button>
            )}

            {showUploadOptions && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="text-lg mb-1">📎 Upload Document</div>
                  <div className="text-xs opacity-80">PDF, DOCX, or TXT</div>
                </button>

                <button
                  onClick={handleTellMe}
                  className="px-6 py-4 bg-[#1E293B] border border-slate-700 text-white font-semibold rounded-xl hover:bg-[#334155] transform hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="text-lg mb-1">💬 Tell You</div>
                  <div className="text-xs opacity-60">Chat about it</div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.doc"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* Creator Attribution */}
        {!showBriefing && (
          <div className="mt-6 p-4 bg-[#0F172A]/50 border border-slate-700/30 rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-xs font-bold text-white">
                  BM
                </div>
                <div>
                  <div className="font-medium text-slate-300">Created by @BrandMaven</div>
                  <div className="text-xs text-slate-500">Community-made agent • Earns 15% commission</div>
                </div>
              </div>
              <div className="text-slate-400">
                <span className="text-[#FDE047] font-semibold">$2,450</span> earned this week
              </div>
            </div>
          </div>
        )}
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
