'use client';

import { useState, useEffect } from 'react';
import type { Agent } from '@/lib/agents';

interface OfficeRevealProps {
  agents: Agent[];
  onContinue: () => void;
}

export default function OfficeReveal({ agents, onContinue }: OfficeRevealProps) {
  const [stage, setStage] = useState<'entering' | 'briefing' | 'ready'>('entering');
  const [briefingMessages, setBriefingMessages] = useState<string[]>([]);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];

    // Stage 1: Entering office
    timeouts.push(setTimeout(() => {
      setStage('briefing');
    }, 2000));

    // Stage 2: Evo's briefing
    timeouts.push(setTimeout(() => {
      setBriefingMessages(['Welcome to your command center.']);
    }, 2500));

    timeouts.push(setTimeout(() => {
      setBriefingMessages(prev => [...prev, `Your team of ${agents.length} is reporting for duty.`]);
    }, 4000));

    timeouts.push(setTimeout(() => {
      setBriefingMessages(prev => [...prev, "They're ready to execute. Let's give them their first operation."]);
    }, 5500));

    timeouts.push(setTimeout(() => {
      setStage('ready');
    }, 7500));

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [agents.length]);

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#6366F1] rounded-full filter blur-[150px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-[#818CF8] rounded-full filter blur-[150px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl px-6">
        {/* Title Animation */}
        {stage === 'entering' && (
          <div className="text-center animate-fadeInScale">
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome to Your Office
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-[#6366F1] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#6366F1] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-[#6366F1] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}

        {/* Office View with Agents */}
        {(stage === 'briefing' || stage === 'ready') && (
          <div className="animate-fadeIn">
            {/* Agent Desks Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {agents.map((agent, index) => (
                <div
                  key={agent.id}
                  className="glass rounded-xl p-6 animate-slideInUp"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="relative mb-4">
                    <img
                      src={agent.photo_url}
                      alt={agent.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white animate-pulse"></div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-white mb-1">{agent.name}</div>
                    <div className="text-xs text-slate-400 mb-2">{agent.role}</div>
                    <div className="flex items-center justify-center gap-1">
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-semibold text-white">{agent.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  {/* Status Badge */}
                  <div className="mt-3 text-center">
                    <span className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded-full font-medium">
                      Ready
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Evo's Briefing */}
            <div className="glass rounded-2xl p-8 animate-slideInUp" style={{ animationDelay: `${agents.length * 0.15 + 0.3}s` }}>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">EVO</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-white">Evo</span>
                    <span className="text-xs text-slate-400">Chief of Staff</span>
                  </div>
                  <div className="glass-light rounded-lg p-4 space-y-2">
                    {briefingMessages.map((message, index) => (
                      <p key={index} className="text-slate-200 animate-fadeIn">
                        {message}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              {stage === 'ready' && (
                <div className="mt-6 text-center animate-fadeIn">
                  <button
                    onClick={onContinue}
                    className="px-8 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all"
                  >
                    Start First Operation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeInScale {
          animation: fadeInScale 0.8s ease-out;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out both;
        }
      `}</style>
    </div>
  );
}
