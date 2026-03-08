'use client';

import type { WorkflowDesign } from '@/lib/services/workflows';
import type { TaskAnalysis } from '@/lib/services/workflows';
import type { WorkflowNodeWithAgent } from '../hooks/useTaskCreation';

// Teal-spectrum step accent colors — warm, organic, no indigo
const NODE_ACCENTS = ['#5A9E8F', '#7BBDAE', '#BF8A52', '#7A8FA0'];

interface WorkflowDetailsStepProps {
  workflowDesign: WorkflowDesign;
  workflowNodes: WorkflowNodeWithAgent[];
  analysis: TaskAnalysis | null;
  error: string | null;
  onBack: () => void;
  onClose: () => void;
  onStart: () => void;
}

function AgentAvatar({ node, size = 'sm' }: { node: WorkflowNodeWithAgent; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';
  const textSize = size === 'lg' ? 'text-[13px]' : 'text-[11px]';
  if (node.assignedAgent?.photo_url) {
    return <img src={node.assignedAgent.photo_url} alt={node.assignedAgent.name} className={`${dim} rounded-sm object-cover`} />;
  }
  if (node.assignedAgent) {
    return (
      <div
        className={`${dim} flex items-center justify-center rounded-sm font-bold ${textSize}`}
        style={{ background: '#5A9E8F', color: '#080E11', fontFamily: "'Syne', sans-serif" }}
      >
        {node.assignedAgent.name.substring(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div
      className={`${dim} flex items-center justify-center rounded-sm border text-[11px]`}
      style={{ background: '#111A1D', borderColor: '#1E2D30', color: '#3A5056' }}
    >
      ?
    </div>
  );
}

export function WorkflowDetailsStep({
  workflowDesign,
  workflowNodes,
  analysis,
  error,
  onBack,
  onClose,
  onStart,
}: WorkflowDetailsStepProps) {
  return (
    <div
      className="animate-evolve-in w-full max-w-5xl max-h-[90vh] overflow-y-auto scrollbar-hide rounded-md border shadow-2xl"
      style={{ background: '#0B1215', borderColor: '#1E2D30' }}
    >
      {/* Teal top accent */}
      <div className="sticky top-0 inset-x-0 h-[2px] rounded-t-md" style={{ background: '#5A9E8F60', zIndex: 1 }} />

      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="min-w-0">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              workflow details
            </p>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '22px', color: '#EAE6DF' }} className="mt-1 leading-tight">
              {workflowDesign.title}
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: '#4A6A72', fontFamily: "'Syne', sans-serif" }}>
              {workflowDesign.description || 'Sequential execution plan'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border transition-all"
            style={{ borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Node graph — horizontal scroll */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-stretch gap-0 min-w-max">
            {workflowNodes.map((node, idx) => {
              const color = NODE_ACCENTS[idx % NODE_ACCENTS.length];
              return (
                <div key={node.id} className="flex items-center">
                  {/* Card */}
                  <div
                    className="relative w-48 rounded-md border p-5 flex flex-col items-center text-center"
                    style={{ background: '#111A1D', borderColor: `${color}40` }}
                  >
                    {/* Step badge */}
                    <div
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex h-5 min-w-[20px] items-center justify-center rounded-sm px-1.5 text-[10px] font-semibold"
                      style={{ background: color, color: '#080E11', fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {node.order}
                    </div>
                    {/* Color top bar */}
                    <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: `${color}80` }} />

                    <div className="mt-2 mb-3">
                      <AgentAvatar node={node} size="lg" />
                    </div>
                    <h3
                      style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: '#D8D4CC' }}
                      className="mb-0.5 leading-tight"
                    >
                      {node.assignedAgent?.name || node.agent_role}
                    </h3>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056' }} className="mb-2">
                      {node.assignedAgent?.role || 'Unassigned'}
                    </p>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', color: '#4A6A72', lineHeight: '1.5' }}>
                      {node.name}
                    </p>
                  </div>

                  {/* Arrow connector */}
                  {idx < workflowNodes.length - 1 && (
                    <div className="flex items-center px-3">
                      <svg className="h-4 w-4 text-[#2A3E44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Execution breakdown */}
        <div className="mb-8">
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="mb-4">
            Execution Breakdown
          </p>
          <div className="space-y-2.5">
            {workflowNodes.map((node, idx) => {
              const color = NODE_ACCENTS[idx % NODE_ACCENTS.length];
              return (
                <div
                  key={node.id}
                  className="flex items-start gap-4 rounded-md border p-4 transition-all"
                  style={{ background: '#111A1D', borderColor: '#162025' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}30`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#162025'; }}
                >
                  <div className="shrink-0">
                    <AgentAvatar node={node} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#D8D4CC' }}>
                        {node.assignedAgent?.name || node.agent_role}
                      </h4>
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-semibold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", background: `${color}20`, color }}
                      >
                        Step {node.order}
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#B8B2AA' }} className="mb-1">
                      {node.name}
                    </p>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#4A6A72' }} className="mb-2">
                      {node.description}
                    </p>
                    <div className="flex items-center gap-3" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }}>
                      {node.assignedAgent && (
                        <>
                          <span>${node.assignedAgent.cost_per_hour}/hr</span>
                          <span>·</span>
                          <span>Level {node.assignedAgent.level}</span>
                        </>
                      )}
                      {node.inputs.length > 0 && (
                        <>
                          <span>·</span>
                          <span>Needs: {node.inputs.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evo's analysis */}
        {analysis && (
          <div
            className="mb-8 rounded-md border p-5"
            style={{ background: '#111A1D', borderColor: '#1E2D30' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-sm text-[10px] font-bold"
                style={{ background: '#5A9E8F', color: '#080E11', fontFamily: "'Syne', sans-serif" }}
              >
                EVO
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Evo's Analysis
              </p>
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#B8B2AA', lineHeight: '1.65' }} className="mb-4">
              {analysis.understanding}
            </p>
            {analysis.assumptions.length > 0 && (
              <div className="mb-4">
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="mb-2">
                  Assumptions
                </p>
                <ul className="space-y-1.5">
                  {analysis.assumptions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span style={{ color: '#5A9E8F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>·</span>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#7A9EA6' }}>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span
                className="rounded border px-2.5 py-1 text-[10px]"
                style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#4A6A72', background: '#0B1215' }}
              >
                Complexity: {analysis.estimated_complexity}
              </span>
              <span
                className="rounded border px-2.5 py-1 text-[10px]"
                style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#5A9E8F30', color: '#5A9E8F', background: '#5A9E8F10' }}
              >
                Confidence: {Math.round(analysis.confidence * 100)}%
              </span>
            </div>
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t pt-6" style={{ borderColor: '#162025' }}>
          <button
            onClick={onBack}
            className="rounded border px-4 py-2 text-[11px] transition-all"
            style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
          >
            Back
          </button>
          <button
            onClick={onStart}
            className="flex items-center gap-2 rounded border px-5 py-2 text-[11px] transition-all"
            style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F50', color: '#5A9E8F' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F20'; e.currentTarget.style.borderColor = '#5A9E8F80'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; e.currentTarget.style.borderColor = '#5A9E8F50'; }}
          >
            Start Operation →
          </button>
        </div>
      </div>
    </div>
  );
}
