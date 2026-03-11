import React, { useState, useEffect } from 'react';

const DURATION_MS = 90_000;

const MESSAGES: Array<{ from: number; text: string }> = [
  { from:     0, text: 'Verificando deploy da Vercel...' },
  { from:  5000, text: 'Preparando ambiente do CRM...' },
  { from: 20000, text: 'Inicializando serviços...' },
  { from: 45000, text: 'Configurando infraestrutura...' },
  { from: 70000, text: 'Finalizando instalação...' },
];

function getMessage(elapsed: number): string {
  let msg = MESSAGES[0].text;
  for (const m of MESSAGES) {
    if (elapsed >= m.from) msg = m.text;
  }
  return msg;
}

function advance() {
  sessionStorage.setItem('crm_from_deploy', '1');
  window.location.href = '/install/start';
}

export default function DeployPreparationPage() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();

    const id = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      if (e >= DURATION_MS) {
        clearInterval(id);
        advance();
      }
    }, 100);

    return () => clearInterval(id);
  }, []);

  const pct     = Math.min(Math.round((elapsed / DURATION_MS) * 100), 100);
  const message = getMessage(elapsed);

  return (
    <div className="flex flex-col items-center iz-fade-in w-full">

      {/* Glow icon */}
      <div className="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-400/40 iz-glow flex items-center justify-center mb-8">
        <div className="w-11 h-11 rounded-full border-[3px] border-blue-400/15 border-t-blue-400 border-r-blue-300/40 animate-spin" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
        Preparando seu CRM
      </h1>
      <p className="text-sm text-slate-400 mb-1 text-center">
        Configurando infraestrutura e verificando o deploy.
      </p>
      <p className="text-xs text-slate-500 mb-10 text-center">
        Isso leva cerca de 1 minuto.
      </p>

      {/* Progress bar */}
      <div className="w-full mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Progresso</span>
          <span className="font-mono text-blue-400">{pct}%</span>
        </div>
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Dynamic message */}
      <p key={message} className="text-xs font-mono text-blue-400/60 iz-fade-in">
        {message}
      </p>

      {/* Animated dots */}
      <div className="flex gap-2 mt-5 justify-center">
        <span className="w-2 h-2 rounded-full bg-blue-400 iz-dot-1" />
        <span className="w-2 h-2 rounded-full bg-blue-400 iz-dot-2" />
        <span className="w-2 h-2 rounded-full bg-blue-400 iz-dot-3" />
      </div>

      {/* Botão de avanço manual */}
      <button
        type="button"
        onClick={advance}
        className="mt-8 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all duration-200"
      >
        Já fiz o deploy
      </button>

    </div>
  );
}
