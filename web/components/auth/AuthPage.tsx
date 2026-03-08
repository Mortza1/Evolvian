'use client';

import { useState } from 'react';

interface AuthPageProps {
  onAuthSuccess?: (email?: string) => void;
}

const API_URL = 'http://localhost:8000';

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin) {
        // Validate signup
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin
        ? { email, password }
        : { email, username: fullName, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Store token in localStorage as backup
      localStorage.setItem('access_token', data.access_token);

      // Call the success callback with email
      if (onAuthSuccess) {
        onAuthSuccess(email);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // shared input style helpers
  const fieldCls = "w-full rounded-md border bg-[#111A1D] px-4 py-3 text-[13px] text-[#D8D4CC] placeholder-[#2A3E44] outline-none transition-all";
  const fieldStyle = { borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = '#5A9E8F60'; };
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = '#1E2D30'; };

  return (
    <div
      className="flex min-h-screen w-full overflow-hidden"
      style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}
    >
      {/* ── Left panel — brand atmosphere ───────────────────────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden border-r px-16 py-14 lg:flex lg:w-[52%]"
        style={{
          borderColor: '#162025',
          background: 'radial-gradient(ellipse 90% 70% at 30% 40%, #12221F, #0A181A, #080E11)',
        }}
      >
        {/* Phylogenetic tree SVG background */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.06]"
          viewBox="0 0 600 700"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Trunk */}
          <line x1="300" y1="680" x2="300" y2="400" stroke="#5A9E8F" strokeWidth="1.5"/>
          {/* Main branches */}
          <line x1="300" y1="500" x2="160" y2="340" stroke="#5A9E8F" strokeWidth="1.2"/>
          <line x1="300" y1="460" x2="440" y2="300" stroke="#5A9E8F" strokeWidth="1.2"/>
          <line x1="300" y1="400" x2="300" y2="220" stroke="#5A9E8F" strokeWidth="1"/>
          {/* Sub-branches left */}
          <line x1="160" y1="340" x2="80" y2="220" stroke="#5A9E8F" strokeWidth="0.9"/>
          <line x1="160" y1="340" x2="200" y2="200" stroke="#5A9E8F" strokeWidth="0.9"/>
          <line x1="80" y1="220" x2="40" y2="140" stroke="#5A9E8F" strokeWidth="0.7"/>
          <line x1="80" y1="220" x2="100" y2="130" stroke="#5A9E8F" strokeWidth="0.7"/>
          <line x1="200" y1="200" x2="170" y2="110" stroke="#5A9E8F" strokeWidth="0.7"/>
          <line x1="200" y1="200" x2="230" y2="100" stroke="#5A9E8F" strokeWidth="0.7"/>
          {/* Sub-branches right */}
          <line x1="440" y1="300" x2="390" y2="170" stroke="#5A9E8F" strokeWidth="0.9"/>
          <line x1="440" y1="300" x2="520" y2="190" stroke="#5A9E8F" strokeWidth="0.9"/>
          <line x1="390" y1="170" x2="350" y2="80" stroke="#5A9E8F" strokeWidth="0.7"/>
          <line x1="390" y1="170" x2="420" y2="70" stroke="#5A9E8F" strokeWidth="0.7"/>
          <line x1="520" y1="190" x2="500" y2="90" stroke="#5A9E8F" strokeWidth="0.7"/>
          <line x1="520" y1="190" x2="560" y2="100" stroke="#5A9E8F" strokeWidth="0.7"/>
          {/* Center branch */}
          <line x1="300" y1="220" x2="260" y2="110" stroke="#5A9E8F" strokeWidth="0.7"/>
          <line x1="300" y1="220" x2="340" y2="100" stroke="#5A9E8F" strokeWidth="0.7"/>
          {/* Leaf nodes */}
          {[
            [40,140],[100,130],[170,110],[230,100],
            [350,80],[420,70],[500,90],[560,100],
            [260,110],[340,100],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.5" fill="#5A9E8F" opacity="0.6"/>
          ))}
          {/* Junction nodes */}
          {[
            [300,400],[160,340],[440,300],[80,220],[200,200],[390,170],[520,190],[300,220],
          ].map(([cx, cy], i) => (
            <circle key={`j${i}`} cx={cx} cy={cy} r="2.5" fill="#5A9E8F" opacity="0.4"/>
          ))}
        </svg>

        {/* Grain overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
            backgroundSize: '180px',
          }}
        />

        {/* Top: wordmark */}
        <div className="relative z-10 animate-evolve-in">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md border border-[#5A9E8F]/40 bg-[#0F1E1B]"
            >
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', letterSpacing: '-0.04em' }} className="text-[#5A9E8F] leading-none">E</span>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, letterSpacing: '-0.03em' }} className="text-[18px] text-[#EAE6DF]">
              Evolvian
            </span>
          </div>
        </div>

        {/* Middle: hero copy */}
        <div className="relative z-10" style={{ animationDelay: '100ms' }}>
          <p
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="mb-5 text-[10px] uppercase tracking-[0.2em] text-[#3A5056]"
          >
            AI Workforce Platform
          </p>
          <h2
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}
            className="mb-6 text-[42px] text-[#EAE6DF]"
          >
            Build teams<br />
            <span className="text-[#5A9E8F]">that evolve.</span>
          </h2>
          <p className="max-w-[360px] text-[14px] leading-relaxed text-[#4A6A72]">
            Hire, manage, and grow AI specialists that learn from every task — becoming more capable with each operation.
          </p>

          {/* Stat row */}
          <div className="mt-10 flex items-center gap-8 border-t pt-8" style={{ borderColor: '#162025' }}>
            {[
              { value: '40+', label: 'Agent archetypes' },
              { value: '∞',   label: 'Evolution paths' },
              { value: '24/7', label: 'Autonomous ops' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }} className="text-[22px] text-[#5A9E8F]">
                  {value}
                </p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-0.5 text-[10px] uppercase tracking-wider text-[#2E4248]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: testimonial / trust */}
        <div
          className="relative z-10 rounded-md border p-5"
          style={{ background: '#0F1A1D', borderColor: '#1E2D30' }}
        >
          <p className="mb-3 text-[13px] leading-relaxed text-[#6A8A90]">
            "Evolvian let us spin up a research & content team overnight. Our agents now handle 80% of routine workflows autonomously."
          </p>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-sm bg-[#1E2D30]" style={{ background: 'linear-gradient(135deg, #2A4A52, #162025)' }} />
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[12px] text-[#B8B2AA]">
                Marcus Chen
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2E4248]">
                Head of Ops · Meridian Labs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — auth form ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-14">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#5A9E8F]/40 bg-[#0F1E1B]">
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px' }} className="text-[#5A9E8F]">E</span>
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }} className="text-[17px] text-[#EAE6DF]">Evolvian</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-8 animate-evolve-in">
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }} className="mb-1.5 text-[24px] text-[#EAE6DF]">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#3A5056]">
              {isLogin ? 'Sign in to your workspace' : 'Start building your AI workforce'}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="mb-7 flex border-b" style={{ borderColor: '#162025' }}>
            {[
              { id: true,  label: 'Sign In' },
              { id: false, label: 'Sign Up' },
            ].map(({ id, label }) => {
              const active = isLogin === id;
              return (
                <button
                  key={label}
                  onClick={() => { setIsLogin(id); setError(''); }}
                  className="mr-6 pb-3 text-[13px] transition-colors"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: active ? '#5A9E8F' : '#3A5056',
                    borderBottom: active ? '2px solid #5A9E8F' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 flex items-start gap-2 rounded-md border px-4 py-3"
              style={{ background: '#9E5A5A12', borderColor: '#9E5A5A30' }}
            >
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9E5A5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#9E5A5A]">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1.5 block text-[11px] text-[#5A9E8F]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={fieldCls}
                  style={fieldStyle}
                  placeholder="Jane Doe"
                  required={!isLogin}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            )}

            <div>
              <label style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1.5 block text-[11px] text-[#5A9E8F]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldCls}
                style={fieldStyle}
                placeholder="you@company.com"
                required
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div>
              <label style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1.5 block text-[11px] text-[#5A9E8F]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldCls}
                style={fieldStyle}
                placeholder="••••••••"
                required
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {!isLogin && (
              <div>
                <label style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mb-1.5 block text-[11px] text-[#5A9E8F]">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldCls}
                  style={fieldStyle}
                  placeholder="••••••••"
                  required={!isLogin}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <div
                    className="flex h-3.5 w-3.5 items-center justify-center rounded border"
                    style={{ background: '#111A1D', borderColor: '#1E2D30' }}
                  />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#3A5056]">
                    Remember me
                  </span>
                </label>
                <a href="#" style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#3A5056] transition-colors hover:text-[#5A9E8F]">
                  Forgot password?
                </a>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-md border py-3 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: '#5A9E8F18',
                borderColor: '#5A9E8F50',
                color: '#5A9E8F',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = '#5A9E8F28'; e.currentTarget.style.borderColor = '#5A9E8F80'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F18'; e.currentTarget.style.borderColor = '#5A9E8F50'; }}
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{isLogin ? 'Authenticating…' : 'Initializing workforce…'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Access Workspace' : 'Build Your Workforce'}</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div className="flex-1 border-t" style={{ borderColor: '#162025' }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mx-4 text-[10px] text-[#2A3E44]">
              or continue with
            </span>
            <div className="flex-1 border-t" style={{ borderColor: '#162025' }} />
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: 'Google',
                icon: (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                ),
              },
              {
                label: 'GitHub',
                icon: (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                ),
              },
            ].map(({ label, icon }) => (
              <button
                key={label}
                type="button"
                className="flex items-center justify-center gap-2 rounded-md border py-2.5 text-[12px] transition-all"
                style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#4A6A72', background: '#111A1D' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2A4A52'; e.currentTarget.style.color = '#B8B2AA'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; e.currentTarget.style.color = '#4A6A72'; }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Switch mode */}
          <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-8 text-center text-[11px] text-[#2E4248]">
            {isLogin ? "No account yet? " : "Already have one? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="transition-colors hover:text-[#5A9E8F]"
              style={{ color: '#3A5056' }}
            >
              {isLogin ? 'Sign up →' : 'Sign in →'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
