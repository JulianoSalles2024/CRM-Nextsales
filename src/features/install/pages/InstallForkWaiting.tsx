import React, { useState, useEffect } from 'react';

const DURATION_MS = 90_000;

const btnSecondary =
  'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all duration-200';

interface Props {
  onContinue: () => void;
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-2 mb-2">
      <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
        Passo {current} de {total}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i < current ? 'w-6 bg-blue-500' : i === current - 1 ? 'w-6 bg-blue-400' : 'w-3 bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function InstallForkWaiting({ onContinue }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(Math.min(e, DURATION_MS));
      if (e >= DURATION_MS) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const pct     = Math.min(Math.round((elapsed / DURATION_MS) * 100), 100);
  const seconds = Math.floor(elapsed / 1000);

  return (
    <div className="flex flex-col items-center iz-fade-in w-full">

      <StepIndicator current={2} total={4} />

      {/* Spinner */}
      <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mt-6 mb-6">
        <div className="w-9 h-9 rounded-full border-[3px] border-blue-400/15 border-t-blue-400 border-r-blue-300/40 animate-spin" />
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-white tracking-tight mb-2 text-center">
        Criando cópia do projeto
      </h1>
      <p className="text-sm text-slate-400 mb-1 text-center leading-relaxed max-w-xs">
        Estamos aguardando a criação do fork no seu GitHub.
      </p>
      <p className="text-xs text-slate-500 mb-8 text-center">
        Esse processo normalmente leva até 90 segundos.
      </p>

      {/* Progress bar */}
      <div className="w-full mb-2">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Aguardando fork</span>
          <span className="font-mono text-blue-400">{seconds}s / 90s</span>
        </div>
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Animated dots */}
      <div className="flex gap-2 mt-4 mb-8 justify-center">
        <span className="w-2 h-2 rounded-full bg-blue-400 iz-dot-1" />
        <span className="w-2 h-2 rounded-full bg-blue-400 iz-dot-2" />
        <span className="w-2 h-2 rounded-full bg-blue-400 iz-dot-3" />
      </div>

      {/* Manual advance */}
      <div className="w-full">
        <button type="button" onClick={onContinue} className={btnSecondary}>
          Já fiz o fork
        </button>
      </div>

    </div>
  );
}
