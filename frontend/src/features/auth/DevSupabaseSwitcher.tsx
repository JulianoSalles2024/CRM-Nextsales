import React, { useState } from 'react';

const CONFIG_KEY = 'crm_supabase_config';

function currentConfig(): { url: string; anonKey: string } | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function DevSupabaseSwitcher() {
  if (!import.meta.env.DEV) return null;

  const [open, setOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');

  const cfg = currentConfig();
  const source = cfg ? 'localStorage' : '.env';
  const displayUrl = cfg?.url ?? import.meta.env.VITE_SUPABASE_URL ?? '(vazio)';

  function useEnv() {
    localStorage.removeItem(CONFIG_KEY);
    location.reload();
  }

  function clearAll() {
    localStorage.clear();
    location.reload();
  }

  function applyManual() {
    const trimUrl = url.trim().replace(/\/$/, '');
    const trimKey = anonKey.trim();
    if (!trimUrl || !trimKey) return;
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: trimUrl, anonKey: trimKey }));
    location.reload();
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 font-mono text-xs">
      {/* Toggle pill */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg ? 'bg-yellow-400' : 'bg-green-400'}`} />
        DEV · {source}
      </button>

      {open && (
        <div className="mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 space-y-2">
          {/* Current status */}
          <div className="text-slate-500 break-all leading-relaxed">
            <span className="text-slate-400">URL:</span>{' '}
            <span className="text-blue-400">{displayUrl}</span>
          </div>

          <div className="border-t border-slate-800" />

          {/* Button: use .env */}
          <button
            onClick={useEnv}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            Usar Supabase do .env
          </button>

          {/* Button: clear all */}
          <button
            onClick={clearAll}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 transition-colors"
          >
            Limpar localStorage
          </button>

          {/* Button: set manually */}
          <button
            onClick={() => setShowManual(m => !m)}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            {showManual ? '▲ Fechar manual' : '▼ Definir Supabase manualmente'}
          </button>

          {showManual && (
            <div className="space-y-1.5 pt-1">
              <input
                type="text"
                placeholder="https://xxx.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="anon key (eyJ...)"
                value={anonKey}
                onChange={e => setAnonKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={applyManual}
                disabled={!url.trim() || !anonKey.trim()}
                className="w-full px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                Aplicar e recarregar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
