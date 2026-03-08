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

export function TaskInputStep({
  taskDescription,
  isGenerating,
  error,
  agentCount,
  loadingAgents,
  onDescriptionChange,
  onSubmit,
  onClose,
}: TaskInputStepProps) {
  return (
    <div
      className="animate-evolve-in relative w-full max-w-xl rounded-md border shadow-2xl"
      style={{ background: '#0B1215', borderColor: '#1E2D30' }}
    >
      {/* Teal top accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: '#5A9E8F60' }} />

      {/* Header */}
      <div className="flex items-start justify-between border-b px-7 py-5" style={{ borderColor: '#162025' }}>
        <div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            new operation
          </p>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '19px', color: '#EAE6DF' }} className="mt-1 leading-tight">
            New Task
          </h2>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#3A5056' }} className="mt-0.5">
            Describe your objective — Evo will design the workflow
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded border transition-all"
          style={{ borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <form onSubmit={onSubmit} className="p-7">
        {/* Textarea */}
        <div className="mb-5">
          <label
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            className="mb-2 block"
          >
            Task Description
          </label>
          <textarea
            value={taskDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Create a complete Brand Identity Pack for my AI Consulting firm"
            rows={4}
            autoFocus
            className="w-full rounded-md border bg-[#111A1D] px-4 py-3 text-[13px] text-[#D8D4CC] placeholder-[#2A3E44] outline-none transition-all resize-none"
            style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif", lineHeight: '1.65' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
          />
        </div>

        {/* Agents status */}
        <div
          className="mb-5 flex items-center justify-between rounded-md border px-4 py-3"
          style={{ background: '#111A1D', borderColor: '#162025' }}
        >
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Available Agents
          </span>
          <div className="flex items-center gap-2">
            {loadingAgents ? (
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            ) : (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', fontWeight: 600, color: agentCount === 0 ? '#BF8A52' : '#5A9E8F' }}>
                {agentCount}
              </span>
            )}
          </div>
        </div>

        {agentCount === 0 && !loadingAgents && (
          <div
            className="mb-5 flex items-start gap-2 rounded-md border px-4 py-3 text-[12px]"
            style={{ background: '#BF8A5210', borderColor: '#BF8A5230', color: '#BF8A52', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No agents hired yet. Hire agents from the marketplace to execute tasks.
          </div>
        )}

        {error && (
          <div
            className="mb-5 rounded-md border px-4 py-3 text-[12px]"
            style={{ background: '#9E5A5A10', borderColor: '#9E5A5A30', color: '#9E5A5A', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-4 py-2 text-[11px] transition-all"
            style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!taskDescription.trim() || isGenerating || agentCount === 0}
            className="flex items-center gap-2 rounded border px-4 py-2 text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-40"
            style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F50', color: '#5A9E8F' }}
            onMouseEnter={(e) => { if (!isGenerating && agentCount > 0 && taskDescription.trim()) { e.currentTarget.style.background = '#5A9E8F20'; e.currentTarget.style.borderColor = '#5A9E8F80'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; e.currentTarget.style.borderColor = '#5A9E8F50'; }}
          >
            {isGenerating ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analysing…
              </>
            ) : (
              'Generate Plan →'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
