'use client';

import { useState, useEffect } from 'react';

interface SpecialistRecruitmentProps {
  teamId: string;
  discoveryDoc: File | null;
  onComplete: () => void;
}

interface Specialist {
  id: string;
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  experience: string;
  rating: number;
  reviews: number;
  salary: number;
  creator: string;
  creatorEarnings: number;
  skills: string[];
  description: string;
  approved: boolean;
}

const SPECIALISTS: Specialist[] = [
  {
    id: 'color-oracle',
    name: 'The Color Oracle',
    role: 'RGB Psychology Expert',
    avatar: '🎨',
    specialty: 'Color theory, brand psychology, visual identity',
    experience: '6+ years',
    rating: 4.8,
    reviews: 189,
    salary: 38,
    creator: '@DesignGuru',
    creatorEarnings: 1840,
    skills: ['Color Psychology', 'Brand Identity', 'Accessibility', 'Market Trends'],
    description: 'Specializes in using color psychology to create memorable, emotionally resonant brands. Expert in ensuring accessibility while maintaining aesthetic appeal.',
    approved: false,
  },
  {
    id: 'trend-bot-2026',
    name: 'Trend-Bot 2026',
    role: 'Viral Hook Specialist',
    avatar: '📈',
    specialty: 'Viral content, engagement optimization, trend analysis',
    experience: '4+ years',
    rating: 4.9,
    reviews: 312,
    salary: 45,
    creator: '@TrendHunter',
    creatorEarnings: 3120,
    skills: ['Viral Mechanics', 'A/B Testing', 'Platform Algorithms', 'Content Timing'],
    description: 'AI agent trained on 10M+ viral posts. Predicts trends before they peak and crafts hooks that drive engagement. Updated daily with latest platform algorithms.',
    approved: false,
  },
  {
    id: 'typo-master',
    name: 'Typo-Master',
    role: 'Readability & Typography Expert',
    avatar: '✍️',
    specialty: 'Typography, readability, font pairing, hierarchy',
    experience: '7+ years',
    rating: 4.7,
    reviews: 156,
    salary: 35,
    creator: '@FontLover',
    creatorEarnings: 980,
    skills: ['Typography', 'Font Pairing', 'Reading Flow', 'Cross-platform Optimization'],
    description: 'Ensures your content is not just beautiful, but effortlessly readable. Masters font hierarchy, spacing, and visual flow for maximum comprehension.',
    approved: false,
  },
];

export default function SpecialistRecruitment({ teamId, discoveryDoc, onComplete }: SpecialistRecruitmentProps) {
  const [specialists, setSpecialists] = useState<Specialist[]>(SPECIALISTS);
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [showApproval, setShowApproval] = useState(false);
  const [isHiring, setIsHiring] = useState(false);

  useEffect(() => {
    // Show approval options after a brief delay
    setTimeout(() => {
      setShowRecommendation(false);
      setShowApproval(true);
    }, 3000);
  }, []);

  const handleApproveAll = () => {
    setShowApproval(false);
    setIsHiring(true);

    // Approve all specialists
    setSpecialists(prev => prev.map(s => ({ ...s, approved: true })));

    // Complete after hiring animation
    setTimeout(() => {
      onComplete();
    }, 4000);
  };

  const handleCustomize = () => {
    // For demo, just approve all for now
    handleApproveAll();
  };

  const totalMonthlyCost = specialists.reduce((sum, s) => sum + (s.salary * 160), 0);
  const totalHourlyCost = specialists.reduce((sum, s) => sum + s.salary, 0);

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-[#020617] via-[#0F172A] to-[#020617]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#EC4899]/20 border border-[#EC4899]/30 rounded-full mb-4">
            <div className="w-2 h-2 rounded-full bg-[#EC4899] animate-pulse"></div>
            <span className="text-sm text-[#EC4899] font-medium">Aria's Recommendation</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Elite Branding Specialists</h1>
          <p className="text-slate-400">Handpicked by Aria to build your personal brand</p>
        </div>

        {/* Recommendation Message */}
        {showRecommendation && (
          <div className="mb-8 glass rounded-xl p-6 border border-[#EC4899]/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EC4899] to-[#F472B6] flex items-center justify-center text-2xl flex-shrink-0">
                👩‍💼
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white mb-1">Aria Martinez</div>
                <div className="text-sm text-slate-300 leading-relaxed">
                  "Based on {discoveryDoc ? 'your profile' : 'our conversation'}, I've selected three specialists who will create a cohesive, elite brand. The Color Oracle will establish your visual identity, Trend-Bot will ensure your content reaches the right audience, and Typo-Master will make everything readable and professional."
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Specialists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {specialists.map((specialist, index) => (
            <div
              key={specialist.id}
              className="glass rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all"
              style={{
                animation: isHiring ? `slideUp 0.6s ease-out ${index * 0.2}s forwards` : 'none',
              }}
            >
              {/* Header */}
              <div className="text-center mb-4">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-4xl">
                  {specialist.avatar}
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{specialist.name}</h3>
                <p className="text-sm text-slate-400">{specialist.role}</p>

                {/* Rating */}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[#FDE047]">⭐️</span>
                    <span className="text-sm font-semibold text-white">{specialist.rating}</span>
                  </div>
                  <span className="text-xs text-slate-500">({specialist.reviews} reviews)</span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <p className="text-sm text-slate-300 leading-relaxed">{specialist.description}</p>
              </div>

              {/* Skills */}
              <div className="mb-4">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Key Skills</div>
                <div className="flex flex-wrap gap-2">
                  {specialist.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 bg-[#6366F1]/20 border border-[#6366F1]/30 text-[#6366F1] text-xs rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Salary */}
              <div className="p-3 bg-[#020617]/50 rounded-lg border border-slate-700/30 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Hourly Rate</span>
                  <span className="text-lg font-bold text-[#FDE047]">${specialist.salary}/hr</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Monthly (160h)</span>
                  <span className="text-sm font-semibold text-white">${(specialist.salary * 160).toLocaleString()}</span>
                </div>
              </div>

              {/* Creator Attribution */}
              <div className="pt-3 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-[10px] font-bold text-white">
                      {specialist.creator.slice(1, 3).toUpperCase()}
                    </div>
                    <span className="text-slate-400">{specialist.creator}</span>
                  </div>
                  <span className="text-[#10B981]">${specialist.creatorEarnings}/wk</span>
                </div>
              </div>

              {/* Approval Checkmark */}
              {specialist.approved && (
                <div className="mt-4 p-3 bg-[#10B981]/20 border border-[#10B981]/30 rounded-lg flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-[#10B981]">Hired!</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total Cost Summary */}
        <div className="glass rounded-xl p-6 border border-slate-700/50 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400 mb-1">Total Team Cost</div>
              <div className="text-3xl font-bold text-white">
                ${totalHourlyCost}/hr <span className="text-lg text-slate-500">• ${totalMonthlyCost.toLocaleString()}/mo</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">Team Size</div>
              <div className="text-2xl font-bold text-[#6366F1]">4 Agents</div>
              <div className="text-xs text-slate-500">(incl. Aria as Lead)</div>
            </div>
          </div>
        </div>

        {/* Approval Actions */}
        {showApproval && (
          <div className="flex gap-4">
            <button
              onClick={handleApproveAll}
              className="flex-1 px-8 py-5 bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-lg rounded-xl shadow-lg shadow-[#10B981]/30 hover:shadow-[#10B981]/50 transform hover:scale-[1.02] transition-all duration-200"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <div>Approve All Hires</div>
                  <div className="text-sm opacity-80">Start building your brand now</div>
                </div>
              </div>
            </button>

            <button
              onClick={handleCustomize}
              className="px-8 py-5 bg-[#1E293B] border-2 border-slate-700 text-white font-semibold rounded-xl hover:bg-[#334155] hover:border-slate-600 transition-all duration-200"
            >
              <div className="text-sm opacity-60 mb-1">Customize</div>
              <div>Review Individually</div>
            </button>
          </div>
        )}

        {/* Hiring Progress */}
        {isHiring && (
          <div className="glass rounded-xl p-8 border border-[#10B981]/30 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Hiring Specialists...</h3>
            <p className="text-slate-400">Processing contracts and setting up your workspace</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}
