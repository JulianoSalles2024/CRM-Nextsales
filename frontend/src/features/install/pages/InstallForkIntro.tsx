import React from 'react';
import { Database } from 'lucide-react';

const FORK_URL = 'https://github.com/JulianoSalles2024/CRM-Fity/fork';

const btnPrimary =
  'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-[0_0_24px_rgba(0,140,255,0.5)]';

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

export default function InstallForkIntro({ onContinue }: Props) {
  return (
    <div className="flex flex-col items-center iz-fade-in w-full">

      <StepIndicator current={1} total={4} />

      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mt-6 mb-6">
        <Database className="w-7 h-7 text-blue-300" />
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-white tracking-tight mb-2 text-center">
        Preparando repositório do projeto
      </h1>
      <p className="text-sm text-slate-400 mb-3 text-center leading-relaxed max-w-xs">
        Para instalar o CRM na sua conta, primeiro precisamos criar uma cópia do projeto no seu GitHub.
      </p>

      {/* Microtexto do repositório */}
      <p className="text-xs text-slate-500 mb-8 text-center">
        Repositório: <span className="font-mono text-blue-400 font-medium">crm-fity</span>
      </p>

      {/* Button — opens GitHub in new tab and advances to waiting screen */}
      <div className="w-full">
        <a
          href={FORK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onContinue}
          className={btnPrimary}
        >
          Continuar com GitHub
        </a>
      </div>

    </div>
  );
}
