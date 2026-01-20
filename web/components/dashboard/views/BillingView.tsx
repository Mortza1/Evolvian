'use client';

import { useState, useEffect } from 'react';

interface BillingViewProps {
  totalSpend: number;
  thisMonthSpend: number;
}

export default function BillingView({ totalSpend, thisMonthSpend }: BillingViewProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: '👥',
      title: 'Unlimited AI Employees',
      description: 'Hire as many specialized AI agents as you need. From developers to designers, marketers to analysts.',
      gradient: 'from-[#6366F1] to-[#8B5CF6]',
    },
    {
      icon: '🛠️',
      title: 'Access to Any Tool',
      description: 'Every agent comes with professional-grade tools. Web search, data analysis, code execution, and more.',
      gradient: 'from-[#8B5CF6] to-[#EC4899]',
    },
    {
      icon: '🧠',
      title: 'Neural Vault & Knowledge Graph',
      description: 'All your files, documents, and team knowledge organized and accessible through an intelligent graph.',
      gradient: 'from-[#EC4899] to-[#F59E0B]',
    },
    {
      icon: '⚡',
      title: 'Execution Theatre',
      description: 'Watch your AI team execute tasks in real-time. Full transparency into every decision and action.',
      gradient: 'from-[#F59E0B] to-[#10B981]',
    },
    {
      icon: '💬',
      title: 'Team Inbox & Communication',
      description: 'Chat with specialists, provide feedback, and guide your team through interactive conversations.',
      gradient: 'from-[#10B981] to-[#06B6D4]',
    },
    {
      icon: '📊',
      title: 'Project Management Board',
      description: 'Kanban-style boards to track tasks, manage workflows, and monitor progress across all operations.',
      gradient: 'from-[#06B6D4] to-[#6366F1]',
    },
    {
      icon: '🎯',
      title: 'Specialized Agent Store',
      description: 'Browse and hire from hundreds of specialized agents. Community-built and officially verified.',
      gradient: 'from-[#8B5CF6] to-[#EC4899]',
    },
    {
      icon: '🔄',
      title: 'Agent Evolution & Learning',
      description: 'Your team learns from every interaction. Agents adapt to your preferences and improve over time.',
      gradient: 'from-[#EC4899] to-[#F59E0B]',
    },
    {
      icon: '🏢',
      title: 'Multi-Team Workspaces',
      description: 'Create separate teams for different projects. Each with their own agents, knowledge base, and history.',
      gradient: 'from-[#10B981] to-[#06B6D4]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] overflow-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-slate-800">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-[#6366F1]/10 via-transparent to-transparent blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-[#8B5CF6]/10 via-transparent to-transparent blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className={`relative max-w-6xl mx-auto px-8 py-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-full mb-6">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-[#6366F1] font-medium">Pay-as-you-go billing</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Everything You Need to Build
              <br />
              <span className="bg-gradient-to-r from-[#6366F1] to-[#EC4899] text-transparent bg-clip-text">
                The Future of Work
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              No subscriptions. No monthly fees. Only pay when your AI team is working.
            </p>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-6 bg-[#1E293B]/50 backdrop-blur-sm border border-slate-700 rounded-2xl text-center hover:border-[#6366F1]/50 transition-all hover:scale-105 duration-300">
              <div className="text-3xl font-bold text-white mb-1">
                ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-slate-400">Total Spend</div>
            </div>
            <div className="p-6 bg-[#1E293B]/50 backdrop-blur-sm border border-slate-700 rounded-2xl text-center hover:border-[#FDE047]/50 transition-all hover:scale-105 duration-300">
              <div className="text-3xl font-bold text-[#FDE047] mb-1">
                ${thisMonthSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-slate-400">This Month</div>
            </div>
            <div className="p-6 bg-[#1E293B]/50 backdrop-blur-sm border border-slate-700 rounded-2xl text-center hover:border-emerald-500/50 transition-all hover:scale-105 duration-300">
              <div className="text-3xl font-bold text-emerald-400 mb-1">$0</div>
              <div className="text-sm text-slate-400">When Idle</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">What's Included</h2>
          <p className="text-lg text-slate-400">Everything you need to run an AI-powered organization</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative p-8 bg-[#1E293B]/30 backdrop-blur-sm border border-slate-700 rounded-2xl hover:border-slate-600 transition-all duration-500 hover:scale-105 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{
                transitionDelay: `${index * 100}ms`,
              }}
            >
              {/* Gradient Glow on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>

              <div className="relative">
                {/* Icon */}
                <div className={`w-14 h-14 mb-6 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  {feature.icon}
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-[#6366F1] group-hover:to-[#EC4899] group-hover:bg-clip-text transition-all duration-300">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="border-y border-slate-800 bg-[#0A0F1E]/50">
        <div className="max-w-5xl mx-auto px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How Billing Works</h2>
            <p className="text-lg text-slate-400">Simple, transparent, and fair</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-2xl font-bold text-white">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Start a Task</h3>
              <p className="text-sm text-slate-400">
                Assign work to your AI team. Agents only charge when actively working.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-2xl font-bold text-white">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Watch Them Work</h3>
              <p className="text-sm text-slate-400">
                Track real-time progress in the Execution Theatre. Full transparency.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#F59E0B] flex items-center justify-center text-2xl font-bold text-white">
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Pay for Results</h3>
              <p className="text-sm text-slate-400">
                Only pay for actual time worked. No subscriptions, no commitments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Details */}
      <div className="max-w-4xl mx-auto px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Transparent Pricing</h2>
          <p className="text-lg text-slate-400 mb-8">Every agent shows their hourly rate. You're always in control.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 bg-[#1E293B]/50 backdrop-blur-sm border border-slate-700 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-2">No Hidden Fees</h3>
                <p className="text-sm text-slate-400">What you see is what you pay. No surprise charges.</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#1E293B]/50 backdrop-blur-sm border border-slate-700 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-2">Cancel Anytime</h3>
                <p className="text-sm text-slate-400">No contracts. Pause or resume work whenever you want.</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#1E293B]/50 backdrop-blur-sm border border-slate-700 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-2">Set Spending Limits</h3>
                <p className="text-sm text-slate-400">Control costs with daily and monthly spending caps.</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#1E293B]/50 backdrop-blur-sm border border-slate-700 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-2">Detailed Usage Reports</h3>
                <p className="text-sm text-slate-400">Track every dollar spent. Export reports anytime.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/20 via-[#8B5CF6]/20 to-[#EC4899]/20 blur-3xl"></div>

        <div className="relative max-w-4xl mx-auto px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-6">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm text-emerald-400 font-medium">Secure payment powered by Stripe</span>
          </div>

          <h2 className="text-5xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Add your payment method and start building with AI employees today.
          </p>

          {/* Add Card Button */}
          <button className="group relative px-12 py-5 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-lg font-semibold rounded-2xl shadow-2xl shadow-[#6366F1]/50 hover:shadow-[#6366F1]/70 transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Add Payment Method</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>

          <p className="mt-6 text-sm text-slate-500">
            No charges until you start your first task
          </p>
        </div>
      </div>
    </div>
  );
}
