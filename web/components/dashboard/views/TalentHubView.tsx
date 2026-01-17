'use client';

import { useState } from 'react';

export default function TalentHubView() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Departments', count: 24 },
    { id: 'compliance', name: 'Compliance & Legal', count: 5 },
    { id: 'sales', name: 'Sales', count: 6 },
    { id: 'marketing', name: 'Marketing', count: 8 },
    { id: 'engineering', name: 'Engineering', count: 5 },
  ];

  const talents = [
    {
      id: 'compliance-team',
      name: 'Compliance Department',
      type: 'Team Package',
      category: 'compliance',
      members: ['Scanner', 'Auditor', 'Reporter'],
      level: 'Advanced',
      salary: '$2.95/hr',
      description: 'Complete compliance workflow for regulatory review and risk assessment',
      featured: true,
      rating: 4.9,
      deployed: 1247,
    },
    {
      id: 'sales-sdr',
      name: 'SDR Agent',
      type: 'Individual',
      category: 'sales',
      level: 'Intermediate',
      salary: '$1.10/hr',
      description: 'Automates lead qualification and initial outreach',
      featured: false,
      rating: 4.7,
      deployed: 892,
    },
    {
      id: 'content-writer',
      name: 'Senior Content Writer',
      type: 'Individual',
      category: 'marketing',
      level: 'Advanced',
      salary: '$2.00/hr',
      description: 'Creates high-quality blog posts, articles, and marketing copy',
      featured: false,
      rating: 4.8,
      deployed: 1543,
    },
    {
      id: 'code-reviewer',
      name: 'Code Reviewer',
      type: 'Individual',
      category: 'engineering',
      level: 'Expert',
      salary: '$3.50/hr',
      description: 'Reviews pull requests and suggests improvements',
      featured: false,
      rating: 4.9,
      deployed: 678,
    },
  ];

  const filteredTalents =
    selectedCategory === 'all'
      ? talents
      : talents.filter((t) => t.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Talent Hub</h1>
        <p className="text-slate-400">Browse and hire employees for your team</p>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30'
                : 'bg-[#1E293B] text-slate-400 hover:text-white hover:bg-[#2D3B52]'
            }`}
          >
            {cat.name}
            <span className="ml-2 text-xs opacity-70">({cat.count})</span>
          </button>
        ))}
      </div>

      {/* Talent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTalents.map((talent) => (
          <div
            key={talent.id}
            className={`glass rounded-xl p-6 hover:bg-[#1E293B]/80 transition-all ${
              talent.featured ? 'ring-2 ring-[#FDE047]' : ''
            }`}
          >
            {/* Featured Badge */}
            {talent.featured && (
              <div className="inline-flex items-center gap-1 bg-gradient-to-r from-[#FDE047] to-[#FACC15] text-[#020617] text-xs font-bold px-3 py-1 rounded-full mb-4">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                FEATURED
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{talent.name}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>{talent.type}</span>
                  <span>•</span>
                  <span className="text-[#6366F1]">{talent.level}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              {talent.description}
            </p>

            {/* Team Members (if package) */}
            {talent.members && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                  Includes
                </p>
                <div className="flex flex-wrap gap-2">
                  {talent.members.map((member, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-[#020617]/50 text-slate-300 px-2 py-1 rounded-md"
                    >
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#020617]/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-yellow-400 mb-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-semibold text-white">{talent.rating}</span>
                </div>
                <div className="text-xs text-slate-400">Rating</div>
              </div>
              <div className="bg-[#020617]/30 rounded-lg p-2">
                <div className="text-sm font-semibold text-white mb-1">
                  {talent.deployed.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">Deployed</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
              <div>
                <div className="text-xs text-slate-400 mb-1">Combined Salary</div>
                <div className="text-xl font-bold text-[#FDE047]">{talent.salary}</div>
              </div>
              <button className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all">
                Hire Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
