import React, { useState } from 'react';
import { Rocket, ExternalLink } from 'lucide-react';
import { useInstall } from '../context/InstallContext';

const TOKEN_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const inputClass =
  'w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200';

export default function InstallVercelPage() {
  const { state, setState } = useInstall();
  const [vercelToken, setVercelToken] = useState('');

  const tokenValid = TOKEN_REGEX.test(vercelToken);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenValid) return;
    setState(prev => ({ ...prev, vercelToken }));
    window.location.href = '/install/supabase';
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12"
      style={{
        background:
          'radial-gradient(circle at center, rgba(0,140,255,0.25) 0%, rgba(0,0,0,0) 60%), #020617',
      }}
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center">

        {/* Badge */}
        <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-8">
          Capítulo 2 de 4
        </span>

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6">
          <Rocket className="w-8 h-8 text-blue-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
          Olá, {state.adminName || 'administrador'}!
        </h1>
        <p className="text-sm text-slate-400 mb-10">
          Conecte com a Vercel para preparar sua nave.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3" noValidate>
          <input
            id="vercel-token"
            type="password"
            autoComplete="off"
            value={vercelToken}
            onChange={e => setVercelToken(e.target.value)}
            placeholder="Cole seu token da Vercel"
            className={inputClass}
          />

          <a
            href="https://vercel.com/account/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Gerar token na Vercel
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="submit"
            disabled={!tokenValid}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Continuar →
          </button>
        </form>

        {/* Back */}
        <button
          type="button"
          onClick={() => { window.location.href = '/install/start'; }}
          className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}
