'use client';

interface TaskInputStepProps {
  taskDescription: string;
  isGenerating: boolean;
  error: string | null;
  agentCount: number;
  loadingAgents: boolean;
  onDescriptionChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function TaskInputStep({ taskDescription, isGenerating, error, agentCount, loadingAgents, onDescriptionChange, onSubmit, onClose }: TaskInputStepProps) {
  return (
    <div className="bg-[#0A0A0F] rounded-lg max-w-2xl w-full border border-slate-800 shadow-2xl animate-fade-in">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">New Task</h2>
          <p className="text-sm text-slate-500 mt-1">Describe your objective and Evo will design the workflow</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">✕</button>
      </div>

      <form onSubmit={onSubmit} className="p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-3">Task Description</label>
          <textarea
            value={taskDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Create a complete Brand Identity Pack for my AI Consulting firm"
            rows={4}
            className="w-full px-4 py-3 bg-[#020617] border border-slate-800 rounded text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] resize-none"
            autoFocus
          />
        </div>

        <div className="mb-6 p-3 bg-[#020617] rounded border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Available Agents</span>
            <span className="text-sm font-medium text-white">{loadingAgents ? '...' : agentCount}</span>
          </div>
          {agentCount === 0 && !loadingAgents && (
            <p className="text-xs text-amber-500 mt-2">No agents hired yet. Hire agents from the marketplace to execute tasks.</p>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">{error}</div>}

        <div className="flex justify-end items-center gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button
            type="submit"
            disabled={!taskDescription.trim() || isGenerating || agentCount === 0}
            className="px-5 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-medium rounded transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing</> : 'Generate Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
