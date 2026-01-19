'use client';

import { useState } from 'react';

interface ManagerAgent {
  id: string;
  name: string;
  title: string;
  specialty: string;
  avatar: string;
  color: string;
  experience: string;
  rate: string;
  skills: string[];
  bio: string;
}

interface ManagerMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHireAria: () => void;
  teamId: string;
}

export default function ManagerMarketplaceModal({
  isOpen,
  onClose,
  onHireAria,
  teamId,
}: ManagerMarketplaceModalProps) {
  const [selectedManager, setSelectedManager] = useState<string | null>('aria');
  const [isHiring, setIsHiring] = useState(false);

  const managers: ManagerAgent[] = [
    {
      id: 'aria',
      name: 'Aria Martinez',
      title: 'Senior Brand Lead',
      specialty: 'Personal Branding & Executive Positioning',
      avatar: '👩‍💼',
      color: '#EC4899',
      experience: '8+ years building elite personal brands',
      rate: '$85/hr',
      skills: ['Brand Strategy', 'Content Direction', 'Team Leadership', 'Stakeholder Management'],
      bio: 'Specialized in building personal brands for C-suite executives, thought leaders, and entrepreneurs. Led 200+ successful branding projects with a focus on authenticity and market positioning.',
    },
    {
      id: 'marcus',
      name: 'Marcus Chen',
      title: 'Brand Operations Lead',
      specialty: 'Brand Systems & Process Optimization',
      avatar: '👨‍💻',
      color: '#8B5CF6',
      experience: '6+ years in brand operations',
      rate: '$75/hr',
      skills: ['Operations Management', 'Process Design', 'Team Coordination', 'Quality Control'],
      bio: 'Expert in building scalable branding systems and workflows. Focuses on efficiency and consistent delivery across multi-agent teams.',
    },
    {
      id: 'sophia',
      name: 'Sophia Rodriguez',
      title: 'Creative Brand Director',
      specialty: 'Visual Identity & Creative Strategy',
      avatar: '👩‍🎨',
      color: '#F59E0B',
      experience: '10+ years in creative direction',
      rate: '$90/hr',
      skills: ['Creative Direction', 'Visual Strategy', 'Designer Management', 'Brand Guidelines'],
      bio: 'Award-winning creative director specializing in visual brand identity. Known for creating memorable, cohesive brand experiences across all touchpoints.',
    },
  ];

  if (!isOpen) return null;

  const handleHire = async (managerId: string) => {
    if (managerId !== 'aria') {
      alert('Only Aria is available for hire in this demo');
      return;
    }

    setIsHiring(true);

    // Simulate hiring process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Call the hire callback
    onHireAria();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-[#0F172A] rounded-xl border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Hire a Lead Manager
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Recommended to manage your branding team
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Manager Cards */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          <div className="space-y-3">
            {managers.map((manager) => (
              <button
                key={manager.id}
                onClick={() => setSelectedManager(manager.id)}
                className={`text-left p-4 rounded-lg border transition-all w-full ${
                  selectedManager === manager.id
                    ? 'border-[#6366F1] bg-[#6366F1]/5'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-xl flex-shrink-0 border border-slate-700">
                    {manager.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          {manager.name}
                          {manager.id === 'aria' && (
                            <span className="px-1.5 py-0.5 bg-[#10B981]/20 border border-[#10B981]/30 rounded text-xs text-[#10B981] font-medium">
                              RECOMMENDED
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">{manager.title}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-[#FDE047]">{manager.rate}</div>
                        <div className="text-xs text-slate-600">per hour</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                      {manager.bio}
                    </p>

                    {/* Skills - Only show 3 */}
                    <div className="flex flex-wrap gap-1.5">
                      {manager.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selectedManager === manager.id && (
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-[#6366F1] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-[#0A0A0F]">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedManager && handleHire(selectedManager)}
              disabled={!selectedManager || isHiring}
              className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isHiring ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Hiring...
                </>
              ) : (
                <>
                  Hire {selectedManager === 'aria' ? 'Aria' : selectedManager === 'marcus' ? 'Marcus' : 'Sophia'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
