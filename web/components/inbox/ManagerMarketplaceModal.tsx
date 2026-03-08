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
      color: '#BF8A52',
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
      color: '#7A8FA0',
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
      color: '#5A9E8F',
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    onHireAria();
  };

  const selectedMgr = managers.find(m => m.id === selectedManager);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(4,9,12,0.85)' }}>
      <div
        className="relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-md border shadow-2xl flex flex-col"
        style={{ background: '#0B1215', borderColor: '#1E2D30' }}
      >
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: '#5A9E8F60' }} />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-5" style={{ borderColor: '#162025' }}>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              lead manager
            </p>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#EAE6DF' }} className="mt-0.5">
              Hire a Lead Manager
            </h2>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#3A5056' }} className="mt-0.5">
              Recommended to manage your branding team
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border transition-all"
            style={{ borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Manager list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
          {managers.map((manager) => {
            const isSelected = selectedManager === manager.id;
            return (
              <button
                key={manager.id}
                onClick={() => setSelectedManager(manager.id)}
                className="relative w-full rounded-md border text-left transition-all"
                style={{
                  background: isSelected ? `${manager.color}0A` : '#111A1D',
                  borderColor: isSelected ? `${manager.color}50` : '#1E2D30',
                  padding: '16px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = `${manager.color}35`;
                    e.currentTarget.style.background = `${manager.color}06`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#1E2D30';
                    e.currentTarget.style.background = '#111A1D';
                  }
                }}
              >
                {/* Per-manager top bar */}
                <div className="absolute inset-x-0 top-0 h-[1px] rounded-t-md" style={{ background: `${manager.color}50` }} />

                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border text-xl"
                    style={{ background: `${manager.color}12`, borderColor: `${manager.color}30` }}
                  >
                    {manager.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#EAE6DF' }}>
                            {manager.name}
                          </h3>
                          {manager.id === 'aria' && (
                            <span
                              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#5A9E8F', borderColor: '#5A9E8F30', background: '#5A9E8F10', textTransform: 'uppercase' }}
                              className="rounded border px-1.5 py-0.5"
                            >
                              Recommended
                            </span>
                          )}
                        </div>
                        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#3A5056' }} className="mt-0.5">
                          {manager.title}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', fontWeight: 600, color: '#BF8A52' }}>
                          {manager.rate}
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }}>
                          per hour
                        </div>
                      </div>
                    </div>

                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#4A6A72', lineHeight: '1.6' }} className="mb-3 line-clamp-2">
                      {manager.bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {manager.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', borderColor: '#1E2D30', background: '#0B1215' }}
                          className="rounded border px-2 py-0.5"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm"
                      style={{ background: manager.color }}
                    >
                      <svg className="h-3 w-3 text-[#080E11]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4" style={{ borderColor: '#162025', background: '#080E11' }}>
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-[11px] transition-all"
            style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
          >
            Cancel
          </button>
          <button
            onClick={() => selectedManager && handleHire(selectedManager)}
            disabled={!selectedManager || isHiring}
            className="flex items-center gap-2 rounded border px-4 py-2 text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-40"
            style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F50', color: '#5A9E8F' }}
            onMouseEnter={(e) => { if (!isHiring) { e.currentTarget.style.background = '#5A9E8F20'; e.currentTarget.style.borderColor = '#5A9E8F80'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; e.currentTarget.style.borderColor = '#5A9E8F50'; }}
          >
            {isHiring ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Hiring…
              </>
            ) : (
              `Hire ${selectedMgr?.name.split(' ')[0] ?? 'Manager'} →`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
