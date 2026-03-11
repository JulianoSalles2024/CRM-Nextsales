import React, { useState } from 'react';
import { Database, ExternalLink } from 'lucide-react';
import { useInstall } from '../context/InstallContext';

const inputClass =
  'w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200';

export default function InstallSupabasePage() {
  const { setState } = useInstall();
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseServiceKey, setSupabaseServiceKey] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabasePatToken, setSupabasePatToken] = useState('');

  const urlValid = supabaseUrl.trim().startsWith('https://') && supabaseUrl.trim().length >= 20;
  const canSubmit = urlValid && supabaseServiceKey.trim().length >= 20;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setState(prev => ({
      ...prev,
      supabaseUrl: supabaseUrl.trim(),
      supabaseServiceKey: supabaseServiceKey.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      supabasePatToken: supabasePatToken.trim(),
    }));
    window.location.href = '/install/run';
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

        {/* Chapter badge */}
        <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-3">
          Capítulo 3 de 4
        </span>

        {/* Secondary badge */}
        <span className="text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 mb-8">
          ✓ Vercel conectada
        </span>

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6">
          <Database className="w-8 h-8 text-blue-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
          Base de Dados
        </h1>
        <p className="text-sm text-slate-400 mb-10">
          Último passo! Conecte com o Supabase.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3" noValidate>
          <input
            id="supabase-url"
            type="text"
            autoComplete="off"
            value={supabaseUrl}
            onChange={e => setSupabaseUrl(e.target.value)}
            placeholder="https://xxxx.supabase.co"
            className={inputClass}
          />
          <input
            id="supabase-service-key"
            type="text"
            autoComplete="off"
            value={supabaseServiceKey}
            onChange={e => setSupabaseServiceKey(e.target.value)}
            placeholder="Service Role Key (secreta)"
            className={inputClass}
          />
          <input
            id="supabase-anon-key"
            type="text"
            autoComplete="off"
            value={supabaseAnonKey}
            onChange={e => setSupabaseAnonKey(e.target.value)}
            placeholder="Anon Key — opcional"
            className={inputClass}
          />
          <input
            id="supabase-pat-token"
            type="text"
            autoComplete="off"
            value={supabasePatToken}
            onChange={e => setSupabasePatToken(e.target.value)}
            placeholder="Personal Access Token — opcional (migrations)"
            className={inputClass}
          />

          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Gerar token no Supabase
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Continuar →
          </button>
        </form>

        {/* Back */}
        <button
          type="button"
          onClick={() => { window.location.href = '/install/vercel'; }}
          className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}
