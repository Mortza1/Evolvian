'use client';

import React, { useState, useEffect, useRef } from 'react';
import FeaturesFlow from './FeatureShowcases';

interface LandingPageProps {
  onGetStarted: () => void;
}

// ─── Animated network canvas ────────────────────────────────────────────────
function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const NODE_COUNT = 55;
    type Node = { x: number; y: number; vx: number; vy: number; r: number; pulse: number; phase: number };
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.8,
      pulse: 0,
      phase: Math.random() * Math.PI * 2,
    }));

    const CONNECT_DIST = 160;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse = Math.sin(t / 1200 + n.phase) * 0.5 + 0.5;
      }

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const alpha = (1 - d / CONNECT_DIST) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(90,158,143,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6);
        glow.addColorStop(0, `rgba(0,245,255,${0.25 * n.pulse})`);
        glow.addColorStop(1, 'rgba(0,245,255,0)');
        ctx.beginPath();
        ctx.fillStyle = glow;
        ctx.arc(n.x, n.y, n.r * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(0,245,255,${0.5 + 0.5 * n.pulse})`;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, opacity: 0.55, pointerEvents: 'none' }}
    />
  );
}

// ─── Infinite marquee ────────────────────────────────────────────────────────
function Marquee({ items, reverse = false, speed = 35 }: { items: string[]; reverse?: boolean; speed?: number }) {
  const duration = items.length * speed / 10;
  return (
    <div style={{ overflow: 'hidden', width: '100%', position: 'relative' }}>
      <div style={{
        display: 'flex', gap: 16,
        animation: `marquee${reverse ? 'Rev' : ''} ${duration}s linear infinite`,
        width: 'max-content',
      }}>
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 20px',
            border: '1px solid rgba(90,158,143,0.25)',
            borderRadius: 100,
            background: 'rgba(90,158,143,0.06)',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: '#94A3B8',
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
          }}>
            <span style={{ color: '#5A9E8F', fontSize: 8 }}>◆</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Step card ───────────────────────────────────────────────────────────────
function StepCard({ n, title, desc, color, borderLeft, delay }: { n: string; title: string; desc: string; color: string; borderLeft: boolean; delay: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      padding: '44px 36px',
      background: 'rgba(22,27,34,0.6)', backdropFilter: 'blur(12px)',
      borderTop: `2px solid ${color}`,
      borderLeft: borderLeft ? '1px solid rgba(90,158,143,0.08)' : 'none',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)',
      transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, color, opacity: 0.2, lineHeight: 1, marginBottom: 16 }}>{n}</div>
      <h3 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: '0.05em', color: '#E2E8F0', marginBottom: 12 }}>{title}</h3>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4A5568', lineHeight: 1.8 }}>{desc}</p>
    </div>
  );
}

// ─── Why card ────────────────────────────────────────────────────────────────
function WhyCard({ icon, title, desc, accent, delay }: { icon: React.ReactNode; title: string; desc: string; accent: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  const [hov, setHov] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '40px 32px', borderRadius: 20,
        background: hov ? 'rgba(22,27,34,0.9)' : 'rgba(22,27,34,0.5)',
        border: `1px solid ${hov ? accent + '50' : accent + '15'}`,
        backdropFilter: 'blur(12px)',
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        boxShadow: hov ? `0 20px 50px ${accent}12` : 'none',
        cursor: 'default',
      }}>
      <div style={{ marginBottom: 20 }}>{icon}</div>
      <h3 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: '0.04em', color: '#E2E8F0', marginBottom: 12 }}>{title}</h3>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4A5568', lineHeight: 1.8 }}>{desc}</p>
    </div>
  );
}

// ─── Feature card ────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent, delay }: {
  icon: React.ReactNode; title: string; desc: string; accent: string; delay: number;
}) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(22,27,34,0.95)' : 'rgba(22,27,34,0.6)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${hovered ? accent + '60' : accent + '18'}`,
        borderRadius: 20,
        padding: '40px 36px',
        transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transitionDelay: `${delay}ms`,
        boxShadow: hovered ? `0 20px 60px ${accent}15, 0 0 0 1px ${accent}20` : 'none',
        cursor: 'default',
      }}
    >
      <div style={{
        width: 52, height: 52, marginBottom: 24,
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: "'Bebas Neue', cursive",
        fontSize: 26, letterSpacing: '0.03em', color: '#E2E8F0',
        marginBottom: 12, lineHeight: 1,
      }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.8, margin: 0 }}>{desc}</p>
      <div style={{
        marginTop: 28, height: 2, borderRadius: 1,
        background: `linear-gradient(90deg, ${accent}, transparent)`,
        width: hovered ? '100%' : '30%',
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedWord({ word, delay = 0 }: { word: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <span ref={ref} style={{
      display: 'inline-block',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(30px)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>{word}</span>
  );
}

// ─── Testimonial card ────────────────────────────────────────────────────────
function TestimonialCard({ quote, name, role, delay }: { quote: string; name: string; role: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      background: 'rgba(22,27,34,0.7)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(90,158,143,0.18)', borderRadius: 20, padding: '36px 32px',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
      transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      <div style={{ fontSize: 40, color: '#5A9E8F', opacity: 0.5, lineHeight: 1, marginBottom: 16, fontFamily: 'Georgia, serif' }}>"</div>
      <p style={{ fontSize: 15, color: '#94A3B8', lineHeight: 1.8, marginBottom: 24, fontFamily: "'DM Sans', sans-serif" }}>{quote}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #5A9E8F, #3D7A6E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
          {name[0]}
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{name}</div>
          <div style={{ fontSize: 11, color: '#4A5568', fontFamily: "'DM Sans', sans-serif" }}>{role}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Typewriter text ─────────────────────────────────────────────────────────
function Typewriter({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); onDone?.(); }
    }, 22);
    return () => clearInterval(iv);
  }, [text]);
  return <span>{displayed}<span style={{ opacity: displayed.length < text.length ? 1 : 0, borderRight: '2px solid #00F5FF', marginLeft: 1, animation: 'cursorBlink 0.7s step-end infinite' }}>&nbsp;</span></span>;
}

// ─── Animated org-chart demo ─────────────────────────────────────────────────
type AgentStatus = 'idle' | 'working' | 'done';

const AGENTS = [
  { id: 'manager', label: 'Campaign\nManager',  role: 'Supervisor',  color: '#00F5FF', x: 200, y: 148 },
  { id: 'writer',  label: 'Content\nWriter',    role: 'Writer',      color: '#A3FF12', x: 52,  y: 272 },
  { id: 'designer',label: 'Visual\nDesigner',   role: 'Designer',    color: '#FFB800', x: 148, y: 310 },
  { id: 'analyst', label: 'Data\nAnalyst',      role: 'Analyst',     color: '#5A9E8F', x: 248, y: 310 },
  { id: 'sched',   label: 'Social\nScheduler',  role: 'Scheduler',   color: '#A3FF12', x: 344, y: 272 },
] as const;

type AgentId = typeof AGENTS[number]['id'];

const DEMO_SCRIPT = [
  { at: 400,   type: 'user',     text: 'Launch our Q4 marketing campaign' },
  { at: 2000,  type: 'evo',      text: 'Analysing brief. Assembling your campaign team…' },
  { at: 3200,  type: 'node',     node: 'manager',  text: '✦ Campaign Manager — deployed' },
  { at: 4000,  type: 'node',     node: 'writer',   text: '✦ Content Writer — deployed' },
  { at: 4600,  type: 'node',     node: 'designer', text: '✦ Visual Designer — deployed' },
  { at: 5200,  type: 'node',     node: 'analyst',  text: '✦ Data Analyst — deployed' },
  { at: 5800,  type: 'node',     node: 'sched',    text: '✦ Social Scheduler — deployed' },
  { at: 6800,  type: 'evo',      text: 'Team live. Campaign Manager is coordinating.' },
  { at: 8200,  type: 'activity', node: 'writer',   text: 'Content Writer → 3 blog posts drafted' },
  { at: 9600,  type: 'activity', node: 'designer', text: 'Visual Designer → Hero assets generated' },
  { at: 11000, type: 'activity', node: 'analyst',  text: 'Data Analyst → Audience segments mapped' },
  { at: 12200, type: 'activity', node: 'sched',    text: 'Social Scheduler → 14 posts queued' },
  { at: 13400, type: 'activity', node: 'manager',  text: 'Campaign Manager → Quality review passed' },
  { at: 14600, type: 'evo',      text: 'Campaign complete. 47 assets delivered. All reviewed.' },
];

function AnimatedDemo() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: number; type: string; text: string }>>([]);
  const [visibleNodes, setVisibleNodes] = useState<Set<AgentId>>(new Set());
  const [nodeStatus, setNodeStatus] = useState<Record<AgentId, AgentStatus>>({} as Record<AgentId, AgentStatus>);
  const [activities, setActivities] = useState<Array<{ id: number; text: string; nodeId: AgentId }>>([]);
  const [lineProgress, setLineProgress] = useState<Record<AgentId, number>>({} as Record<AgentId, number>);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => timers.current.forEach(clearTimeout);

  const run = () => {
    clearAll();
    setMessages([]);
    setVisibleNodes(new Set());
    setNodeStatus({} as Record<AgentId, AgentStatus>);
    setActivities([]);
    setLineProgress({} as Record<AgentId, number>);

    let msgId = 0;
    for (const ev of DEMO_SCRIPT) {
      const t = setTimeout(() => {
        if (ev.type === 'user' || ev.type === 'evo') {
          setMessages(prev => [...prev, { id: msgId++, type: ev.type, text: ev.text! }]);
          setTimeout(() => {
            if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
          }, 50);
        } else if (ev.type === 'node' && ev.node) {
          const nodeId = ev.node as AgentId;
          setMessages(prev => [...prev, { id: msgId++, type: 'system', text: ev.text! }]);
          setVisibleNodes(prev => new Set([...prev, nodeId]));
          setNodeStatus(prev => ({ ...prev, [nodeId]: 'working' }));
          // Animate line
          let p = 0;
          const li = setInterval(() => {
            p = Math.min(p + 8, 100);
            setLineProgress(prev => ({ ...prev, [nodeId]: p }));
            if (p >= 100) clearInterval(li);
          }, 16);
          timers.current.push(li as unknown as ReturnType<typeof setTimeout>);
          setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
        } else if (ev.type === 'activity' && ev.node) {
          const nodeId = ev.node as AgentId;
          setActivities(prev => [...prev.slice(-5), { id: msgId++, text: ev.text!, nodeId }]);
          setNodeStatus(prev => ({ ...prev, [nodeId]: 'done' }));
        }
      }, ev.at);
      timers.current.push(t);
    }
    // Loop
    const loop = setTimeout(run, 17500);
    timers.current.push(loop);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { setStarted(true); run(); }
    }, { threshold: 0.25 });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => { obs.disconnect(); clearAll(); };
  }, [started]);

  const agentMap = Object.fromEntries(AGENTS.map(a => [a.id, a])) as Record<AgentId, typeof AGENTS[number]>;
  const EVO_X = 200, EVO_Y = 52;

  return (
    <div ref={containerRef} style={{
      background: 'rgba(10,13,18,0.95)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,245,255,0.12)', borderRadius: 24,
      overflow: 'hidden', maxWidth: 1100, margin: '0 auto',
      boxShadow: '0 0 80px rgba(0,245,255,0.05), 0 40px 80px rgba(0,0,0,0.5)',
    }}>
      {/* Title bar */}
      <div style={{
        height: 44, background: 'rgba(22,27,34,0.8)',
        borderBottom: '1px solid rgba(0,245,255,0.08)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8,
      }}>
        {['#FF5F57','#FFBD2E','#28CA42'].map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.8 }} />
        ))}
        <div style={{ flex: 1, textAlign: 'center', fontFamily: "'DM Sans', monospace", fontSize: 12, color: '#2D3748', letterSpacing: '0.05em' }}>
          EVOLVIAN — LIVE TEAM EXECUTION
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A3FF12', boxShadow: '0 0 6px #A3FF12', animation: 'cursorBlink 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#A3FF12', letterSpacing: '0.1em' }}>LIVE</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 440 }}>
        {/* ─ Left: Chat panel ─ */}
        <div style={{ borderRight: '1px solid rgba(0,245,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,245,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#5A9E8F,#00F5FF30)', border: '1px solid #5A9E8F50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 14, color: '#00F5FF' }}>E</span>
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#5A9E8F', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Evo — AI Manager</span>
          </div>
          <div ref={chatRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, scrollBehavior: 'smooth' }}>
            {messages.length === 0 && (
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#1E293B', textAlign: 'center', marginTop: 40 }}>Waiting for task…</div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex', flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                gap: 8, animation: 'msgAppear 0.3s ease',
              }}>
                {msg.type !== 'system' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0, marginTop: 2,
                    background: msg.type === 'user' ? 'rgba(90,158,143,0.2)' : 'linear-gradient(135deg,#5A9E8F,#00F5FF40)',
                    border: `1px solid ${msg.type === 'user' ? '#5A9E8F40' : '#5A9E8F60'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: msg.type === 'user' ? '#5A9E8F' : '#00F5FF',
                    fontFamily: "'Bebas Neue', cursive",
                  }}>
                    {msg.type === 'user' ? 'U' : 'E'}
                  </div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: msg.type === 'system' ? '4px 10px' : '9px 13px',
                  borderRadius: msg.type === 'user' ? '12px 12px 2px 12px' : msg.type === 'system' ? '6px' : '12px 12px 12px 2px',
                  background: msg.type === 'user' ? 'rgba(90,158,143,0.12)' : msg.type === 'system' ? 'rgba(163,255,18,0.05)' : 'rgba(22,27,34,0.9)',
                  border: `1px solid ${msg.type === 'user' ? 'rgba(90,158,143,0.2)' : msg.type === 'system' ? 'rgba(163,255,18,0.15)' : 'rgba(0,245,255,0.08)'}`,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: msg.type === 'system' ? 11 : 13,
                  color: msg.type === 'user' ? '#94A3B8' : msg.type === 'system' ? '#A3FF12' : '#E2E8F0',
                  lineHeight: 1.6,
                  marginLeft: msg.type === 'system' ? 34 : 0,
                }}>
                  {msg.type === 'evo'
                    ? <Typewriter key={msg.id} text={msg.text} />
                    : msg.text}
                </div>
              </div>
            ))}
          </div>
          {/* Input stub */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,245,255,0.06)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, height: 34, borderRadius: 8, background: 'rgba(22,27,34,0.6)', border: '1px solid rgba(90,158,143,0.15)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#1E293B' }}>Message Evo…</span>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#5A9E8F,#3D7A6E)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L12 7M8 3L12 7L8 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        {/* ─ Right: Org chart + activity ─ */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,245,255,0.06)' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#5A9E8F', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Live Team — Org Chart</span>
          </div>

          {/* SVG org chart */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <svg width="100%" viewBox="0 0 400 360" style={{ overflow: 'visible', position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <defs>
                <filter id="glow-cyan"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="glow-lime"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>

              {/* ── Connection lines ── */}
              {/* Evo → Manager */}
              {visibleNodes.has('manager') && (
                <line x1={EVO_X} y1={EVO_Y + 28} x2={agentMap['manager'].x} y2={agentMap['manager'].y - 26}
                  stroke="#00F5FF" strokeWidth="1" strokeDasharray="4 3" opacity={0.35}
                  style={{ animation: 'fadeIn 0.4s ease' }}
                />
              )}
              {/* Manager → sub-agents */}
              {(['writer','designer','analyst','sched'] as AgentId[]).map(id => visibleNodes.has(id) && (
                <line key={id}
                  x1={agentMap['manager'].x} y1={agentMap['manager'].y + 26}
                  x2={agentMap[id].x} y2={agentMap[id].y - 22}
                  stroke={agentMap[id].color} strokeWidth="1" strokeDasharray="3 3"
                  opacity={(lineProgress[id] || 0) / 100 * 0.4}
                  strokeDashoffset={0}
                  style={{ transition: 'opacity 0.6s' }}
                />
              ))}

              {/* ── Evo central node ── */}
              <g transform={`translate(${EVO_X},${EVO_Y})`} filter="url(#glow-cyan)">
                <circle r="26" fill="rgba(0,245,255,0.06)" stroke="#00F5FF" strokeWidth="1.5"/>
                <circle r="18" fill="rgba(0,245,255,0.1)" stroke="#00F5FF" strokeWidth="1" opacity="0.6"/>
                <text textAnchor="middle" y="-5" fill="#00F5FF" fontFamily="'Bebas Neue', cursive" fontSize="13" letterSpacing="0.1em">EVO</text>
                <text textAnchor="middle" y="8" fill="rgba(0,245,255,0.5)" fontFamily="'DM Sans', sans-serif" fontSize="9">AI Manager</text>
                <circle r="3" cy={26} fill="#00F5FF" opacity="0.7"/>
              </g>

              {/* ── Agent nodes ── */}
              {AGENTS.map(agent => {
                const show = visibleNodes.has(agent.id);
                const status = nodeStatus[agent.id] || 'idle';
                const lines = agent.label.split('\n');
                return (
                  <g key={agent.id} transform={`translate(${agent.x},${agent.y})`}
                    style={{ opacity: show ? 1 : 0, transition: 'opacity 0.5s', cursor: 'default' }}>
                    {/* Pulse ring when working */}
                    {status === 'working' && (
                      <circle r="30" fill="none" stroke={agent.color} strokeWidth="1" opacity="0.2"
                        style={{ animation: 'pulseRing 1.5s ease-out infinite' }}/>
                    )}
                    <circle r="22" fill={`rgba(${agent.color === '#A3FF12' ? '163,255,18' : agent.color === '#00F5FF' ? '0,245,255' : agent.color === '#FFB800' ? '255,184,0' : '90,158,143'},0.08)`}
                      stroke={agent.color} strokeWidth={status === 'done' ? '2' : '1.2'}
                      opacity={status === 'idle' ? 0.4 : 1}/>
                    {/* Status indicator */}
                    {status === 'done' && (
                      <g transform="translate(14,-14)">
                        <circle r="7" fill="#0B0E14" stroke="#A3FF12" strokeWidth="1.2"/>
                        <path d="M-3,0 L-1,2 L3,-2" stroke="#A3FF12" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </g>
                    )}
                    {status === 'working' && (
                      <g transform="translate(14,-14)">
                        <circle r="5" fill="#0B0E14" stroke={agent.color} strokeWidth="1.2"/>
                        <circle r="2" fill={agent.color} style={{ animation: 'cursorBlink 1s ease-in-out infinite' }}/>
                      </g>
                    )}
                    <text textAnchor="middle" y={lines.length > 1 ? -4 : 2}
                      fill={agent.color} fontFamily="'DM Sans', sans-serif"
                      fontSize="8.5" fontWeight="600">{lines[0]}</text>
                    {lines[1] && (
                      <text textAnchor="middle" y="7"
                        fill={agent.color} fontFamily="'DM Sans', sans-serif"
                        fontSize="8.5" fontWeight="600" opacity="0.8">{lines[1]}</text>
                    )}
                    <text textAnchor="middle" y="18"
                      fill="rgba(148,163,184,0.5)" fontFamily="'DM Sans', sans-serif"
                      fontSize="7.5">{agent.role}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Activity feed */}
          <div style={{ borderTop: '1px solid rgba(0,245,255,0.06)', padding: '12px 20px', minHeight: 130 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#2D3748', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10, fontWeight: 600 }}>
              Activity Feed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activities.length === 0 && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#1E293B' }}>Waiting for agents…</div>
              )}
              {activities.map((a) => {
                const agentData = AGENTS.find(ag => ag.id === a.nodeId);
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'msgAppear 0.3s ease' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: agentData?.color || '#5A9E8F', flexShrink: 0, boxShadow: `0 0 6px ${agentData?.color || '#5A9E8F'}` }} />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#64748B' }}>{a.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── "Replaces" visual strip ──────────────────────────────────────────────────
function RoadmapCard({ quarter, status, title, items, accent, align }: {
  quarter: string; status: string; title: string; items: string[]; accent: string; align: 'left' | 'right';
}) {
  const statusLabel = status === 'live' ? 'Live' : status === 'building' ? 'In Progress' : 'Planned';
  const statusColor = status === 'live' ? '#A3FF12' : status === 'building' ? '#00F5FF' : '#4A5568';
  return (
    <div style={{
      background: 'rgba(22,27,34,0.5)', backdropFilter: 'blur(12px)',
      border: `1px solid ${accent}18`, borderRadius: 14,
      padding: '24px 28px',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, justifyContent: align === 'right' ? 'flex-start' : 'flex-end' }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#4A5568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{quarter}</span>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: statusColor,
          border: `1px solid ${statusColor}30`, borderRadius: 100, padding: '2px 8px',
          background: `${statusColor}10`,
        }}>{statusLabel}</span>
      </div>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: '0.04em', color: '#E2E8F0', marginBottom: 14, textAlign: align }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: align === 'right' ? 'flex-start' : 'flex-end' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: align === 'right' ? 'row' : 'row-reverse' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, opacity: 0.5, flexShrink: 0 }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#64748B' }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReplacesStrip() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const replacements = [
    { from: 'Marketing Team',      to: 'Marketing Agents',   color: '#00F5FF' },
    { from: 'Content Department',  to: 'Content Squad',      color: '#A3FF12' },
    { from: 'Dev Team',            to: 'Engineering Agents', color: '#5A9E8F' },
    { from: 'Design Studio',       to: 'Design Collective',  color: '#FFB800' },
    { from: 'Sales Force',         to: 'Revenue Agents',     color: '#00F5FF' },
    { from: 'Support Centre',      to: 'Support Collective', color: '#A3FF12' },
  ];

  return (
    <div ref={ref} style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        {replacements.map((r, i) => (
          <div key={i} style={{
            padding: '28px 32px',
            background: 'rgba(22,27,34,0.4)',
            border: '1px solid rgba(90,158,143,0.08)',
            borderRadius: i === 0 ? '16px 0 0 0' : i === 2 ? '0 16px 0 0' : i === 3 ? '0 0 0 16px' : i === 5 ? '0 0 16px 0' : '0',
            opacity: visible ? 1 : 0,
            transition: `opacity 0.5s ease ${i * 80}ms`,
          }}>
            {/* Old name — strikethrough animates in */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2D3748',
                textDecoration: visible ? 'line-through' : 'none',
                transition: `text-decoration 0.1s ease ${i * 80 + 400}ms`,
              }}>{r.from}</span>
            </div>
            {/* Arrow + new name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                <path d="M0 5H13M10 2L13 5L10 8" stroke={r.color} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span style={{
                fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: '0.04em', color: r.color,
                opacity: visible ? 1 : 0,
                transition: `opacity 0.4s ease ${i * 80 + 600}ms`,
              }}>{r.to}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => { clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const row1 = ['Content Creation', 'Image Generation', 'Social Media', 'Write Blog Posts', 'Email Campaigns', 'Script Videos', 'Branding Visuals', 'Video Generation'];
  const row2 = ['Automate Workflows', 'Weekly Planning', 'Build Chatbots', 'Customer Support', 'Voice Assistants', 'Meme Generation', 'Presentations', 'Calendar Optimization'];

  const EvoIcon = () => (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="8" stroke="#00F5FF" strokeWidth="1.5"/>
      <circle cx="18" cy="18" r="3" fill="#00F5FF" opacity="0.7"/>
      <line x1="18" y1="4" x2="18" y2="10" stroke="#00F5FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="18" y1="26" x2="18" y2="32" stroke="#00F5FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="4" y1="18" x2="10" y2="18" stroke="#00F5FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="26" y1="18" x2="32" y2="18" stroke="#00F5FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="8.5" y1="8.5" x2="12.8" y2="12.8" stroke="#00F5FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      <line x1="23.2" y1="23.2" x2="27.5" y2="27.5" stroke="#00F5FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      <line x1="27.5" y1="8.5" x2="23.2" y2="12.8" stroke="#00F5FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      <line x1="12.8" y1="23.2" x2="8.5" y2="27.5" stroke="#00F5FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );
  const TeamsIcon = () => (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect x="14" y="3" width="8" height="7" rx="2" stroke="#A3FF12" strokeWidth="1.5"/>
      <rect x="3" y="22" width="8" height="7" rx="2" stroke="#A3FF12" strokeWidth="1.5"/>
      <rect x="14" y="22" width="8" height="7" rx="2" stroke="#A3FF12" strokeWidth="1.5"/>
      <rect x="25" y="22" width="8" height="7" rx="2" stroke="#A3FF12" strokeWidth="1.5"/>
      <line x1="18" y1="10" x2="18" y2="16" stroke="#A3FF12" strokeWidth="1.5"/>
      <line x1="7" y1="16" x2="29" y2="16" stroke="#A3FF12" strokeWidth="1.5"/>
      <line x1="7" y1="16" x2="7" y2="22" stroke="#A3FF12" strokeWidth="1.5"/>
      <line x1="18" y1="16" x2="18" y2="22" stroke="#A3FF12" strokeWidth="1.5"/>
      <line x1="29" y1="16" x2="29" y2="22" stroke="#A3FF12" strokeWidth="1.5"/>
    </svg>
  );
  const MarketIcon = () => (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="7" cy="18" r="4" stroke="#FFB800" strokeWidth="1.5"/>
      <circle cx="29" cy="9" r="4" stroke="#FFB800" strokeWidth="1.5"/>
      <circle cx="29" cy="27" r="4" stroke="#FFB800" strokeWidth="1.5"/>
      <circle cx="18" cy="18" r="4" stroke="#FFB800" strokeWidth="1.5"/>
      <line x1="11" y1="18" x2="14" y2="18" stroke="#FFB800" strokeWidth="1.5"/>
      <line x1="22" y1="18" x2="25" y2="18" stroke="#FFB800" strokeWidth="1.5"/>
      <line x1="22" y1="15" x2="26" y2="12" stroke="#FFB800" strokeWidth="1.5"/>
      <line x1="22" y1="21" x2="26" y2="24" stroke="#FFB800" strokeWidth="1.5"/>
    </svg>
  );
  const AgentsIcon = () => (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="12" r="5" stroke="#5A9E8F" strokeWidth="1.5"/>
      <path d="M8 30C8 24.477 12.477 20 18 20C23.523 20 28 24.477 28 30" stroke="#5A9E8F" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="7" cy="14" r="3" stroke="#5A9E8F" strokeWidth="1.2" opacity="0.5"/>
      <path d="M2 26C2 22.686 4.239 20 7 20" stroke="#5A9E8F" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
      <circle cx="29" cy="14" r="3" stroke="#5A9E8F" strokeWidth="1.2" opacity="0.5"/>
      <path d="M34 26C34 22.686 31.761 20 29 20" stroke="#5A9E8F" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );

  const features = [
    { icon: <EvoIcon />, title: 'TALK TO EVO', desc: 'Your AI manager — Evo — plans, delegates, and scales your entire workforce automatically. Describe your goal once; Evo handles the rest.', accent: '#00F5FF', delay: 0 },
    { icon: <TeamsIcon />, title: 'SELF-MANAGING TEAMS', desc: 'Hierarchical agent teams coordinate, escalate, and evolve without you. Managers delegate down, supervisors review up — end to end.', accent: '#A3FF12', delay: 100 },
    { icon: <MarketIcon />, title: 'MARKETPLACE OF SKILLS', desc: 'Plug in pre-trained agents or build custom roles for your domain. Every tool, every workflow, composable on demand.', accent: '#FFB800', delay: 200 },
    { icon: <AgentsIcon />, title: 'ROLE-BASED AGENTS', desc: 'Specialized templates — Manager, Developer, Designer, Researcher — deployed in seconds, each evolving with every task they complete.', accent: '#5A9E8F', delay: 300 },
  ];

  const faqs = [
    { q: 'What is Evolvian?', a: 'Evolvian is an AI workforce platform. You build hierarchical teams of AI agents — with Evo at the top managing everything — that autonomously execute, evolve, and coordinate work across your entire organisation.' },
    { q: 'How does Evolvian work?', a: 'Describe your goal to Evo. It decomposes the task, assembles a team of specialist agents, coordinates their work, reviews quality, and delivers results — all automatically, with every step logged.' },
    { q: 'How is it priced?', a: 'Pay as you go. You pay per agent hour or per task completed, plus a small fee for each tool your agents use. No fixed seat costs — costs scale exactly with your usage.' },
    { q: 'Can teams communicate with me?', a: 'Yes. Each agent in your team has its own chat thread. You can message your Developer, ask your Researcher for an update, or let Evo brief you — all from one inbox.' },
    { q: 'Is the workforce auditable?', a: 'Every delegation, decision, escalation, and file saved is logged in an immutable audit trail. Your knowledge base accumulates across every task, making the team smarter over time.' },
  ];

  return (
    <div style={{ background: '#0B0E14', color: '#E2E8F0', overflowX: 'hidden', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        html { scroll-behavior: smooth; }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marqueeRev {
          0% { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        @keyframes heroFade {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes borderSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes scanline {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes textReveal {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0% 0 0); }
        }
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(163,255,18,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(163,255,18,0); }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(20px,-15px) scale(1.04); }
          66% { transform: translate(-15px,10px) scale(0.97); }
        }
        @keyframes subtitleReveal {
          from { opacity: 0; filter: blur(8px); transform: translateY(12px); }
          to { opacity: 1; filter: blur(0); transform: translateY(0); }
        }

        .nav-item {
          position: relative; color: #64748B; font-size: 14px;
          cursor: pointer; transition: color 0.2s; padding: 4px 0;
          font-family: 'DM Sans', sans-serif;
        }
        .nav-item::after {
          content: ''; position: absolute; bottom: 0; left: 0;
          height: 1px; width: 0; background: #5A9E8F;
          transition: width 0.25s ease;
        }
        .nav-item:hover { color: #E2E8F0; }
        .nav-item:hover::after { width: 100%; }

        .faq-item { border-bottom: 1px solid rgba(90,158,143,0.1); }
        .faq-item:last-child { border-bottom: none; }

        .btn-primary {
          background: linear-gradient(135deg, #5A9E8F, #3D7A6E);
          border: 1px solid #5A9E8F; border-radius: 100px;
          padding: 14px 36px; color: #fff; font-size: 15px; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          box-shadow: 0 0 30px rgba(90,158,143,0.3); transition: all 0.25s;
          letter-spacing: 0.01em;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 40px rgba(90,158,143,0.5);
        }
        .btn-ghost {
          background: transparent; border: 1px solid rgba(90,158,143,0.3);
          border-radius: 100px; padding: 14px 32px;
          color: #94A3B8; font-size: 15px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.25s;
        }
        .btn-ghost:hover { border-color: #5A9E8F; color: #E2E8F0; }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes msgAppear {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes drawLine {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 48px', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(11,14,20,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(90,158,143,0.12)' : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => scrollTo('hero')}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #5A9E8F40, #00F5FF20)',
            border: '1px solid #5A9E8F50',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: '#00F5FF', letterSpacing: '0.02em' }}>E</span>
          </div>
          <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: '0.1em', color: '#E2E8F0' }}>EVOLVIAN</span>
        </div>

        <div style={{ display: 'flex', gap: 40 }}>
          {['Features', 'How It Works', 'Pricing'].map(l => (
            <span key={l} className="nav-item" onClick={() => scrollTo(l.toLowerCase().replace(/ /g, '-'))}>{l}</span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="nav-item" onClick={onGetStarted} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', padding: '4px 0' }}>Sign In</button>
          <button className="btn-primary" onClick={onGetStarted} style={{ padding: '9px 22px', fontSize: 13 }}>Get Started →</button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section id="hero" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '100px 48px 0', overflow: 'hidden', textAlign: 'center' }}>
        <NetworkCanvas />

        {/* Big ambient orbs */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(90,158,143,0.07) 0%, transparent 65%)', animation: 'orbFloat 14s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '3%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,245,255,0.05) 0%, transparent 65%)', animation: 'orbFloat 18s ease-in-out infinite reverse', pointerEvents: 'none' }} />

        {/* Scanline effect */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.03 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #00F5FF, transparent)', animation: 'scanline 8s linear infinite' }} />
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 36,
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'all 0.6s ease 0.1s',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(163,255,18,0.3)', borderRadius: 100,
            padding: '7px 16px',
            background: 'rgba(163,255,18,0.05)',
            animation: 'badgePulse 3s ease-in-out infinite',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A3FF12', boxShadow: '0 0 8px #A3FF12' }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#A3FF12', letterSpacing: '0.05em', fontWeight: 500 }}>
              Now Hiring: 100% AI Workforce
            </span>
          </div>
        </div>

        {/* Main headline */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: 'clamp(72px, 12vw, 160px)',
            lineHeight: 0.92,
            letterSpacing: '0.02em',
            color: '#E2E8F0',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s',
          }}>
            Replace{' '}
            <span style={{ background: 'linear-gradient(135deg, #5A9E8F 30%, #00F5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Teams.
            </span>
            <br />
            Build{' '}
            <span style={{ color: '#E2E8F0', WebkitTextFillColor: 'initial' }}>Companies.</span>
            <br />
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '0.55em', letterSpacing: '0.06em', color: '#4A5568', WebkitTextFillColor: 'initial' }}>
              With AI.
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 18, lineHeight: 1.7,
          color: '#64748B', maxWidth: 560, marginBottom: 48,
          opacity: heroVisible ? 1 : 0, filter: heroVisible ? 'blur(0)' : 'blur(6px)',
          transition: 'all 0.8s ease 0.5s',
        }}>
          Build a workforce of self-managing agents. Hierarchical teams that evolve, collaborate, and track performance — automatically.
        </p>

        {/* CTAs */}
        <div style={{
          display: 'flex', gap: 16, justifyContent: 'center',
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.6s ease 0.7s',
        }}>
          <button className="btn-primary" onClick={onGetStarted}>Start Building →</button>
          <button className="btn-ghost" onClick={() => scrollTo('features')}>See How It Works</button>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          opacity: heroVisible ? 0.4 : 0, transition: 'opacity 0.6s ease 1.2s',
        }}>
          <div style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, transparent, #5A9E8F)', animation: 'float 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────── */}
      <section style={{ padding: '80px 0', overflow: 'hidden' }}>
        <div style={{ marginBottom: 16 }}>
          <Marquee items={row1} speed={40} />
        </div>
        <div>
          <Marquee items={row2} reverse speed={40} />
        </div>
      </section>

      {/* ── ANIMATED DEMO ───────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '60px 48px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.2em', color: '#5A9E8F', textTransform: 'uppercase' }}>Live Demo</span>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '0.03em', color: '#E2E8F0', marginTop: 10 }}>
            Watch Evo Build a Team
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#4A5568', marginTop: 12 }}>
            A real campaign brief — handled end to end, automatically.
          </p>
        </div>
        <AnimatedDemo />
      </section>

      {/* ── REPLACES STRIP ──────────────────────────────────── */}
      <section style={{ padding: '0 48px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.2em', color: '#5A9E8F', textTransform: 'uppercase' }}>What We Replace</span>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '0.03em', color: '#E2E8F0', marginTop: 10 }}>
            Every Team. Every Department.
          </h2>
        </div>
        <ReplacesStrip />
      </section>

      {/* ── BIG STATEMENT ───────────────────────────────────── */}
      <section style={{ padding: '80px 48px 120px', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 'clamp(40px, 6vw, 80px)',
          letterSpacing: '0.02em',
          lineHeight: 1.15,
          color: '#E2E8F0',
          marginBottom: 28,
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 16px',
        }}>
          <AnimatedWord word="Your" delay={0} />
          <AnimatedWord word="Company," delay={80} />
          <AnimatedWord word="Reinvented" delay={160} />
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: '#4A5568', maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
          The future of work is synthetic. Hierarchical AI agents evolve and collaborate,
          replacing entire departments — from marketing to engineering to ops.
        </p>

        {/* Divider line */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #5A9E8F30, #00F5FF40, #5A9E8F30, transparent)', margin: '80px 0 0' }} />
      </section>

      {/* ── FEATURE SHOWCASES (swap videoSrc in FeatureShowcases.tsx when recordings ready) ── */}
      <div id="features"><FeaturesFlow /></div>

      {/* ── FEATURES (legacy grid — kept for context, hidden) ── */}
      <section id="features" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.2em', color: '#5A9E8F', textTransform: 'uppercase' }}>
            The Platform
          </span>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '0.03em', color: '#E2E8F0', marginTop: 12 }}>
            What Evolvian Can Do
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {features.map((f, i) => <FeatureCard key={i} {...f} />)}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how-it-works" style={{ display: 'none' }}>
        <div style={{ position: 'absolute', top: '50%', right: -200, transform: 'translateY(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,245,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.2em', color: '#5A9E8F', textTransform: 'uppercase' }}>Workflow</span>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '0.03em', color: '#E2E8F0', marginTop: 12 }}>
              Talk to Evo
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#4A5568', marginTop: 16 }}>
              One AI manager to run them all.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {([
              { n: '01', title: 'Describe the Goal', desc: 'Tell Evo what you need — a campaign, a product, a report. It handles everything else.', color: '#5A9E8F' },
              { n: '02', title: 'Evo Assembles the Team', desc: 'Specialist agents are recruited — researcher, writer, analyst, designer — with clear roles and tools.', color: '#00F5FF' },
              { n: '03', title: 'Agents Execute & Evolve', desc: 'Teams work in parallel, escalate blockers, and get smarter with every task they complete.', color: '#A3FF12' },
            ] as const).map((step, i) => (
              <StepCard key={i} {...step} borderLeft={i > 0} delay={i * 120} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM CAPABILITIES ───────────────────────────── */}
      <section style={{ display: 'none' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.2em', color: '#5A9E8F', textTransform: 'uppercase' }}>Everything Included</span>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '0.03em', color: '#E2E8F0', marginTop: 12 }}>
              End-to-End.<br />
              <span style={{ background: 'linear-gradient(135deg, #5A9E8F, #00F5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Nothing Outsourced.
              </span>
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#4A5568', marginTop: 16, maxWidth: 540, margin: '16px auto 0' }}>
              Replace departments end to end. Every tool your workforce needs is built in.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {([
              {
                svg: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect x="3" y="3" width="10" height="8" rx="2" stroke="#00F5FF" strokeWidth="1.4"/>
                    <rect x="3" y="17" width="10" height="8" rx="2" stroke="#00F5FF" strokeWidth="1.4" opacity="0.5"/>
                    <rect x="15" y="10" width="10" height="8" rx="2" stroke="#00F5FF" strokeWidth="1.4" opacity="0.7"/>
                    <line x1="13" y1="7" x2="19" y2="7" stroke="#00F5FF" strokeWidth="1.2" strokeDasharray="2 2"/>
                    <line x1="13" y1="21" x2="19" y2="17" stroke="#00F5FF" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.5"/>
                  </svg>
                ),
                title: 'Evo — Your AI Manager',
                desc: 'Centralize all agent teams under one intelligent manager. Full visibility, real-time delegation, quality review at every level.',
                accent: '#00F5FF',
              },
              {
                svg: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect x="4" y="4" width="8" height="6" rx="1.5" stroke="#A3FF12" strokeWidth="1.4"/>
                    <rect x="16" y="4" width="8" height="6" rx="1.5" stroke="#A3FF12" strokeWidth="1.4" opacity="0.5"/>
                    <rect x="4" y="18" width="8" height="6" rx="1.5" stroke="#A3FF12" strokeWidth="1.4" opacity="0.6"/>
                    <rect x="16" y="18" width="8" height="6" rx="1.5" stroke="#A3FF12" strokeWidth="1.4" opacity="0.8"/>
                    <circle cx="14" cy="14" r="3" stroke="#A3FF12" strokeWidth="1.4"/>
                    <line x1="12" y1="10" x2="11.5" y2="11.5" stroke="#A3FF12" strokeWidth="1.2"/>
                    <line x1="16" y1="10" x2="16.5" y2="11.5" stroke="#A3FF12" strokeWidth="1.2"/>
                    <line x1="12" y1="18" x2="11.5" y2="16.5" stroke="#A3FF12" strokeWidth="1.2"/>
                    <line x1="16" y1="18" x2="16.5" y2="16.5" stroke="#A3FF12" strokeWidth="1.2"/>
                  </svg>
                ),
                title: 'Team Chat',
                desc: 'Chat directly with any agent on your team. Message your Developer, ask your Analyst for a status update, or get a full brief from Evo — all in one inbox.',
                accent: '#A3FF12',
              },
              {
                svg: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect x="5" y="3" width="18" height="22" rx="2.5" stroke="#FFB800" strokeWidth="1.4"/>
                    <line x1="9" y1="9" x2="19" y2="9" stroke="#FFB800" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
                    <line x1="9" y1="13" x2="19" y2="13" stroke="#FFB800" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
                    <line x1="9" y1="17" x2="15" y2="17" stroke="#FFB800" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
                    <circle cx="20" cy="20" r="5" fill="#0B0E14" stroke="#FFB800" strokeWidth="1.4"/>
                    <line x1="20" y1="17.5" x2="20" y2="20" stroke="#FFB800" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="20" cy="21.5" r="0.8" fill="#FFB800"/>
                  </svg>
                ),
                title: 'Neural Vault — File System',
                desc: 'Every agent saves its work to a shared internal file system. Documents, research, outputs — all stored, versioned, and accessible across your entire team.',
                accent: '#FFB800',
              },
              {
                svg: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="9" stroke="#5A9E8F" strokeWidth="1.4"/>
                    <path d="M14 8C14 8 10 11 10 14.5C10 16.4 11.8 18 14 18C16.2 18 18 16.4 18 14.5C18 11 14 8 14 8Z" stroke="#5A9E8F" strokeWidth="1.3"/>
                    <line x1="10" y1="14.5" x2="18" y2="14.5" stroke="#5A9E8F" strokeWidth="1.2" opacity="0.5"/>
                    <line x1="14" y1="8" x2="14" y2="18" stroke="#5A9E8F" strokeWidth="1.2" opacity="0.5"/>
                    <path d="M20 20L24 24" stroke="#5A9E8F" strokeWidth="1.4" strokeLinecap="round"/>
                    <circle cx="24" cy="24" r="2" stroke="#5A9E8F" strokeWidth="1.2"/>
                  </svg>
                ),
                title: 'Knowledge Base & Evolution',
                desc: 'Teams accumulate a living knowledge base from every completed task. Agents reference it, learn from it, and evolve — getting measurably better over time.',
                accent: '#5A9E8F',
              },
              {
                svg: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect x="3" y="7" width="22" height="15" rx="2.5" stroke="#00F5FF" strokeWidth="1.4" opacity="0.5"/>
                    <path d="M7 11H21" stroke="#00F5FF" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
                    <path d="M7 14.5H17" stroke="#00F5FF" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
                    <path d="M7 18H13" stroke="#00F5FF" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
                    <circle cx="21" cy="19" r="4.5" fill="#0B0E14" stroke="#A3FF12" strokeWidth="1.4"/>
                    <polyline points="19,19 20.5,20.5 23,17.5" stroke="#A3FF12" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                title: 'Quality Review Loops',
                desc: 'Supervisors review every output before it leaves the team. Catch gaps, request revisions, enforce standards — automated quality gates at every layer.',
                accent: '#00F5FF',
              },
              {
                svg: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="7" r="3.5" stroke="#FFB800" strokeWidth="1.4"/>
                    <circle cx="5" cy="21" r="3.5" stroke="#FFB800" strokeWidth="1.4" opacity="0.6"/>
                    <circle cx="23" cy="21" r="3.5" stroke="#FFB800" strokeWidth="1.4" opacity="0.6"/>
                    <line x1="14" y1="10.5" x2="14" y2="15" stroke="#FFB800" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="14" y1="15" x2="6.5" y2="18" stroke="#FFB800" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
                    <line x1="14" y1="15" x2="21.5" y2="18" stroke="#FFB800" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
                    <circle cx="14" cy="15" r="1.5" fill="#FFB800" opacity="0.7"/>
                  </svg>
                ),
                title: 'Pay as You Go',
                desc: 'No seat fees. Pay per agent hour or per task. Each tool your agents use is priced individually — costs scale exactly with what you build.',
                accent: '#FFB800',
              },
            ] as const).map((card, i) => (
              <WhyCard key={i} icon={card.svg} title={card.title} desc={card.desc} accent={card.accent} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section style={{ padding: '40px 48px 120px', background: 'rgba(22,27,34,0.15)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(36px, 4vw, 56px)', letterSpacing: '0.03em', color: '#E2E8F0' }}>
              What People Are Saying
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <TestimonialCard
              quote="Evolvian built an entire AI team for our project overnight. Evo manages everything flawlessly."
              name="Emily R."
              role="Digital Marketer"
              delay={0}
            />
            <TestimonialCard
              quote="Evolvian is like having an entire company of AI employees at your command. Absolutely game-changing."
              name="Sophia H."
              role="E-Commerce Owner"
              delay={120}
            />
          </div>
        </div>
      </section>

      {/* ── RECOGNITION ─────────────────────────────────────── */}
      <section style={{ padding: '80px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Divider top */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(163,255,18,0.2), rgba(163,255,18,0.4), rgba(163,255,18,0.2), transparent)', marginBottom: 72 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            {/* Left — badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.2em', color: '#A3FF12', textTransform: 'uppercase' }}>
                Recognition
              </span>
              <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '0.02em', color: '#E2E8F0', lineHeight: 1.1, margin: 0 }}>
                Backed By<br />HWU Enterprise Fund
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4A5568', lineHeight: 1.7, margin: 0, maxWidth: 320 }}>
                Awarded £1,000 seed funding through the Heriot-Watt University Enterprise Fund in partnership with Converge Challenge — Scotland&apos;s national university spin-out competition.
              </p>

              {/* Badge row */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'HWU Enterprise Fund', color: '#A3FF12' },
                  { label: 'Converge Challenge', color: '#5A9E8F' },
                ].map(({ label, color }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    border: `1px solid ${color}30`,
                    borderRadius: 100, padding: '7px 16px',
                    background: `${color}08`,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — judge quote */}
            <div style={{
              background: 'rgba(22,27,34,0.6)',
              border: '1px solid rgba(163,255,18,0.1)',
              borderRadius: 16,
              padding: '36px 40px',
              position: 'relative',
              backdropFilter: 'blur(12px)',
            }}>
              {/* Quotation mark */}
              <div style={{
                position: 'absolute', top: 20, left: 28,
                fontFamily: "'Bebas Neue', cursive",
                fontSize: 72, lineHeight: 1,
                color: 'rgba(163,255,18,0.12)',
                pointerEvents: 'none', userSelect: 'none',
              }}>
                &ldquo;
              </div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14.5, color: '#94A3B8',
                lineHeight: 1.85, margin: '0 0 28px',
                position: 'relative', zIndex: 1,
                fontStyle: 'italic',
              }}>
                A bold and ambitious vision delivered with confidence, clarity, and a highly polished narrative.
                The concept stands out in a crowded agentic-AI space through its focus on hierarchical,
                self-optimising, brand-specialist agent teams — a distinctive angle with significant potential.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(163,255,18,0.1)',
                  border: '1px solid rgba(163,255,18,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="7" r="3.5" stroke="#A3FF12" strokeWidth="1.3"/>
                    <path d="M4 17C4 13.686 6.686 11 10 11C13.314 11 16 13.686 16 17" stroke="#A3FF12" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#E2E8F0', fontWeight: 600 }}>HWU Enterprise Fund Judges</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#4A5568', letterSpacing: '0.05em' }}>Heriot-Watt University × Converge Challenge</div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider bottom */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(163,255,18,0.2), rgba(163,255,18,0.4), rgba(163,255,18,0.2), transparent)', marginTop: 72 }} />
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse, rgba(90,158,143,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.2em', color: '#5A9E8F', textTransform: 'uppercase' }}>Pricing</span>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '0.03em', color: '#E2E8F0', margin: '12px 0 16px' }}>
            Pay Only for What You Use
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#4A5568', maxWidth: 480, margin: '0 auto 56px', lineHeight: 1.7 }}>
            No fixed seats. No monthly plans. Every agent, every tool, every task — charged only when used.
          </p>

          {/* Three pricing pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
            {[
              { label: 'Per Agent', value: 'Hourly', sub: 'billed by the hour of active work', color: '#5A9E8F', icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="4" stroke="#5A9E8F" strokeWidth="1.4"/><path d="M5 20C5 16.686 8.134 14 12 14C15.866 14 19 16.686 19 20" stroke="#5A9E8F" strokeWidth="1.4" strokeLinecap="round"/></svg>
              )},
              { label: 'Per Task', value: 'On Completion', sub: 'pay when the job is done', color: '#00F5FF', icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="#00F5FF" strokeWidth="1.4"/><polyline points="8,12 11,15 16,9" stroke="#00F5FF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )},
              { label: 'Per Tool', value: 'Add-on', sub: 'each capability priced individually', color: '#A3FF12', icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3L18 9.6L9.6 18L6 18L6 14.4L14.7 6.3Z" stroke="#A3FF12" strokeWidth="1.4" strokeLinejoin="round"/><line x1="12" y1="9" x2="15" y2="12" stroke="#A3FF12" strokeWidth="1.2"/></svg>
              )},
            ].map((p, i) => (
              <div key={i} style={{
                background: 'rgba(22,27,34,0.7)', backdropFilter: 'blur(12px)',
                border: `1px solid ${p.color}25`, borderRadius: 20, padding: '32px 24px',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = p.color + '50')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = p.color + '25')}>
                <div style={{ marginBottom: 16 }}>{p.icon}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: p.color, marginBottom: 8, fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, color: '#E2E8F0', letterSpacing: '0.04em', lineHeight: 1, marginBottom: 8 }}>{p.value}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4A5568' }}>{p.sub}</div>
              </div>
            ))}
          </div>

          {/* Free trial CTA */}
          <div style={{
            background: 'rgba(22,27,34,0.8)', backdropFilter: 'blur(20px)',
            border: '1px solid #5A9E8F', borderRadius: 24, padding: '44px 48px',
            boxShadow: '0 0 60px rgba(90,158,143,0.12)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.4), transparent)' }} />
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(28px, 3vw, 40px)', color: '#E2E8F0', letterSpacing: '0.03em', marginBottom: 12 }}>
              Get Started — Pay Only For What You Use
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4A5568', marginBottom: 32 }}>
              Deploy your first agent team. No seat fees, no subscriptions — costs scale with what you build.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={onGetStarted} style={{ padding: '14px 40px', fontSize: 15 }}>
                Start Building →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section style={{ padding: '0 48px 120px', maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(36px, 4vw, 52px)', letterSpacing: '0.03em', color: '#E2E8F0', textAlign: 'center', marginBottom: 56 }}>
          Frequently Asked Questions
        </h2>
        <div style={{ border: '1px solid rgba(90,158,143,0.15)', borderRadius: 20, overflow: 'hidden' }}>
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', background: openFaq === i ? 'rgba(90,158,143,0.05)' : 'transparent',
                  border: 'none', padding: '24px 32px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                }}
              >
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#E2E8F0', fontWeight: 500 }}>{faq.q}</span>
                <span style={{ color: '#5A9E8F', fontSize: 20, transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.25s ease', flexShrink: 0, marginLeft: 16 }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 32px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#64748B', lineHeight: 1.8 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── ROADMAP ─────────────────────────────────────────── */}
      <section id="roadmap" style={{ padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.04) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.2em', color: '#00F5FF', textTransform: 'uppercase' }}>Roadmap</span>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '0.03em', color: '#E2E8F0', marginTop: 12, marginBottom: 16 }}>
              What&apos;s Coming
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#4A5568', maxWidth: 440, margin: '0 auto' }}>
              We&apos;re building fast. Here&apos;s what&apos;s on the horizon.
            </p>
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: '50%', top: 0, bottom: 0,
              width: 1, transform: 'translateX(-50%)',
              background: 'linear-gradient(to bottom, rgba(0,245,255,0.3), rgba(90,158,143,0.15), transparent)',
            }} />

            {[
              {
                quarter: 'Q1 2026',
                status: 'live',
                title: 'Core Platform Launch',
                items: ['Agent Marketplace', 'Tool Marketplace', 'Team Inbox', 'Neural Vault', 'Job Board'],
                accent: '#A3FF12',
                side: 'left',
              },
              {
                quarter: 'Q2 2026',
                status: 'building',
                title: 'Intelligence Layer',
                items: ['Knowledge Graph (auto-extraction)', 'Hierarchy Builder (AI-generated org charts)', 'Agent Evolution Engine', 'Cross-team memory sharing'],
                accent: '#00F5FF',
                side: 'right',
              },
              {
                quarter: 'Q3 2026',
                status: 'planned',
                title: 'Scale & Integrations',
                items: ['Native Slack / Notion / GitHub connectors', 'Custom agent training on your data', 'Multi-workspace teams', 'Enterprise SSO & audit logs'],
                accent: '#FFB800',
                side: 'left',
              },
              {
                quarter: 'Q4 2026',
                status: 'planned',
                title: 'Autonomous Orgs',
                items: ['Self-healing teams (auto-replace underperforming agents)', 'Revenue-generating agent pipelines', 'Agent-to-agent marketplace', 'Public API for third-party agent builders'],
                accent: '#5A9E8F',
                side: 'right',
              },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 40px 1fr',
                gap: 0,
                marginBottom: 56,
                alignItems: 'start',
              }}>
                {/* Left content or spacer */}
                <div style={{ padding: item.side === 'left' ? '0 40px 0 0' : '0', textAlign: item.side === 'left' ? 'right' : 'left' }}>
                  {item.side === 'left' && (
                    <RoadmapCard quarter={item.quarter} status={item.status} title={item.title} items={item.items} accent={item.accent} align="right" />
                  )}
                </div>

                {/* Center dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: item.status === 'live' ? item.accent : 'transparent',
                    border: `2px solid ${item.accent}`,
                    boxShadow: item.status === 'live' ? `0 0 12px ${item.accent}60` : 'none',
                    flexShrink: 0,
                  }} />
                </div>

                {/* Right content or spacer */}
                <div style={{ padding: item.side === 'right' ? '0 0 0 40px' : '0' }}>
                  {item.side === 'right' && (
                    <RoadmapCard quarter={item.quarter} status={item.status} title={item.title} items={item.items} accent={item.accent} align="left" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section style={{ padding: '120px 48px 140px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(90,158,143,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #5A9E8F30, #00F5FF40, #5A9E8F30, transparent)' }} />
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(52px, 8vw, 96px)', letterSpacing: '0.02em', lineHeight: 0.95, color: '#E2E8F0', marginBottom: 32 }}>
            Build Smarter.<br />
            <span style={{ background: 'linear-gradient(135deg, #5A9E8F 20%, #00F5FF 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Build Faster.
            </span>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, color: '#4A5568', maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.7 }}>
            Evolvian transforms ideas into fully operational AI teams that manage themselves.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={onGetStarted} style={{ padding: '16px 48px', fontSize: 16 }}>
              Start Building →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #111827', padding: '52px 48px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(90,158,143,0.15)', border: '1px solid #5A9E8F40', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, color: '#00F5FF' }}>E</span>
              </div>
              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: '0.1em', color: '#E2E8F0' }}>EVOLVIAN</span>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2D3748', maxWidth: 240, lineHeight: 1.7 }}>
              The org chart for your AI workforce.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 80 }}>
            {/* Product column */}
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#2D3748', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Product</div>
              {[
                { label: 'Features', action: () => scrollTo('features') },
                { label: 'Pricing', action: () => scrollTo('pricing') },
                { label: 'Roadmap', action: () => scrollTo('roadmap') },
              ].map(({ label, action }) => (
                <div key={label} onClick={action} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2D3748', marginBottom: 10, cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = '#5A9E8F'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = '#2D3748'}>
                  {label}
                </div>
              ))}
            </div>

            {/* Contact column */}
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#2D3748', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Contact</div>
              {[
                { label: 'murtaza.0903@gmail.com', href: 'mailto:murtaza.0903@gmail.com' },
                { label: '+44 7984 002696', href: 'tel:+447984002696' },
              ].map(({ label, href }) => (
                <a key={label} href={href} style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2D3748', marginBottom: 10, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = '#5A9E8F'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = '#2D3748'}>
                  {label}
                </a>
              ))}
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#1E2D30', lineHeight: 1.6, maxWidth: 200, marginTop: 4 }}>
                Heriot-Watt University<br />
                Edinburgh, EH14 4AS<br />
                Scotland, UK
              </div>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #0F1520', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#1E293B' }}>© 2026 Evolvian · Heriot-Watt University</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#1E293B' }}>evolvian.com</span>
        </div>
      </footer>
    </div>
  );
}
