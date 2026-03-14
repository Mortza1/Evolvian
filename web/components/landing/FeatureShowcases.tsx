'use client';

import React, { useState, useEffect, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ShowcaseProps {
  videoSrc?: string;       // Drop your .mp4 path here when ready
  title: string;
  label: string;
  description: string;
  bullets: string[];
  accent: string;
  flip?: boolean;          // Flip text/video sides
  icon: React.ReactNode;
  windowTitle: string;
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ─── Browser-chrome video frame ───────────────────────────────────────────────
function AppFrame({
  videoSrc,
  windowTitle,
  accent,
  icon,
}: {
  videoSrc?: string;
  windowTitle: string;
  accent: string;
  icon: React.ReactNode;
}) {
  const accentRgb = accent === '#00F5FF' ? '0,245,255'
    : accent === '#A3FF12' ? '163,255,18'
    : accent === '#FFB800' ? '255,184,0'
    : accent === '#5A9E8F' ? '90,158,143'
    : '90,158,143';

  return (
    <div style={{
      borderRadius: 16,
      overflow: 'hidden',
      border: `1px solid rgba(${accentRgb},0.18)`,
      background: '#0A0D12',
      boxShadow: `0 0 60px rgba(${accentRgb},0.08), 0 32px 64px rgba(0,0,0,0.5)`,
      position: 'relative',
    }}>
      {/* Title bar */}
      <div style={{
        height: 40,
        background: 'rgba(22,27,34,0.95)',
        borderBottom: `1px solid rgba(${accentRgb},0.1)`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
      }}>
        {['#FF5F57', '#FFBD2E', '#28CA42'].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
        ))}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ opacity: 0.5 }}>{icon}</div>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11, color: '#4A5568',
            letterSpacing: '0.04em',
          }}>
            {windowTitle}
          </span>
        </div>
        <div style={{ width: 48 }} />
      </div>

      {/* Content: video or placeholder */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0A0D12' }}>
        {videoSrc ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          >
            <source src={videoSrc} />
          </video>
        ) : (
          <PlaceholderFrame accent={accent} accentRgb={accentRgb} windowTitle={windowTitle} icon={icon} />
        )}
      </div>
    </div>
  );
}

// ─── Placeholder when no video yet ───────────────────────────────────────────
function PlaceholderFrame({
  accent,
  accentRgb,
  windowTitle,
  icon,
}: {
  accent: string;
  accentRgb: string;
  windowTitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      minHeight: 300,
    }}>
      {/* Animated grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(${accentRgb},0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(${accentRgb},0.04) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        animation: 'gridDrift 20s linear infinite',
      }} />

      {/* Center glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 320, height: 320,
        background: `radial-gradient(circle, rgba(${accentRgb},0.07) 0%, transparent 70%)`,
      }} />

      {/* Icon */}
      <div style={{
        width: 64, height: 64, borderRadius: 16, marginBottom: 20,
        background: `rgba(${accentRgb},0.08)`,
        border: `1px solid rgba(${accentRgb},0.25)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        boxShadow: `0 0 30px rgba(${accentRgb},0.12)`,
      }}>
        {icon}
        {/* Pulse ring */}
        <div style={{
          position: 'absolute', inset: -8, borderRadius: 24,
          border: `1px solid rgba(${accentRgb},0.2)`,
          animation: 'pulseExpand 2.5s ease-out infinite',
        }} />
      </div>

      <div style={{
        fontFamily: "'Bebas Neue', cursive",
        fontSize: 18, letterSpacing: '0.08em',
        color: accent, marginBottom: 10,
      }}>
        {windowTitle}
      </div>

      {/* Recording badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        border: `1px solid rgba(${accentRgb},0.2)`,
        borderRadius: 100, padding: '6px 14px',
        background: `rgba(${accentRgb},0.05)`,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: accent,
          animation: 'placeholderPulse 1.5s ease-in-out infinite',
        }} />
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11, color: accent, opacity: 0.7,
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Recording Coming
        </span>
      </div>

      {/* Scanline */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, rgba(${accentRgb},0.3), transparent)`,
        animation: 'scanDown 4s linear infinite',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─── Single feature showcase ──────────────────────────────────────────────────
function FeatureShowcase({
  videoSrc, title, label, description, bullets,
  accent, flip = false, icon, windowTitle,
}: ShowcaseProps) {
  const { ref, visible } = useReveal();

  const textBlock = (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: flip ? '0 0 0 60px' : '0 60px 0 0',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        marginBottom: 20,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `rgba(${accent === '#00F5FF' ? '0,245,255' : accent === '#A3FF12' ? '163,255,18' : accent === '#FFB800' ? '255,184,0' : '90,158,143'},0.1)`,
          border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11, letterSpacing: '0.18em',
          color: accent, textTransform: 'uppercase', fontWeight: 600,
        }}>
          {label}
        </span>
      </div>

      <h3 style={{
        fontFamily: "'Bebas Neue', cursive",
        fontSize: 'clamp(36px, 3.5vw, 52px)',
        letterSpacing: '0.02em', lineHeight: 1.05,
        color: '#E2E8F0', marginBottom: 20,
      }}>
        {title}
      </h3>

      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 15, color: '#4A5568',
        lineHeight: 1.8, marginBottom: 28, maxWidth: 400,
      }}>
        {description}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bullets.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
              background: `${accent}12`,
              border: `1px solid ${accent}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3L3 5L7 1" stroke={accent} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, color: '#64748B', lineHeight: 1.6,
            }}>
              {b}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const videoBlock = (
    <AppFrame videoSrc={videoSrc} windowTitle={windowTitle} accent={accent} icon={icon} />
  );

  return (
    <div ref={ref} style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 0,
      alignItems: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(36px)',
      transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
      padding: '80px 0',
      position: 'relative',
    }}>
      {/* Accent line on the side */}
      <div style={{
        position: 'absolute',
        [flip ? 'right' : 'left']: 0,
        top: '50%', transform: 'translateY(-50%)',
        width: 2, height: '40%',
        background: `linear-gradient(to bottom, transparent, ${accent}40, transparent)`,
      }} />

      {flip ? (
        <>{videoBlock}{textBlock}</>
      ) : (
        <>{textBlock}{videoBlock}</>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const icons = {
  agents: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3.5" stroke="#00F5FF" strokeWidth="1.3"/>
      <path d="M4 17C4 13.686 6.686 11 10 11C13.314 11 16 13.686 16 17" stroke="#00F5FF" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="4" cy="8" r="2" stroke="#00F5FF" strokeWidth="1" opacity="0.5"/>
      <circle cx="16" cy="8" r="2" stroke="#00F5FF" strokeWidth="1" opacity="0.5"/>
    </svg>
  ),
  tools: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M10 3L17 7V13L10 17L3 13V7L10 3Z" stroke="#A3FF12" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="2.5" stroke="#A3FF12" strokeWidth="1.2"/>
    </svg>
  ),
  inbox: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M3 5H17V14C17 14.552 16.552 15 16 15H4C3.448 15 3 14.552 3 14V5Z" stroke="#FFB800" strokeWidth="1.3"/>
      <path d="M3 5L10 11L17 5" stroke="#FFB800" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  vault: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M4 4H12L16 8V16H4V4Z" stroke="#5A9E8F" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M12 4V8H16" stroke="#5A9E8F" strokeWidth="1.3" strokeLinejoin="round"/>
      <line x1="7" y1="11" x2="13" y2="11" stroke="#5A9E8F" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
      <line x1="7" y1="13.5" x2="11" y2="13.5" stroke="#5A9E8F" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
  graph: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="5" r="2.5" stroke="#00F5FF" strokeWidth="1.2"/>
      <circle cx="4" cy="15" r="2" stroke="#00F5FF" strokeWidth="1.2" opacity="0.7"/>
      <circle cx="16" cy="15" r="2" stroke="#00F5FF" strokeWidth="1.2" opacity="0.7"/>
      <circle cx="10" cy="13" r="2" stroke="#00F5FF" strokeWidth="1.2" opacity="0.5"/>
      <line x1="10" y1="7.5" x2="10" y2="11" stroke="#00F5FF" strokeWidth="1" opacity="0.5"/>
      <line x1="9" y1="13" x2="5.5" y2="14" stroke="#00F5FF" strokeWidth="1" opacity="0.4"/>
      <line x1="11" y1="13" x2="14.5" y2="14" stroke="#00F5FF" strokeWidth="1" opacity="0.4"/>
    </svg>
  ),
  hierarchy: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <rect x="8" y="2" width="4" height="3" rx="1" stroke="#A3FF12" strokeWidth="1.2"/>
      <rect x="2" y="12" width="4" height="3" rx="1" stroke="#A3FF12" strokeWidth="1.2" opacity="0.7"/>
      <rect x="8" y="12" width="4" height="3" rx="1" stroke="#A3FF12" strokeWidth="1.2" opacity="0.7"/>
      <rect x="14" y="12" width="4" height="3" rx="1" stroke="#A3FF12" strokeWidth="1.2" opacity="0.7"/>
      <line x1="10" y1="5" x2="10" y2="8.5" stroke="#A3FF12" strokeWidth="1.1"/>
      <line x1="4" y1="8.5" x2="16" y2="8.5" stroke="#A3FF12" strokeWidth="1.1"/>
      <line x1="4" y1="8.5" x2="4" y2="12" stroke="#A3FF12" strokeWidth="1.1" opacity="0.7"/>
      <line x1="10" y1="8.5" x2="10" y2="12" stroke="#A3FF12" strokeWidth="1.1" opacity="0.7"/>
      <line x1="16" y1="8.5" x2="16" y2="12" stroke="#A3FF12" strokeWidth="1.1" opacity="0.7"/>
    </svg>
  ),
};

// ─── Feature data ─────────────────────────────────────────────────────────────
const FEATURES: ShowcaseProps[] = [
  {
    label: 'Agent Marketplace',
    windowTitle: 'Evolvian — Agent Marketplace',
    title: 'Deploy Any Agent\nIn Seconds',
    description: 'Browse hundreds of pre-trained specialist agents — writers, developers, designers, analysts, managers. Install one click. Assign to any team instantly.',
    bullets: [
      'Role templates for every function: marketing, engineering, ops, finance',
      'Each agent comes with skills, tools, and an evolving knowledge profile',
      'Build custom agents with specific instructions and capabilities',
      'Agent ratings and performance metrics from real team deployments',
    ],
    accent: '#00F5FF',
    icon: icons.agents,
    flip: false,
    videoSrc: '/videos/agent_marketplace.mp4',
  },
  {
    label: 'Tool Marketplace',
    windowTitle: 'Evolvian — Tool Marketplace',
    title: 'Every Tool\nYour Team Needs',
    description: 'Equip agents with the exact tools for their job — web search, code execution, image generation, email, calendar, databases. Pay per use, not per seat.',
    bullets: [
      'Web search, file read/write, code execution built in',
      'Connect to Slack, Gmail, Notion, GitHub, databases and more',
      'Per-call pricing — agents only spend when they need to',
      'Custom tools via API — wrap any internal system',
    ],
    accent: '#A3FF12',
    icon: icons.tools,
    flip: true,
    videoSrc: '/videos/tools.mp4',
  },
  {
    label: 'Team Inbox',
    windowTitle: 'Evolvian — Inbox',
    title: 'Chat With Every\nAgent on Your Team',
    description: "Each agent has its own thread. Ask your Developer for a code review. Get a status update from your Analyst. Let Evo brief you on everything at once.",
    bullets: [
      'Dedicated chat thread per agent — no confusion, no context loss',
      'Evo surfaces blockers, completions, and decisions proactively',
      'Full message history and file attachments per conversation',
      'React to outputs, request revisions, approve deliverables inline',
    ],
    accent: '#FFB800',
    icon: icons.inbox,
    flip: false,
    videoSrc: '/videos/inbox.mp4',
  },
  {
    label: 'Neural Vault',
    windowTitle: 'Evolvian — Neural Vault',
    title: 'Every File Your\nTeam Ever Created',
    description: 'Agents save all their work to a shared internal file system — organised by project, team, and date. Every draft, asset, report, and dataset, always accessible.',
    bullets: [
      'Structured folders per team and project, auto-organised by agents',
      'Preview any file in the vault — markdown, images, data, code',
      'Version history on every file agents modify',
      'Reference past work in future tasks for compounding quality',
    ],
    accent: '#5A9E8F',
    icon: icons.vault,
    flip: true,
    videoSrc: '/videos/vault.mp4',
  },
  {
    label: 'Knowledge Graph',
    windowTitle: 'Evolvian — Knowledge Graph',
    title: 'A Living Brain\nFor Your Team',
    description: 'Every task builds the team\'s knowledge graph — concepts, entities, relationships, and insights connected automatically. The longer you run, the smarter they get.',
    bullets: [
      'Knowledge extracted from every completed task automatically',
      'Agents query the graph before starting — no repeated research',
      'Visual exploration of what your team knows and how it connects',
      'Evolution algorithms improve over the knowledge base each week',
    ],
    accent: '#00F5FF',
    icon: icons.graph,
    flip: false,
    videoSrc: '/videos/graph.mp4',
  },
  {
    label: 'Job Board',
    windowTitle: 'Evolvian — Job Board',
    title: 'Manage Every Task\nAcross Your Team.',
    description: 'See every job your agents are running — queued, in progress, completed, failed. Assign new tasks, set priorities, and track output all from one place.',
    bullets: [
      'Real-time status on every task across all agents',
      'Assign jobs manually or let Evo delegate automatically',
      'Filter by agent, status, or project — nothing slips through',
      'Retry failed tasks, review outputs, and approve completions inline',
    ],
    accent: '#A3FF12',
    icon: icons.hierarchy,
    flip: true,
    videoSrc: '/videos/job_board.mp4',
  },
];

// ─── Divider between features ─────────────────────────────────────────────────
function FeatureDivider({ accent }: { accent: string }) {
  return (
    <div style={{
      height: 1,
      background: `linear-gradient(90deg, transparent, ${accent}20, ${accent}40, ${accent}20, transparent)`,
      margin: '0 80px',
    }} />
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FeaturesFlow() {
  return (
    <section style={{ padding: '60px 0 0' }}>
      <style>{`
        @keyframes gridDrift {
          from { background-position: 0 0; }
          to   { background-position: 40px 40px; }
        }
        @keyframes scanDown {
          0%   { top: 0; }
          100% { top: 100%; }
        }
        @keyframes pulseExpand {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes placeholderPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>

      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 48px' }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11, letterSpacing: '0.2em',
          color: '#5A9E8F', textTransform: 'uppercase',
        }}>
          The Full Platform
        </span>
        <h2 style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 'clamp(40px, 5vw, 64px)',
          letterSpacing: '0.03em', color: '#E2E8F0',
          marginTop: 12, marginBottom: 16,
        }}>
          Everything Your Workforce Needs
        </h2>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16, color: '#4A5568',
          maxWidth: 500, margin: '0 auto',
        }}>
          Six interconnected systems. One platform.
        </p>
      </div>

      {/* Feature rows */}
      <div style={{ padding: '0 80px' }}>
        {FEATURES.map((feature, i) => (
          <React.Fragment key={i}>
            <FeatureShowcase {...feature} />
            {i < FEATURES.length - 1 && <FeatureDivider accent={feature.accent} />}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
