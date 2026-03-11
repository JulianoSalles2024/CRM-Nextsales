import React from 'react';

const FORK_URL = 'https://github.com/JulianoSalles2024/CRM-Fity/fork';

const btnPrimary =
  'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-[0_0_24px_rgba(0,140,255,0.5)]';

const btnSecondary =
  'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all duration-200';

interface Props {
  onContinue: () => void;
}

export default function ForkInstructionsPage({ onContinue }: Props) {
  return (
    <div className="flex flex-col items-center iz-fade-in w-full">

      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6 text-3xl">
        🍴
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
        Fork do Projeto
      </h1>
      <p className="text-sm text-slate-400 mb-8 text-center leading-relaxed">
        Vamos criar uma cópia do CRM no seu GitHub.
      </p>

      {/* Instruction */}
      <p className="text-sm text-slate-300 mb-5 text-center leading-relaxed max-w-xs">
        Na próxima tela do GitHub clique no botão{' '}
        <span className="font-semibold text-white">Create Fork</span>{' '}
        para criar uma cópia do projeto na sua conta.
      </p>

      {/* Info box */}
      <div className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 mb-8">
        <p className="text-xs text-slate-500 mb-1">📁 Repositório que será criado</p>
        <p className="text-sm font-mono font-semibold text-blue-300">crm-fity</p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Esse repositório será criado na sua conta GitHub e será usado no deploy da Vercel.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col w-full gap-3">
        <a
          href={FORK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={btnPrimary}
        >
          🚀 Abrir GitHub para Fork
        </a>
        <button type="button" onClick={onContinue} className={btnSecondary}>
          Continuar para Deploy
        </button>
      </div>

    </div>
  );
}
