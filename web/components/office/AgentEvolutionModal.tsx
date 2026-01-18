'use client';

import { useState } from 'react';
import { HiredAgent, addLearnedPreference, levelUpAgent, addExperience } from '@/lib/agents';
import { syncPreferencesToGraph } from '@/lib/knowledge-graph';

interface AgentEvolutionModalProps {
  agent: HiredAgent;
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback to refresh agent data
}

export default function AgentEvolutionModal({
  agent,
  teamId,
  isOpen,
  onClose,
  onSuccess,
}: AgentEvolutionModalProps) {
  const [step, setStep] = useState<'input' | 'learning' | 'levelup' | 'complete'>('input');
  const [category, setCategory] = useState('');
  const [rule, setRule] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [newLevel, setNewLevel] = useState(agent.agentLevel);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !rule.trim()) return;

    setIsProcessing(true);
    setStep('learning');

    // Simulate learning process
    setTimeout(() => {
      // Add learned preference
      const success = addLearnedPreference(agent.id, teamId, category, rule, 95);

      if (success) {
        // Sync the new preference to the knowledge graph
        syncPreferencesToGraph(teamId);

        // Add experience (30 XP per learned preference)
        addExperience(agent.id, teamId, 30);

        // Check if agent should level up (at 100 XP)
        if ((agent.experience + 30) >= 100) {
          setNewLevel(agent.agentLevel + 1);
          setShowLevelUpAnimation(true);
          setStep('levelup');

          // Level up after animation
          setTimeout(() => {
            levelUpAgent(agent.id, teamId);
            setTimeout(() => {
              setStep('complete');
              setIsProcessing(false);
            }, 1000);
          }, 2000);
        } else {
          setStep('complete');
          setIsProcessing(false);
        }
      }
    }, 1500);
  };

  const handleClose = () => {
    setStep('input');
    setCategory('');
    setRule('');
    setIsProcessing(false);
    setShowLevelUpAnimation(false);
    onSuccess(); // Refresh agent data
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass rounded-2xl border border-slate-700/50 max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {agent.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className={`absolute -top-1 -right-1 w-7 h-7 bg-[#FDE047] rounded-full flex items-center justify-center text-sm font-bold text-[#020617] transition-all duration-500 ${
                  showLevelUpAnimation ? 'scale-150 rotate-360' : ''
                }`}>
                  {showLevelUpAnimation ? newLevel : agent.agentLevel}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{agent.name}</h2>
                <p className="text-sm text-slate-400">{agent.role}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors"
              disabled={isProcessing}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'input' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Teach {agent.name} a New Preference</h3>
                <p className="text-sm text-slate-400 mb-6">
                  Help {agent.name} learn from this task. What adjustment should they remember for next time?
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Preference Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1E293B] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  required
                >
                  <option value="">Select a category...</option>
                  <option value="Tone & Voice">Tone & Voice</option>
                  <option value="Color Preference">Color Preference</option>
                  <option value="Target Audience">Target Audience</option>
                  <option value="Brand Values">Brand Values</option>
                  <option value="Content Style">Content Style</option>
                  <option value="Design Aesthetic">Design Aesthetic</option>
                  <option value="Communication Style">Communication Style</option>
                  <option value="Quality Standards">Quality Standards</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Learning Rule
                </label>
                <textarea
                  value={rule}
                  onChange={(e) => setRule(e.target.value)}
                  placeholder="Example: 'Prefers Elite Authority tone with 10% more conversational edge'"
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1E293B] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  Be specific. This rule will be automatically applied to all future tasks for this agent.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:shadow-lg hover:shadow-[#6366F1]/50 text-white rounded-lg font-medium transition-all"
                >
                  Teach & Evolve
                </button>
              </div>
            </form>
          )}

          {step === 'learning' && (
            <div className="py-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Processing Learning...</h3>
              <p className="text-slate-400">
                {agent.name} is integrating this new preference into their knowledge base
              </p>
            </div>
          )}

          {step === 'levelup' && (
            <div className="py-12 text-center">
              <div className="mb-6 relative">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#FDE047] to-[#F59E0B] rounded-full flex items-center justify-center animate-bounce">
                  <div className="text-6xl font-bold text-[#020617]">
                    {newLevel}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-4 border-[#FDE047] rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">LEVEL UP!</h3>
              <p className="text-lg text-[#FDE047] mb-4">
                {agent.name} reached Level {newLevel}
              </p>
              <p className="text-slate-400">
                Accuracy increased • Knowledge expanded • Performance enhanced
              </p>
            </div>
          )}

          {step === 'complete' && (
            <div className="py-8">
              <div className="mb-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Learning Complete!</h3>
                <p className="text-slate-400">
                  {agent.name} has learned a new preference and gained {showLevelUpAnimation ? '(+LEVEL UP)' : '30 XP'}
                </p>
              </div>

              <div className="glass-light rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#6366F1]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white mb-1">{category}</div>
                    <div className="text-sm text-slate-300">{rule}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      Added to Neural Vault • Confidence: 95%
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-4 py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:shadow-lg hover:shadow-[#6366F1]/50 text-white rounded-lg font-medium transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
