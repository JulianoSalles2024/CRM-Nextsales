import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadInstallState, saveInstallState } from '../utils/installStorage';

export interface InstallState {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  vercelToken: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  supabasePatToken: string;
}

interface InstallContextValue {
  state: InstallState;
  setState: React.Dispatch<React.SetStateAction<InstallState>>;
}

const InstallContext = createContext<InstallContextValue | null>(null);

function getInstallPage(): string {
  return window.location.pathname.match(/^\/install\/(.+)$/)?.[1]?.trim() ?? '';
}

export function InstallProvider({ children }: { children: React.ReactNode }) {
  // ── Initialize from localStorage ─────────────────────────────────────────
  const [state, _setState] = useState<InstallState>(() => {
    const s = loadInstallState();
    return {
      adminName:          s?.adminName          ?? '',
      adminEmail:         s?.adminEmail         ?? '',
      adminPassword:      s?.adminPassword      ?? '',
      vercelToken:        s?.vercelToken        ?? '',
      supabaseUrl:        s?.supabaseUrl        ?? '',
      supabaseAnonKey:    s?.supabaseAnonKey    ?? '',
      supabaseServiceKey: s?.supabaseServiceKey ?? '',
      supabasePatToken:   s?.supabasePatToken   ?? '',
    };
  });

  // ── Guard + auto-recovery (once on mount) ─────────────────────────────────
  useEffect(() => {
    const page  = getInstallPage();
    const saved = loadInstallState();

    // Auto-detect: if fully filled and user opens /start → go to /run.
    // Disabled in DEV so stale localStorage tokens don't skip the wizard.
    if (!import.meta.env.DEV && page === 'start' && saved?.vercelToken && saved?.supabaseServiceKey) {
      window.location.href = '/install/run';
      return;
    }

    // Guards: block direct access to later steps
    if (page === 'vercel'   && !saved?.adminName)          { window.location.href = '/install/start';    return; }
    if (page === 'supabase' && !saved?.vercelToken)        { window.location.href = '/install/vercel';   return; }
    if (page === 'run'      && !saved?.supabaseServiceKey) { window.location.href = '/install/supabase'; return; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Intercepted setState — auto-saves every change to localStorage ────────
  const setState = useCallback<React.Dispatch<React.SetStateAction<InstallState>>>(
    (update) => {
      _setState(prev => {
        const next = typeof update === 'function' ? update(prev) : update;
        saveInstallState({ ...next, step: getInstallPage() });
        return next;
      });
    },
    [],
  );

  return (
    <InstallContext.Provider value={{ state, setState }}>
      {children}
    </InstallContext.Provider>
  );
}

export function useInstall() {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error('useInstall must be used inside InstallProvider');
  return ctx;
}
