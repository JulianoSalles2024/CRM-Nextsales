import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useInstall } from '../context/InstallContext';
import { clearInstallState } from '../utils/installStorage';
import InstallForkIntro from './InstallForkIntro';
import InstallForkWaiting from './InstallForkWaiting';
import InstallDeployStep from './InstallDeployStep';
import DeployPreparationPage from './DeployPreparationPage';
import {
  verificarInfraestrutura,
  criarEnvVars,
  rodarMigrations,
  criarAdmin,
  verificarPerfil,
  triggerRedeploy,
} from '../services/installService';

// ── Types ──────────────────────────────────────────────────────────────────────
type InstallStep =
  | 'not-on-vercel'
  | 'fork-waiting'
  | 'deploy-instructions'
  | 'deploy-preparation'
  | 'intro'
  | 'verify-supabase'
  | 'quota-limit'
  | 'pausing-project'
  | 'analyze-destination'
  | 'optimize-route'
  | 'countdown-3'
  | 'countdown-2'
  | 'countdown-1'
  | 'launch'
  | 'takeoff'
  | 'progress-install'
  | 'complete'
  | 'welcome';

// Returns false when running locally (localhost / 127.0.0.1 / LAN IPs).
// On any real deployment the hostname will be a proper domain, so the
// installer flow proceeds normally.
function isDeployed(): boolean {
  const h = window.location.hostname;
  return (
    h !== 'localhost' &&
    h !== '127.0.0.1' &&
    !h.startsWith('192.168.') &&
    !h.startsWith('10.') &&
    !h.startsWith('172.')
  );
}

const FORK_URL   = 'https://github.com/JulianoSalles2024/CRM-Fity/fork';
const DEPLOY_URL = 'https://vercel.com/new';

interface ProgressStep {
  pct: number;
  title: string;
  subtitle: string;
  tech: string;
}

const PROGRESS_STEPS: ProgressStep[] = [
  { pct: 0,   title: 'Decolagem!',                     subtitle: 'Iniciando sequência de instalação...',        tech: '' },
  { pct: 14,  title: 'Verificando infraestrutura',     subtitle: 'Testando conexão com Vercel e Supabase...',   tech: 'verificando tokens e endpoints' },
  { pct: 28,  title: 'Criando variáveis de ambiente',  subtitle: 'Configurando ambiente de produção...',         tech: 'env vars → Vercel project' },
  { pct: 45,  title: 'Rodando migrations',             subtitle: 'Preparando banco de dados...',                 tech: 'Management API → Supabase' },
  { pct: 63,  title: 'Criando administrador',          subtitle: 'Registrando sua conta de acesso...',           tech: 'POST /auth/v1/admin/users' },
  { pct: 80,  title: 'Verificando perfil admin',        subtitle: 'Confirmando permissões no banco...',           tech: 'GET profiles → Supabase' },
  { pct: 90,  title: 'Redeploy',                       subtitle: 'Publicando nova versão na Vercel...',          tech: 'POST /v13/deployments' },
  { pct: 100, title: 'Instalação concluída!',          subtitle: '',                                             tech: '' },
];

// ── CSS animations (scoped with iz- prefix) ────────────────────────────────────
const CSS = `
  @keyframes iz-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes iz-scale-in {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes iz-dot-1 {
    0%, 70%, 100% { opacity: 0.2; transform: scale(0.7); }
    20%           { opacity: 1;   transform: scale(1.15); }
  }
  @keyframes iz-dot-2 {
    0%, 70%, 100% { opacity: 0.2; transform: scale(0.7); }
    40%           { opacity: 1;   transform: scale(1.15); }
  }
  @keyframes iz-dot-3 {
    0%, 70%, 100% { opacity: 0.2; transform: scale(0.7); }
    60%           { opacity: 1;   transform: scale(1.15); }
  }
  @keyframes iz-glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(0,140,255,0.3), 0 0 40px rgba(0,140,255,0.08); }
    50%      { box-shadow: 0 0 38px rgba(0,140,255,0.7), 0 0 72px rgba(0,140,255,0.22); }
  }
  @keyframes iz-spin-cw  { to { transform: rotate(360deg);  } }
  @keyframes iz-spin-ccw { to { transform: rotate(-360deg); } }

  .iz-fade-in      { animation: iz-fade-in  0.45s ease-out both; }
  .iz-scale-in     { animation: iz-scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
  .iz-dot-1        { animation: iz-dot-1    1.4s ease-in-out infinite; }
  .iz-dot-2        { animation: iz-dot-2    1.4s ease-in-out infinite; }
  .iz-dot-3        { animation: iz-dot-3    1.4s ease-in-out infinite; }
  .iz-glow         { animation: iz-glow-pulse 2.2s ease-in-out infinite; }
  .iz-orbit-a      { animation: iz-spin-cw   8s linear infinite; }
  .iz-orbit-b      { animation: iz-spin-ccw 13s linear infinite; }
  .iz-orbit-c      { animation: iz-spin-cw  19s linear infinite; }
`;

// ── Shared background ──────────────────────────────────────────────────────────
function SpaceBg({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center overflow-hidden"
      style={{ background: '#020617' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.1) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0,140,255,0.2) 0%, transparent 58%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-12 w-full">
        {children}
      </div>
    </div>
  );
}

// ── Orbit rings ────────────────────────────────────────────────────────────────
function OrbitRings() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <div className="absolute rounded-full border border-blue-400/10 iz-orbit-c" style={{ width: 158, height: 158 }} />
      <div className="absolute rounded-full border border-blue-400/20 iz-orbit-b" style={{ width: 116, height: 116 }} />
      <div className="absolute rounded-full border border-blue-300/35 iz-orbit-a" style={{ width: 80,  height: 80  }} />
      <div className="w-14 h-14 rounded-full bg-blue-600/25 border border-blue-400/50 iz-glow flex items-center justify-center">
        <div className="w-5 h-5 rounded-full bg-blue-400/70 animate-pulse" />
      </div>
    </div>
  );
}

function AnimatedDots() {
  return (
    <div className="flex gap-2 mt-5 justify-center">
      <span className="w-2 h-2 rounded-full bg-blue-400 iz-dot-1" />
      <span className="w-2 h-2 rounded-full bg-blue-400 iz-dot-2" />
      <span className="w-2 h-2 rounded-full bg-blue-400 iz-dot-3" />
    </div>
  );
}

// ── Named sub-components ───────────────────────────────────────────────────────
function InstallLoadingScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <OrbitRings />
      <div className="mt-8 iz-fade-in">
        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
        <p key={subtitle} className="mt-2 text-sm text-slate-400 iz-fade-in">{subtitle}</p>
        <AnimatedDots />
      </div>
    </>
  );
}

function InstallCountdown({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        key={number}
        className="iz-scale-in select-none"
        style={{
          fontSize: 128,
          fontWeight: 900,
          lineHeight: 1,
          color: 'white',
          textShadow: '0 0 48px rgba(0,140,255,0.65)',
        }}
      >
        {number}
      </div>
      <p className="mt-4 text-lg font-medium text-blue-300 iz-fade-in">{label}</p>
      <div className="mt-8">
        <OrbitRings />
      </div>
    </div>
  );
}

function InstallProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-2">
        <span>Progresso da instalação</span>
        <span className="font-mono text-blue-400">{pct}%</span>
      </div>
      <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InstallComplete({ adminName, supabaseUrl, supabaseAnonKey }: {
  adminName: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  function handleEnter() {
    localStorage.setItem('crm_supabase_config', JSON.stringify({
      url:     supabaseUrl.trim().replace(/\/$/, ''),
      anonKey: supabaseAnonKey,
    }));
    clearInstallState();
    window.location.href = '/';
  }

  return (
    <div className="flex flex-col items-center iz-fade-in">
      <div className="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-400/40 iz-glow flex items-center justify-center mb-8">
        <CheckCircle2 className="w-9 h-9 text-blue-400" strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
        Missão cumprida, {adminName}!
      </h1>
      <p className="text-base text-blue-300 mb-3">Seu CRM está pronto para decolar.</p>
      <p className="text-sm text-slate-400 mb-10 max-w-xs leading-relaxed">
        Seu novo mundo está pronto.<br />
        Tudo está configurado — você já pode entrar.
      </p>
      <button
        onClick={handleEnter}
        className="px-8 py-3 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 shadow-[0_0_20px_rgba(0,140,255,0.35)] hover:shadow-[0_0_32px_rgba(0,140,255,0.6)] animate-pulse"
        style={{ animationDuration: '2.5s' }}
      >
        Entrar no CRM
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function InstallRunPage() {
  const { state } = useInstall();
  const adminName = state.adminName || 'capitão';

  const [step, setStep] = useState<InstallStep>(() => {
    // Check if user came through the deploy preparation flow.
    // Clear the flag immediately so it never affects subsequent renders.
    const fromDeployFlag = sessionStorage.getItem('crm_from_deploy');
    if (fromDeployFlag) {
      sessionStorage.removeItem('crm_from_deploy');
      return 'intro';
    }

    // On localhost (DEV or otherwise): show the fork/deploy onboarding.
    // On a real deployment: proceed directly to the installation cinematic.
    return isDeployed() ? 'intro' : 'not-on-vercel';
  });
  const [analyzeSubtitle, setAnalyzeSub] = useState('Verificando estado do projeto...');
  const [progressIdx, setProgressIdx]    = useState(0);
  const [installError, setInstallError]  = useState<string | null>(null);
  const [retryKey, setRetryKey]          = useState(0);

  // Persist data between async steps without causing re-renders
  const vercelProjectIdRef = useRef('');
  const adminUserIdRef     = useRef('');

  // ── Cinematic state machine ───────────────────────────────────────────────
  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];

    if (step === 'intro')               ts.push(setTimeout(() => setStep('verify-supabase'),    1500));
    if (step === 'verify-supabase')     ts.push(setTimeout(() => setStep('analyze-destination'), 1500));
    if (step === 'analyze-destination') {
      ts.push(setTimeout(() => setAnalyzeSub('Otimizando rota de instalação...'), 1500));
      ts.push(setTimeout(() => setStep('countdown-3'), 3000));
    }
    if (step === 'countdown-3')  ts.push(setTimeout(() => setStep('countdown-2'), 1000));
    if (step === 'countdown-2')  ts.push(setTimeout(() => setStep('countdown-1'), 1000));
    if (step === 'countdown-1')  ts.push(setTimeout(() => setStep('launch'),      1000));
    if (step === 'launch')       ts.push(setTimeout(() => setStep('takeoff'),     1000));
    if (step === 'takeoff')      ts.push(setTimeout(() => setStep('progress-install'), 600));

    return () => ts.forEach(clearTimeout);
  }, [step]);

  // ── Real installation steps ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'progress-install') return;

    // Last step done → show welcome
    if (progressIdx >= PROGRESS_STEPS.length - 1) {
      const t = setTimeout(() => setStep('welcome'), 800);
      return () => clearTimeout(t);
    }

    let active = true;
    const controller = new AbortController();

    (async () => {
      try {
        if (progressIdx === 0) {
          // Brief pause before first real call
          await new Promise<void>(r => setTimeout(r, 500));
        } else if (progressIdx === 1) {
          const { vercelProjectId } = await verificarInfraestrutura(state);
          vercelProjectIdRef.current = vercelProjectId;
        } else if (progressIdx === 2) {
          await criarEnvVars(state, vercelProjectIdRef.current);
        } else if (progressIdx === 3) {
          await rodarMigrations(state, controller.signal);      // schema first
        } else if (progressIdx === 4) {
          const userId = await criarAdmin(state);               // auth user after schema
          adminUserIdRef.current = userId;
        } else if (progressIdx === 5) {
          await verificarPerfil(state, adminUserIdRef.current); // assert triggers ran correctly
        } else if (progressIdx === 6) {
          await triggerRedeploy(state.vercelToken, vercelProjectIdRef.current);
        }

        if (active) setProgressIdx(i => i + 1);
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Erro inesperado.';
          setInstallError(msg);
        }
      }
    })();

    return () => { active = false; controller.abort(); };
  }, [step, progressIdx, retryKey]); // retryKey forces re-run on retry

  const progress = PROGRESS_STEPS[progressIdx];

  return (
    <>
      <style>{CSS}</style>
      <SpaceBg>
        <div key={step} className="iz-fade-in flex flex-col items-center w-full max-w-sm">

          {step === 'not-on-vercel' && (
            <InstallForkIntro onContinue={() => setStep('fork-waiting')} />
          )}

          {step === 'fork-waiting' && (
            <InstallForkWaiting onContinue={() => setStep('deploy-instructions')} />
          )}

          {step === 'deploy-instructions' && (
            <InstallDeployStep onContinue={() => setStep('deploy-preparation')} />
          )}

          {step === 'deploy-preparation' && (
            <DeployPreparationPage />
          )}

          {step === 'intro' && (
            <InstallLoadingScreen
              title={`Tudo pronto, ${adminName}!`}
              subtitle="Preparando a sequência de lançamento..."
            />
          )}

          {step === 'verify-supabase' && (
            <InstallLoadingScreen
              title="Preparando seu projeto"
              subtitle="Verificando sua conta Supabase..."
            />
          )}

          {step === 'analyze-destination' && (
            <InstallLoadingScreen
              title="Analisando destino"
              subtitle={analyzeSubtitle}
            />
          )}

          {step === 'countdown-3' && <InstallCountdown number={3} label="Motores acionados" />}
          {step === 'countdown-2' && <InstallCountdown number={2} label="Sistemas online" />}
          {step === 'countdown-1' && <InstallCountdown number={1} label="Ignição" />}

          {step === 'launch' && (
            <div className="flex flex-col items-center gap-6">
              <OrbitRings />
              <h2 className="text-3xl font-bold text-white tracking-tight iz-scale-in">
                Lançamento!
              </h2>
            </div>
          )}

          {(step === 'takeoff' || step === 'progress-install') && (
            <div className="flex flex-col items-center gap-6 w-full">
              <OrbitRings />

              <div key={progressIdx} className="text-center iz-fade-in">
                <h2 className="text-xl font-bold text-white">{progress.title}</h2>
                {progress.subtitle && (
                  <p className="mt-1 text-sm text-slate-400">{progress.subtitle}</p>
                )}
              </div>

              <InstallProgressBar pct={progress.pct} />

              {progress.tech && !installError && (
                <p key={`tech-${progressIdx}`} className="text-xs font-mono text-blue-400/60 iz-fade-in">
                  {progress.tech}
                </p>
              )}

              {/* Error state with retry */}
              {installError && (
                <div className="w-full rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-4 iz-fade-in">
                  <p className="text-sm text-red-400 text-center mb-3">{installError}</p>
                  <button
                    onClick={() => { setInstallError(null); setRetryKey(k => k + 1); }}
                    className="w-full py-2 rounded-lg text-xs font-semibold text-white bg-red-600/70 hover:bg-red-600 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'welcome' && (
            <InstallComplete
              adminName={adminName}
              supabaseUrl={state.supabaseUrl}
              supabaseAnonKey={state.supabaseAnonKey}
            />
          )}

        </div>
      </SpaceBg>
    </>
  );
}
