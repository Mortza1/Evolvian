'use client';

import { useState } from 'react';
import { Team, createTeam } from '@/lib/teams';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (team: Team, isPersonalBranding?: boolean) => void;
}

const TEAM_ICONS = ['⚖️', '📢', '🔬', '💰', '🏥', '🎓', '🏭', '🚀', '🎨', '📊', '🔒', '🌍'];
const TEAM_COLORS = [
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#A855F7', // Violet
  '#84CC16', // Lime
];

type ModalStep = 'blueprint' | 'details';

export default function CreateTeamModal({ isOpen, onClose, onCreated }: CreateTeamModalProps) {
  const [step, setStep] = useState<ModalStep>('blueprint');
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(TEAM_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);
  const [dailyBudgetCap, setDailyBudgetCap] = useState('');
  const [requireApprovalThreshold, setRequireApprovalThreshold] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const blueprints = [
    {
      id: 'personal-branding',
      name: 'Personal Branding',
      icon: '✨',
      color: '#EC4899',
      description: 'Build an elite personal brand with AI specialists',
      features: ['Lead Manager', 'Color Psychology', 'Viral Content', 'Typography'],
    },
    {
      id: 'custom',
      name: 'Custom Team',
      icon: '🎯',
      color: '#6366F1',
      description: 'Build your own team from scratch',
      features: ['Full Control', 'Choose Specialists', 'Custom Workflow', 'Flexible Budget'],
    },
  ];

  const handleBlueprintSelect = (blueprintId: string) => {
    setSelectedBlueprint(blueprintId);

    // Auto-fill based on blueprint
    if (blueprintId === 'personal-branding') {
      setName('Personal Branding');
      setDescription('Elite personal branding with AI specialists');
      setSelectedIcon('✨');
      setSelectedColor('#EC4899');
    }

    setStep('details');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a team name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newTeam = await createTeam({
        name: name.trim(),
        description: description.trim() || 'A new AI workforce team',
        icon: selectedIcon,
        color: selectedColor,
        settings: {
          dailyBudgetCap: dailyBudgetCap ? parseFloat(dailyBudgetCap) : undefined,
          requireApprovalThreshold: requireApprovalThreshold ? parseFloat(requireApprovalThreshold) : undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          workingHours: undefined,
        },
      });

      if (newTeam) {
        const isPersonalBranding = selectedBlueprint === 'personal-branding';
        onCreated(newTeam, isPersonalBranding);

        // Reset form
        setStep('blueprint');
        setSelectedBlueprint(null);
        setName('');
        setDescription('');
        setSelectedIcon(TEAM_ICONS[0]);
        setSelectedColor(TEAM_COLORS[0]);
        setDailyBudgetCap('');
        setRequireApprovalThreshold('');

        onClose();
      } else {
        setError('Failed to create team. Please try again.');
      }
    } catch (err: any) {
      console.error('Error creating team:', err);
      setError(err.message || 'Failed to create team. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {step === 'blueprint' ? 'Choose a Blueprint' : 'Create New Team'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {step === 'blueprint'
                  ? 'Start with a pre-built team or build custom'
                  : 'Set up your AI workforce'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === 'blueprint' ? (
            <div className="space-y-4">
              {blueprints.map((blueprint) => (
                <button
                  key={blueprint.id}
                  onClick={() => handleBlueprintSelect(blueprint.id)}
                  className="w-full p-6 glass rounded-xl border-2 border-slate-700/50 hover:border-slate-600 text-left transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ backgroundColor: blueprint.color + '30' }}
                    >
                      {blueprint.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#6366F1] transition-colors">
                        {blueprint.name}
                      </h3>
                      <p className="text-sm text-slate-400 mb-3">{blueprint.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {blueprint.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-1 bg-[#6366F1]/20 border border-[#6366F1]/30 text-[#6366F1] text-xs rounded-md"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
            {/* Team Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Team Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Legal Department"
                className="w-full px-4 py-3 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this team focus on?"
                rows={3}
                className="w-full px-4 py-3 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Team Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {TEAM_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`p-3 rounded-lg text-2xl transition-all ${
                      selectedIcon === icon
                        ? 'bg-[#6366F1] ring-2 ring-[#6366F1] ring-offset-2 ring-offset-[#020617]'
                        : 'bg-[#020617]/50 hover:bg-[#020617]/70'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Team Color</label>
              <div className="grid grid-cols-6 gap-2">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-full h-10 rounded-lg transition-all ${
                      selectedColor === color
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#020617]'
                        : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-[#020617]/50 rounded-lg border border-slate-700/50">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Preview</div>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: selectedColor + '30' }}
                >
                  {selectedIcon}
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">{name || 'Team Name'}</div>
                  <div className="text-xs text-slate-400">{description || 'Team description'}</div>
                </div>
              </div>
            </div>

            {/* Budget Settings */}
            <div className="pt-4 border-t border-slate-700/50">
              <h3 className="text-sm font-semibold text-white mb-3">Budget Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Daily Budget Cap
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={dailyBudgetCap}
                      onChange={(e) => setDailyBudgetCap(e.target.value)}
                      placeholder="Unlimited"
                      className="w-full pl-8 pr-4 py-2 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Max spend per day</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Approval Threshold
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={requireApprovalThreshold}
                      onChange={(e) => setRequireApprovalThreshold(e.target.value)}
                      placeholder="None"
                      className="w-full pl-8 pr-4 py-2 bg-[#020617]/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Require approval if exceeded</p>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (step === 'details') {
                  setStep('blueprint');
                  setError(null);
                } else {
                  onClose();
                }
              }}
              disabled={isCreating}
              className="px-6 py-2.5 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'details' ? 'Back' : 'Cancel'}
            </button>

            {step === 'details' && (
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-medium rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isCreating ? 'Creating...' : 'Create Team'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
