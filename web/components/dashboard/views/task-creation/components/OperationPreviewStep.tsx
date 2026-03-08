'use client';

import type { WorkflowDesign } from '@/lib/services/workflows';
import type { WorkflowNodeWithAgent } from '../hooks/useTaskCreation';

interface OperationPreviewStepProps {
  workflowDesign: WorkflowDesign;
  workflowNodes: WorkflowNodeWithAgent[];
  taskDescription: string;
  evolutionContext: Record<string, unknown> | null;
  error: string | null;
  onBack: () => void;
  onClose: () => void;
  onViewDetails: () => void;
  onStart: () => void;
}

function NodeAvatar({ node }: { node: WorkflowNodeWithAgent }) {
  if (node.assignedAgent?.photo_url) {
    return <img src={node.assignedAgent.photo_url} alt={node.assignedAgent.name} className="h-8 w-8 rounded-sm object-cover" />;
  }
  if (node.assignedAgent) {
    return (
      <div
        className="flex h-8 w-8 items-center justify-center rounded-sm text-[11px] font-bold"
        style={{ background: '#5A9E8F', color: '#080E11', fontFamily: "'Syne', sans-serif" }}
      >
        {node.assignedAgent.name.substring(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-sm border text-[11px]"
      style={{ background: '#111A1D', borderColor: '#1E2D30', color: '#3A5056' }}
    >
      ?
    </div>
  );
}

export function OperationPreviewStep({
  workflowDesign,
  workflowNodes,
  taskDescription,
  evolutionContext,
  error,
  onBack,
  onClose,
  onViewDetails,
  onStart,
}: OperationPreviewStepProps) {
  return (
    <div className="animate-evolve-in w-full max-w-3xl">
      <div
        className="relative rounded-md border shadow-2xl"
        style={{ background: '#0B1215', borderColor: '#1E2D30' }}
      >
        {/* Teal top accent */}
        <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md" style={{ background: '#5A9E8F60' }} />

        {/* Header */}
        <div className="border-b px-7 py-5" style={{ borderColor: '#162025' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                workflow generated
              </p>

              {/* Evolution-informed banner */}
              {evolutionContext && (evolutionContext.total_past_executions as number) > 0 && (
                <div
                  className="mt-2 mb-3 flex items-center gap-2 rounded-md border px-3 py-2"
                  style={{ background: '#5A9E8F08', borderColor: '#5A9E8F30' }}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-pulse" />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5A9E8F' }}>
                    Evolution-Informed
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#3A5056' }}>
                    · based on {evolutionContext.total_past_executions as number} past executions
                    {evolutionContext.avg_quality ? ` · avg quality ${Math.round((evolutionContext.avg_quality as number) * 100)}%` : ''}
                  </span>
                </div>
              )}

              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '19px', color: '#EAE6DF' }} className="mt-2 leading-tight">
                {workflowDesign.title}
              </h2>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed" style={{ color: '#4A6A72', fontFamily: "'Syne', sans-serif" }}>
                {taskDescription}
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

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Steps', value: workflowNodes.length, color: '#B8B2AA' },
              { label: 'Est. Time', value: workflowDesign.estimated_time_minutes < 60 ? `${workflowDesign.estimated_time_minutes} min` : `${Math.round(workflowDesign.estimated_time_minutes / 60)} hrs`, color: '#B8B2AA' },
              { label: 'Est. Cost', value: `$${workflowDesign.estimated_cost.toFixed(2)}`, color: '#BF8A52' },
            ].map(stat => (
              <div key={stat.label} className="rounded-md border p-3" style={{ background: '#111A1D', borderColor: '#162025' }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#2E4248', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="mb-1">
                  {stat.label}
                </p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '16px', fontWeight: 600, color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Execution sequence */}
        <div className="px-7 py-5">
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="mb-4">
            Execution Sequence
          </p>
          <div className="space-y-2.5 mb-5">
            {workflowNodes.map((node, i) => (
              <div
                key={node.id}
                className="flex items-center gap-4 rounded-md border px-4 py-3"
                style={{ background: '#111A1D', borderColor: '#162025' }}
              >
                {/* Step number */}
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border text-[10px] font-semibold"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056', background: '#0B1215' }}
                >
                  {node.order}
                </div>

                {/* Avatar */}
                <NodeAvatar node={node} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '13px', color: '#D8D4CC' }}>
                    {node.assignedAgent?.name || node.agent_role}
                  </p>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', color: '#3A5056' }} className="truncate">
                    {node.description}
                  </p>
                </div>

                {/* Connector dot */}
                {i < workflowNodes.length - 1 && (
                  <div className="flex items-center">
                    <svg className="h-3.5 w-3.5 text-[#2A3E44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* No-agent warning */}
          {workflowNodes.some(n => !n.assignedAgent) && (
            <div
              className="mb-4 flex items-start gap-2 rounded-md border px-4 py-3 text-[12px]"
              style={{ background: '#BF8A5210', borderColor: '#BF8A5230', color: '#BF8A52', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Some steps don't have matching agents. Consider hiring agents with these roles.
            </div>
          )}

          {error && (
            <div
              className="mb-4 rounded-md border px-4 py-3 text-[12px]"
              style={{ background: '#9E5A5A10', borderColor: '#9E5A5A30', color: '#9E5A5A', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {error}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 border-t pt-5" style={{ borderColor: '#162025' }}>
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
              onClick={onViewDetails}
              className="rounded border px-4 py-2 text-[11px] transition-all"
              style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#7A9EA6', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7A9EA6'; e.currentTarget.style.borderColor = '#1E2D30'; }}
            >
              View Details
            </button>
            <button
              onClick={onStart}
              className="flex items-center gap-2 rounded border px-4 py-2 text-[11px] transition-all"
              style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F50', color: '#5A9E8F' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F20'; e.currentTarget.style.borderColor = '#5A9E8F80'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; e.currentTarget.style.borderColor = '#5A9E8F50'; }}
            >
              Start Operation →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
