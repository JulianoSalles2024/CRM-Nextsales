import React from 'react';

const DEPLOY_URL = 'https://vercel.com/new';

const btnPrimary =
  'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-[0_0_24px_rgba(0,140,255,0.5)]';

interface Props {
  onContinue: () => void;
}

export default function DeployInstructionsPage({ onContinue }: Props) {
  return (
    <div className="flex flex-col items-center iz-fade-in w-full">

      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6 text-3xl">
        ▲
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
        Deploy na Vercel
      </h1>
      <p className="text-sm text-slate-400 mb-8 text-center leading-relaxed">
        Agora vamos colocar o CRM no ar.
      </p>

      {/* Instruction */}
      <p className="text-sm text-slate-300 mb-5 text-center leading-relaxed max-w-xs">
        Na próxima tela da Vercel selecione o repositório{' '}
        <span className="font-semibold text-white">crm-fity</span>{' '}
        que você acabou de criar no fork.
      </p>

      {/* Info box */}
      <div className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 mb-8">
        <p className="text-xs text-slate-500 mb-1">📁 Repositório esperado</p>
        <p className="text-sm font-mono font-semibold text-blue-300">crm-fity</p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Esse é o fork criado na sua conta GitHub no passo anterior.
        </p>
      </div>

      {/* Button */}
      <div className="w-full">
        <a
          href={DEPLOY_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onContinue}
          className={btnPrimary}
        >
          🚀 Abrir Vercel
        </a>
      </div>

    </div>
  );
}
