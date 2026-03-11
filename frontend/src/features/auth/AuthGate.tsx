import React from 'react';
import { useAuth } from './AuthContext';
import { supabaseUrl } from '@/src/lib/supabase';
import AuthPage from './AuthPage';
import DevSupabaseSwitcher from './DevSupabaseSwitcher';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user, isLoading,
    login, register, signInWithGoogle, forgotPassword,
    authError, successMessage,
    blockedError, clearBlockedError,
  } = useAuth();

  const rootCls = "min-h-screen bg-[radial-gradient(ellipse_at_15%_50%,rgba(29,78,216,0.07)_0%,transparent_55%),linear-gradient(160deg,#060d1a_0%,#0a1628_50%,#060d1a_100%)]";

  // Supabase URL not configured — installer was never run on this deploy
  if (!supabaseUrl) {
    return (
      <div className={`flex items-center justify-center h-screen px-4 ${rootCls}`}>
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-6.837m5.386.154c-.49-.49-.987-.995-1.489-1.489" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">CRM não instalado</h2>
          <p className="text-sm text-slate-400 mb-7">
            Configure seu Supabase antes de usar o CRM.
          </p>
          <a
            href="/install/start"
            className="block w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Ir para o instalador
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${rootCls}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!user) {
    if (blockedError) {
      return (
        <div className={`flex items-center justify-center h-screen px-4 ${rootCls}`}>
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Acesso bloqueado</h2>
            <p className="text-sm text-slate-400 mb-7">{blockedError}</p>
            <button
              onClick={clearBlockedError}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={rootCls}>
        <AuthPage
          onLogin={login}
          onRegister={register}
          onSignInWithGoogle={signInWithGoogle}
          onForgotPassword={forgotPassword}
          error={authError}
          successMessage={successMessage}
        />
        <DevSupabaseSwitcher />
      </div>
    );
  }

  return <div className={rootCls}>{children}</div>;
};

export default AuthGate;
