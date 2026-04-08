'use client';

import { useEffect, useRef } from 'react';
import type { HierarchyStep, HierarchyTeam, HierarchyMetrics } from '../types';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface HierarchyViewProps {
  hierarchyTeam: HierarchyTeam | null;
  hierarchyMetrics: HierarchyMetrics | null;
  isExecuting: boolean;
  activeStepTeamId?: string | null;
}

interface TreeNode {
  step: HierarchyStep;
  children: TreeNode[];
  depth: number;
  index: number;
}

/* ─── Tree builder ───────────────────────────────────────────────────────── */
function buildTree(steps: HierarchyStep[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  steps.forEach((s, i) => byId.set(s.id, { step: s, children: [], depth: 0, index: i }));

  const roots: TreeNode[] = [];
  steps.forEach(s => {
    const node = byId.get(s.id)!;
    const parents = (s.depends_on ?? []).filter(pid => byId.has(pid));
    if (parents.length === 0) {
      roots.push(node);
    } else {
      parents.forEach(pid => {
        const parent = byId.get(pid)!;
        node.depth = parent.depth + 1;
        parent.children.push(node);
      });
    }
  });
  return roots;
}

/** Group steps by their sub-supervisor. Returns null if no sub-supervisor info. */
function groupBySubSupervisor(
  steps: HierarchyStep[],
  subSupervisors: string[],
): Map<string, HierarchyStep[]> | null {
  if (!subSupervisors.length) return null;
  const hasSupField = steps.some(s => s.supervisor && subSupervisors.includes(s.supervisor));
  if (!hasSupField) return null;

  const map = new Map<string, HierarchyStep[]>();
  subSupervisors.forEach(ss => map.set(ss, []));
  steps.forEach(s => {
    const key = s.supervisor && map.has(s.supervisor) ? s.supervisor : subSupervisors[0];
    map.get(key)!.push(s);
  });
  return map;
}

function agentInitials(name: string) {
  return name.replace(/_step\d+$/, '').substring(0, 2).toUpperCase();
}
function agentDisplay(name: string) {
  return name.replace(/_step\d+$/, '');
}

/* ─── Injected keyframes ─────────────────────────────────────────────────── */
const KEYFRAMES = `
@keyframes hz-pulse   { 0%,100%{opacity:.15} 50%{opacity:.55} }
@keyframes hz-travel  { 0%{top:0%;opacity:0} 15%{opacity:1} 85%{opacity:1} 100%{top:100%;opacity:0} }
@keyframes hz-scanline{ 0%{transform:translateY(-100%);opacity:0} 30%{opacity:.6} 70%{opacity:.6} 100%{transform:translateY(200%);opacity:0} }
@keyframes hz-orbit   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes hz-fadein  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes hz-glow    { 0%,100%{box-shadow:0 0 12px #5A9E8F30,0 0 30px #5A9E8F10} 50%{box-shadow:0 0 20px #5A9E8F50,0 0 50px #5A9E8F20} }
@keyframes hz-sup-glow{ 0%,100%{box-shadow:0 0 20px #BF8A5230,0 0 50px #BF8A5210,inset 0 0 30px #BF8A520A} 50%{box-shadow:0 0 35px #BF8A5250,0 0 80px #BF8A5220,inset 0 0 40px #BF8A5215} }
@keyframes hz-ray     { 0%{opacity:.04} 50%{opacity:.12} 100%{opacity:.04} }
`;

function useStyles() {
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const el = document.createElement('style');
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);
}

/* ─── Flow connector with traveling signal ───────────────────────────────── */
function FlowLine({ active, height = 36 }: { active: boolean; height?: number }) {
  return (
    <div className="relative flex justify-center flex-shrink-0" style={{ width: 2, height }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          background: active
            ? 'linear-gradient(to bottom, #5A9E8F90, #5A9E8F20)'
            : 'linear-gradient(to bottom, #1E3038, #0D1A1E)',
          transition: 'background .4s',
        }}
      />
      {active && (
        <div
          style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            width: 4, height: 4, borderRadius: '50%',
            background: '#7BCCB8', boxShadow: '0 0 6px #5A9E8F',
            animation: 'hz-travel 1.1s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}

/* ─── Horizontal bridge bar ──────────────────────────────────────────────── */
function HBridge({ count, active }: { count: number; active: boolean }) {
  if (count <= 1) return null;
  return (
    <div style={{
      height: 1,
      width: `${count * 172}px`,
      maxWidth: '90vw',
      background: active
        ? 'linear-gradient(to right, transparent, #5A9E8F40, #5A9E8F60, #5A9E8F40, transparent)'
        : 'linear-gradient(to right, transparent, #1E303890, transparent)',
      transition: 'background .4s',
      flexShrink: 0,
    }} />
  );
}

/* ─── Step node card ─────────────────────────────────────────────────────── */
function StepNode({
  node, activeStepTeamId, stagger = 0,
}: {
  node: TreeNode;
  activeStepTeamId?: string | null;
  stagger?: number;
}) {
  const isActive = !!activeStepTeamId && node.step.team_id === activeStepTeamId;
  const hasChildren = node.children.length > 0;

  // Determine if any descendant is active (to animate connectors leading to it)
  const descendantActive = (n: TreeNode): boolean =>
    (!!activeStepTeamId && n.step.team_id === activeStepTeamId) ||
    n.children.some(descendantActive);
  const childActive = node.children.some(descendantActive);

  return (
    <div
      className="flex flex-col items-center"
      style={{ animation: `hz-fadein .5s ease both`, animationDelay: `${stagger * 0.07}s` }}
    >
      {/* Card */}
      <div className="relative" style={{ padding: 2 }}>
        {/* Orbit ring when active */}
        {isActive && (
          <div
            style={{
              position: 'absolute', inset: -6, borderRadius: 12,
              border: '1.5px solid transparent',
              borderTopColor: '#5A9E8F',
              borderRightColor: '#5A9E8F40',
              animation: 'hz-orbit 1.5s linear infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Glow halo */}
        {isActive && (
          <div
            style={{
              position: 'absolute', inset: -12, borderRadius: 16,
              background: 'radial-gradient(ellipse at center, #5A9E8F15 0%, transparent 70%)',
              animation: 'hz-pulse 1.8s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        <div
          style={{
            width: 148, borderRadius: 10,
            background: isActive ? '#0A2218' : '#0C1A1E',
            border: `1px solid ${isActive ? '#5A9E8F60' : '#152228'}`,
            padding: '12px 14px 10px',
            textAlign: 'center',
            animation: isActive ? 'hz-glow 2s ease-in-out infinite' : 'none',
            transition: 'all .35s ease',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: isActive
              ? 'linear-gradient(to right, transparent, #5A9E8F, transparent)'
              : 'linear-gradient(to right, transparent, #1E3038, transparent)',
            transition: 'background .35s',
          }} />

          {/* Scanline effect when active */}
          {isActive && (
            <div
              style={{
                position: 'absolute', left: 0, right: 0, height: '40%',
                background: 'linear-gradient(to bottom, transparent, #5A9E8F08, transparent)',
                animation: 'hz-scanline 2.2s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Avatar */}
          <div
            style={{
              width: 32, height: 32, borderRadius: 6, margin: '0 auto 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11,
              background: isActive ? '#5A9E8F22' : '#0D2228',
              border: `1px solid ${isActive ? '#5A9E8F50' : '#1E3038'}`,
              color: isActive ? '#7BCCB8' : '#4A7A80',
              letterSpacing: '0.05em',
              transition: 'all .35s',
            }}
          >
            {agentInitials(node.step.agent)}
          </div>

          {/* Agent name */}
          <p style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 11,
            color: isActive ? '#C8E8E0' : '#6A9EA8',
            letterSpacing: '0.02em',
            marginBottom: 3,
            transition: 'color .35s',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={agentDisplay(node.step.agent)}>
            {agentDisplay(node.step.agent)}
          </p>

          {/* Step name */}
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5,
            color: isActive ? '#5A9E8F' : '#1E3038',
            lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            transition: 'color .35s',
          }} title={node.step.name}>
            {node.step.name}
          </p>

          {/* Typing dots */}
          {isActive && (
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="animate-typing-dot"
                  style={{
                    display: 'block', width: 3, height: 3, borderRadius: '50%',
                    background: '#5A9E8F', animationDelay: `${i * 0.18}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && (
        <div className="flex flex-col items-center">
          <FlowLine active={childActive} height={24} />
          <HBridge count={node.children.length} active={childActive} />
          <div className="flex items-start" style={{ gap: 12 }}>
            {node.children.map((child, i) => (
              <StepNode
                key={child.step.id}
                node={child}
                activeStepTeamId={activeStepTeamId}
                stagger={stagger + i + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-supervisor node ────────────────────────────────────────────────── */
function SubSupNode({
  name, steps, activeStepTeamId, stagger = 0,
}: {
  name: string;
  steps: HierarchyStep[];
  activeStepTeamId?: string | null;
  stagger?: number;
}) {
  const isAnyStepActive = steps.some(s => s.team_id === activeStepTeamId);

  return (
    <div className="flex flex-col items-center" style={{ animation: `hz-fadein .5s ease both`, animationDelay: `${stagger * 0.08}s` }}>
      {/* Sub-supervisor card */}
      <div
        style={{
          width: 160, borderRadius: 10,
          background: isAnyStepActive ? '#0A1A24' : '#0B1820',
          border: `1px solid ${isAnyStepActive ? '#5A9E8F60' : '#1A3040'}`,
          padding: '12px 14px 10px',
          textAlign: 'center',
          transition: 'all .35s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: isAnyStepActive
            ? 'linear-gradient(to right, transparent, #5A9E8F, transparent)'
            : 'linear-gradient(to right, transparent, #2A4A58, transparent)',
        }} />

        {/* Domain lead badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: '#5A9E8F12', border: '1px solid #5A9E8F30',
          borderRadius: 4, padding: '2px 8px', marginBottom: 8,
        }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#5A9E8F' }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7.5, color: '#5A9E8F', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Domain Lead
          </span>
        </div>

        <div style={{
          width: 36, height: 36, borderRadius: 7, margin: '0 auto 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 12,
          background: isAnyStepActive ? '#5A9E8F22' : '#0D2230',
          border: `1.5px solid ${isAnyStepActive ? '#5A9E8F60' : '#1E3A48'}`,
          color: isAnyStepActive ? '#7BCCB8' : '#3A7080',
          transition: 'all .35s',
        }}>
          {name.substring(0, 2).toUpperCase()}
        </div>

        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: isAnyStepActive ? '#C8E8E0' : '#4A7A80', letterSpacing: '0.02em', marginBottom: 2, transition: 'color .35s' }}>
          {name}
        </p>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#1E3A48', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Supervises · Reviews
        </p>
      </div>

      {/* Steps under this sub-supervisor */}
      {steps.length > 0 && (
        <div className="flex flex-col items-center">
          <FlowLine active={isAnyStepActive} height={20} />
          <HBridge count={steps.length} active={isAnyStepActive} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            {steps.map((step, i) => (
              <StepNode
                key={step.id}
                node={{ step, children: [], depth: 2, index: i }}
                activeStepTeamId={activeStepTeamId}
                stagger={stagger + i + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function HierarchyView({ hierarchyTeam, hierarchyMetrics, isExecuting, activeStepTeamId }: HierarchyViewProps) {
  useStyles();

  if (!hierarchyTeam) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 0' }}>
        <div style={{ position: 'relative', width: 56, height: 56 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid #5A9E8F15' }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid transparent', borderTopColor: '#5A9E8F',
            animation: 'hz-orbit 1.2s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 8, borderRadius: '50%',
            border: '1px solid transparent', borderTopColor: '#5A9E8F40',
            animation: 'hz-orbit 2s linear infinite reverse',
          }} />
        </div>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#2E4A52', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {isExecuting ? 'assembling team' : 'loading'}
        </p>
      </div>
    );
  }

  const stepTree = hierarchyTeam.stepTree ?? [];
  const subSupervisors = hierarchyTeam.subSupervisors ?? [];
  const subSupGroups = groupBySubSupervisor(stepTree, subSupervisors);
  const treeRoots = !subSupGroups && stepTree.length > 0 ? buildTree(stepTree) : [];
  const anyChildActive = !!activeStepTeamId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 32px', overflowX: 'auto', minWidth: 0 }}>

      {/* ── Supervisor ─────────────────────────────────────────────────────── */}
      <div
        style={{
          animation: 'hz-fadein .4s ease both',
          position: 'relative',
        }}
      >
        {/* Radial rays behind supervisor */}
        {isExecuting && (
          <div style={{
            position: 'absolute', inset: -40, borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, #BF8A5212 0%, transparent 65%)',
            animation: 'hz-ray 3s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        <div
          style={{
            position: 'relative', width: 240, borderRadius: 14,
            background: 'linear-gradient(160deg, #18100A 0%, #100C06 100%)',
            border: '1px solid #BF8A5240',
            padding: '20px 24px 18px',
            textAlign: 'center',
            animation: isExecuting ? 'hz-sup-glow 3s ease-in-out infinite' : 'none',
            overflow: 'hidden',
          }}
        >
          {/* Amber top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(to right, transparent, #BF8A52, #F0B060, #BF8A52, transparent)',
          }} />

          {/* Corner accents */}
          <div style={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderTop: '1px solid #BF8A5260', borderLeft: '1px solid #BF8A5260' }} />
          <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderTop: '1px solid #BF8A5260', borderRight: '1px solid #BF8A5260' }} />
          <div style={{ position: 'absolute', bottom: 6, left: 6, width: 8, height: 8, borderBottom: '1px solid #BF8A5230', borderLeft: '1px solid #BF8A5230' }} />
          <div style={{ position: 'absolute', bottom: 6, right: 6, width: 8, height: 8, borderBottom: '1px solid #BF8A5230', borderRight: '1px solid #BF8A5230' }} />

          {/* Supervisor badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#BF8A5215', border: '1px solid #BF8A5240',
            borderRadius: 4, padding: '2px 10px', marginBottom: 14,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#BF8A52', boxShadow: '0 0 6px #BF8A52' }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#BF8A52', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Supervisor
            </span>
          </div>

          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: 10,
            background: 'linear-gradient(135deg, #BF8A5225, #F0B06010)',
            border: '1.5px solid #BF8A5260',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 17,
            color: '#E8A855', letterSpacing: '0.05em',
            boxShadow: '0 0 16px #BF8A5220, inset 0 1px 0 #BF8A5230',
          }}>
            {hierarchyTeam.supervisor.substring(0, 2).toUpperCase()}
          </div>

          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: '#EAE0D0', letterSpacing: '-0.01em', marginBottom: 4 }}>
            {hierarchyTeam.supervisor}
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#6A4A28', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Orchestrates · Reviews · Approves
          </p>

          {isExecuting && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 5 }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="animate-typing-dot"
                  style={{
                    display: 'block', width: 4, height: 4, borderRadius: '50%',
                    background: '#BF8A52', animationDelay: `${i * 0.22}s`,
                    boxShadow: '0 0 4px #BF8A52',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-supervisor tier ──────────────────────────────────────────────── */}
      {subSupGroups && subSupGroups.size > 0 && (
        <>
          <FlowLine active={anyChildActive} height={32} />
          <HBridge count={subSupGroups.size} active={anyChildActive} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {Array.from(subSupGroups.entries()).map(([ssName, ssSteps], i) => (
              <div key={ssName} className="flex flex-col items-center">
                <FlowLine active={ssSteps.some(s => s.team_id === activeStepTeamId)} height={20} />
                <SubSupNode
                  name={ssName}
                  steps={ssSteps}
                  activeStepTeamId={activeStepTeamId}
                  stagger={i}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Flat step tree (no sub-supervisors) ─────────────────────────────── */}
      {!subSupGroups && treeRoots.length > 0 && (
        <>
          <FlowLine active={anyChildActive} height={32} />
          {treeRoots.length > 1 && (
            <HBridge count={treeRoots.length} active={anyChildActive} />
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {treeRoots.map((root, i) => (
              <StepNode
                key={root.step.id}
                node={root}
                activeStepTeamId={activeStepTeamId}
                stagger={i}
              />
            ))}
          </div>
        </>
      )}

      {/* Fallback flat workers */}
      {!subSupGroups && treeRoots.length === 0 && hierarchyTeam.workers.length > 0 && (
        <>
          <FlowLine active={anyChildActive} height={32} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {hierarchyTeam.workers.map((worker, idx) => (
              <div
                key={idx}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `hz-fadein .5s ease both`, animationDelay: `${idx * 0.07}s` }}
              >
                <FlowLine active={false} height={24} />
                <div style={{
                  width: 140, borderRadius: 10,
                  background: '#0C1A1E', border: '1px solid #152228',
                  padding: '12px 14px 10px', textAlign: 'center',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                    background: 'linear-gradient(to right, transparent, #1E3038, transparent)',
                  }} />
                  <div style={{
                    width: 32, height: 32, borderRadius: 6, margin: '0 auto 8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11,
                    background: '#0D2228', border: '1px solid #1E3038', color: '#4A7A80',
                  }}>
                    {worker.substring(0, 2).toUpperCase()}
                  </div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 11, color: '#6A9EA8' }}>{worker}</p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#1E3038', marginTop: 2 }}>Specialist</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Metrics ──────────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 40, display: 'flex', alignItems: 'stretch',
        border: '1px solid #0F1E24', borderRadius: 10,
        background: '#080E11', overflow: 'hidden',
        animation: 'hz-fadein .6s ease both', animationDelay: '.4s',
      }}>
        {[
          { value: hierarchyMetrics?.review_loops ?? 0, label: 'Review Loops', color: '#5A9E8F', dim: '#0F2A22' },
          { value: hierarchyMetrics?.escalations ?? 0,  label: 'Escalations',  color: '#BF8A52', dim: '#2A1A0A' },
          { value: hierarchyMetrics?.revisions ?? 0,    label: 'Revisions',    color: '#7090A8', dim: '#0F1E2A' },
        ].map((m, i) => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div style={{ width: 1, alignSelf: 'stretch', background: '#0F1E24' }} />}
            <div style={{ padding: '14px 28px', textAlign: 'center', background: m.value > 0 ? m.dim : 'transparent', transition: 'background .4s' }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 700, color: m.color, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {m.value}
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#1E3038', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {m.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Team name */}
      <div style={{
        marginTop: 12,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#1E3038', letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        {hierarchyTeam.teamName}
      </div>
    </div>
  );
}
