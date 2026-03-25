/**
 * SignIn.tsx — NextSales CRM · Login Page
 * Design concept: "Data Convergence"
 *
 * Fonts: add to frontend/index.html <head>:
 *   <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet"/>
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Cpu, Phone, Sparkles, GitBranch } from 'lucide-react';

interface SignInProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  error: string | null;
  successMessage?: string | null;
}

/* ── SVG paths — Bézier fans, ViewBox 1440×900, convergence (660,450) ── */
type FP = { id: string; d: string; w: number; d1: number; d2: number; b1: number; b2: number };

const PATHS: FP[] = [
  { id: 'p0', d: 'M 0,55  C 230,55  450,448 660,450', w: 0.55, d1: 5.5, d2: 5.5, b1: 0.0, b2: 2.75 },
  { id: 'p1', d: 'M 0,148 C 220,148 440,448 660,450', w: 0.65, d1: 6.0, d2: 6.0, b1: 0.9, b2: 3.90 },
  { id: 'p2', d: 'M 0,242 C 210,242 430,449 660,450', w: 0.75, d1: 5.0, d2: 5.0, b1: 1.8, b2: 4.30 },
  { id: 'p3', d: 'M 0,336 C 200,336 420,449 660,450', w: 0.90, d1: 4.5, d2: 4.5, b1: 0.4, b2: 2.65 },
  { id: 'p4', d: 'M 0,450 C 220,450 440,450 660,450', w: 1.60, d1: 4.0, d2: 4.0, b1: 0.0, b2: 2.00 },
  { id: 'p5', d: 'M 0,564 C 200,564 420,451 660,450', w: 0.90, d1: 4.5, d2: 4.5, b1: 0.6, b2: 2.85 },
  { id: 'p6', d: 'M 0,658 C 210,658 430,451 660,450', w: 0.75, d1: 5.0, d2: 5.0, b1: 1.4, b2: 3.90 },
  { id: 'p7', d: 'M 0,752 C 220,752 440,452 660,450', w: 0.65, d1: 6.0, d2: 6.0, b1: 0.7, b2: 3.70 },
  { id: 'p8', d: 'M 0,845 C 230,845 450,452 660,450', w: 0.55, d1: 5.5, d2: 5.5, b1: 0.2, b2: 2.95 },
];
const TRUNK = { id: 'trunk', d: 'M 660,450 L 800,450' };
const SCATTER = [
  { x: 112, y: 72,  r: 1.7, dur: 2.8, beg: 0.0 },
  { x: 78,  y: 188, r: 1.4, dur: 3.2, beg: 0.5 },
  { x: 215, y: 160, r: 1.9, dur: 2.5, beg: 1.1 },
  { x: 92,  y: 348, r: 1.5, dur: 3.5, beg: 1.5 },
  { x: 198, y: 458, r: 1.7, dur: 2.8, beg: 0.2 },
  { x: 316, y: 282, r: 2.1, dur: 3.0, beg: 0.8 },
  { x: 412, y: 350, r: 1.9, dur: 2.6, beg: 1.3 },
  { x: 258, y: 562, r: 1.6, dur: 3.3, beg: 0.4 },
  { x: 368, y: 632, r: 1.8, dur: 2.9, beg: 0.9 },
  { x: 152, y: 692, r: 1.4, dur: 3.1, beg: 0.6 },
  { x: 492, y: 422, r: 2.0, dur: 2.7, beg: 1.7 },
  { x: 526, y: 478, r: 1.5, dur: 3.0, beg: 2.0 },
];

const INTEGRATIONS = [
  { name: 'WhatsApp',  clr: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: <Phone     size={13} strokeWidth={2.5} /> },
  { name: 'OpenAI',    clr: '#a78bfa', bg: 'rgba(167,139,250,0.1)', icon: <Sparkles  size={13} strokeWidth={2.5} /> },
  { name: 'n8n',       clr: '#f97316', bg: 'rgba(249,115,22,0.1)',  icon: <GitBranch size={13} strokeWidth={2.5} /> },
  { name: 'AI Engine', clr: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  icon: <Cpu       size={13} strokeWidth={2.5} /> },
];

/* ── Input / button classes mirroring AuthPage ── */
const inputCls =
  'w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200';

const primaryBtnCls =
  'w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200';

/* ══════════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export const SignIn: React.FC<SignInProps> = ({
  onLogin,
  onRegister,
  onForgotPassword,
  error,
  successMessage,
}) => {
  const [mode, setMode]           = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage]     = useState<string | null>(null);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { setInternalError(error); }, [error]);
  useEffect(() => { if (successMessage) setMode('login'); }, [successMessage]);

  const changeMode = (m: typeof mode) => {
    setMode(m);
    setInternalError(null);
    setInfoMessage(null);
    if (m === 'register') { setName(''); setPassword(''); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setInternalError(null);
    try {
      if (mode === 'login')    await onLogin(email, password);
      if (mode === 'register') await onRegister(name, email, password);
      if (mode === 'forgot') {
        await onForgotPassword(email);
        setInfoMessage('Se uma conta com este e-mail existir, um link de redefinição foi enviado.');
        setMode('login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen overflow-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        .ns-display { font-family: 'Bricolage Grotesque', sans-serif; font-variation-settings: 'wdth' 100; }
        @keyframes ns-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ns-in { from { opacity:0; } to { opacity:1; } }
        .ns-aup { animation: ns-up 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .ns-ain { animation: ns-in 0.55s ease both; }
      `}</style>

      {/* ══ BACKGROUND SVG — Data Convergence ══ */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        width="100%" height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Glow: lines */}
          <filter id="ns-lg" x="-10%" y="-60%" width="120%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2"   result="b1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="b2"/>
            <feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Glow: nodes */}
          <filter id="ns-ng" x="-180%" y="-180%" width="460%" height="460%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Fan line gradient — transparent → white */}
          <linearGradient id="ns-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="white" stopOpacity="0"/>
            <stop offset="20%"  stopColor="white" stopOpacity="0.1"/>
            <stop offset="75%"  stopColor="white" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="white" stopOpacity="0.38"/>
          </linearGradient>
          {/* Trunk gradient — white, slightly brighter */}
          <linearGradient id="ns-tg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.38"/>
            <stop offset="100%" stopColor="white" stopOpacity="0.55"/>
          </linearGradient>
          {/* Atmospheric radial */}
          <radialGradient id="ns-atm" cx="36%" cy="50%" r="55%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.025"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          {/* Path defs for animateMotion */}
          {PATHS.map(p => <path key={`d-${p.id}`} id={p.id} d={p.d} fill="none"/>)}
          <path id={TRUNK.id} d={TRUNK.d} fill="none"/>
        </defs>

        <rect width="100%" height="100%" fill="url(#ns-atm)"
          opacity={mounted ? 1 : 0} style={{ transition: 'opacity 2.5s ease' }}/>

        {/* Fan lines */}
        {PATHS.map((p, i) => (
          <g key={p.id} filter="url(#ns-lg)">
            <path
              d={p.d} fill="none"
              stroke="url(#ns-grad)"
              strokeWidth={p.w}
              opacity={mounted ? (p.w >= 1.2 ? 0.9 : 0.55) : 0}
              style={{ transition: `opacity 1.8s ease ${0.08 + i * 0.1}s` }}
            />
            {/* Particle 1 — white */}
            <circle r={p.w >= 1.2 ? 3 : 2} fill="white" filter="url(#ns-ng)" opacity="0.75">
              <animateMotion dur={`${p.d1}s`} repeatCount="indefinite" begin={`${p.b1}s`}>
                <mpath href={`#${p.id}`}/>
              </animateMotion>
            </circle>
            {/* Particle 2 — white dimmer */}
            <circle r="1.3" fill="white" opacity="0.35">
              <animateMotion dur={`${p.d2}s`} repeatCount="indefinite" begin={`${p.b2}s`}>
                <mpath href={`#${p.id}`}/>
              </animateMotion>
            </circle>
          </g>
        ))}

        {/* Trunk */}
        <g filter="url(#ns-lg)">
          <path d={TRUNK.d} fill="none" stroke="url(#ns-tg)" strokeWidth="2.2"
            opacity={mounted ? 0.85 : 0} style={{ transition: 'opacity 1.5s ease 1.1s' }}/>
          {[0, 0.8, 1.6].map((b, i) => (
            <circle key={i} r={i === 0 ? 3 : 2.2} fill="white" filter="url(#ns-ng)" opacity="0.8">
              <animateMotion dur="2.4s" repeatCount="indefinite" begin={`${b}s`}>
                <mpath href="#trunk"/>
              </animateMotion>
            </circle>
          ))}
        </g>

        {/* Junction pulse at convergence */}
        {mounted && (
          <g>
            <circle cx="660" cy="450" r="18" fill="white" opacity="0.04"/>
            <circle cx="660" cy="450" r="8"  fill="white" opacity="0.1" filter="url(#ns-ng)"/>
            <circle cx="660" cy="450" r="3.5" fill="white" opacity="0.8" filter="url(#ns-ng)">
              <animate attributeName="r"       values="2.5;4.5;2.5"   dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.4;0.9;0.4"   dur="2.4s" repeatCount="indefinite"/>
            </circle>
          </g>
        )}

        {/* Scatter ambient nodes — white */}
        {SCATTER.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="white" filter="url(#ns-ng)">
            <animate
              attributeName="opacity"
              values={`0.04;${0.1 + (i % 3) * 0.05};0.04`}
              dur={`${n.dur}s`}
              repeatCount="indefinite"
              begin={`${n.beg}s`}
            />
          </circle>
        ))}
      </svg>

      {/* ══ LEFT PANEL — Branding ══ */}
      <div
        className="relative z-10 flex flex-col justify-center"
        style={{ width: '55%', padding: '0 clamp(3rem, 6vw, 7rem)' }}
      >
        {/* Logo */}
        <div className="ns-display ns-aup flex items-center gap-3" style={{ marginBottom: '3.5rem', animationDelay: '0.1s' }}>
          <div className="flex items-center justify-center rounded-xl bg-blue-600 shadow-lg"
            style={{ width: 42, height: 42, boxShadow: '0 0 22px rgba(37,99,235,0.45)' }}>
            <Cpu size={21} color="#fff" strokeWidth={1.8}/>
          </div>
          <div>
            <div className="ns-display text-white font-bold" style={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              NextSales
            </div>
            <div className="text-slate-500 uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.13em' }}>
              CRM Platform
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="ns-aup" style={{ animationDelay: '0.2s' }}>
          <h1 className="ns-display text-white"
            style={{ fontSize: 'clamp(2.4rem, 4vw, 4.5rem)', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-0.025em', marginBottom: '1.25rem', fontVariationSettings: "'wdth' 100" }}>
            O CRM que{' '}
            <span className="text-blue-400">pensa</span>
            <br/>com você.
          </h1>
          <p className="text-slate-400" style={{ fontSize: '1.05rem', lineHeight: 1.72, fontWeight: 300, maxWidth: 450 }}>
            IA nativa, omnichannel e automação avançada —
            transforme cada conversa em receita previsível.
          </p>
        </div>

        {/* Divider */}
        <div className="ns-ain" style={{
          height: 1, maxWidth: 430, margin: '2.25rem 0',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.07) 0%, transparent 80%)',
          animationDelay: '0.42s',
        }}/>

        {/* Integration badges */}
        <div className="ns-aup" style={{ animationDelay: '0.34s' }}>
          <p className="text-slate-500 uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.14em', marginBottom: '0.8rem' }}>
            Integrado com
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
            {INTEGRATIONS.map(({ name, clr, bg, icon }) => (
              <div key={name} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.38rem 0.8rem', borderRadius: 99,
                background: bg, border: `1px solid ${clr}28`,
                color: clr, fontSize: '0.78rem', fontWeight: 500,
              }}>
                {icon}{name}
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="ns-ain" style={{ animationDelay: '0.54s', marginTop: '2.75rem' }}>
          <div className="border-l-2 border-blue-500/30 pl-4" style={{ maxWidth: 360 }}>
            <p className="text-slate-400" style={{ fontSize: '0.875rem', lineHeight: 1.65, fontWeight: 300, marginBottom: '0.45rem' }}>
              "Aumentamos a conversão em{' '}
              <strong className="text-white font-semibold">3.4×</strong>{' '}
              nos primeiros 30 dias."
            </p>
            <span className="text-slate-600" style={{ fontSize: '0.72rem' }}>
              Equipe Comercial — SaaS B2B
            </span>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — Card igual ao AuthPage original ══ */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ width: '45%', padding: '0 clamp(2rem, 4vw, 5rem)' }}
      >
        <div className="w-full" style={{ maxWidth: 448, transform: 'translateX(-10rem)' }}>
          {/* Card — mesmo estilo do AuthPage */}
          <div className="rounded-2xl border border-white/10 px-8 py-10 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/30 hover:ring-1 hover:ring-blue-500/20 ns-aup"
            style={{ animationDelay: '0.26s' }}>

            {/* Header — centralizado igual ao AuthPage */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {mode === 'login'    ? 'Bem-vindo de volta' :
                 mode === 'register' ? 'Criar conta'        :
                                       'Redefinir senha'}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {mode === 'login'    ? 'Entre na sua conta para continuar'    :
                 mode === 'register' ? 'Cadastre-se para acessar o CRM'       :
                                       'Digite seu e-mail para receber o link'}
              </p>
            </div>

            {/* Banners */}
            {(successMessage || infoMessage) && mode === 'login' && (
              <div className="mb-4 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
                {successMessage || infoMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
                  <input
                    id="name" type="text" autoComplete="name" required
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="Seu nome" className={inputCls}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">E-mail</label>
                <input
                  id="email" type="email" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" className={inputCls}
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300">Senha</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => changeMode('forgot')}
                        className="text-xs text-slate-400 hover:text-blue-400 transition-colors">
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" className={inputCls}
                  />
                </div>
              )}

              {internalError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400" role="alert">
                  {internalError}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className={primaryBtnCls}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin"/>}
                {isSubmitting ? 'Processando...' :
                  mode === 'login'    ? 'Entrar'      :
                  mode === 'register' ? 'Criar conta' :
                                        'Enviar link'}
              </button>
            </form>

            {/* Footer links */}
            <p className="mt-6 text-center text-sm text-slate-400">
              {mode === 'login' ? (
                <>
                  Não tem conta?{' '}
                  <button type="button" onClick={() => changeMode('register')}
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    Criar conta
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => changeMode('login')}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Voltar para o login
                </button>
              )}
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            &copy; {new Date().getFullYear()} CRM. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
