import React from 'react';
import { useAuth } from './AuthContext';
import AuthPage from '@/components/AuthPage';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user, isLoading,
    login, register, signInWithGoogle, forgotPassword,
    authError, successMessage,
    blockedError, clearBlockedError,
  } = useAuth();

  const rootCls = "min-h-screen bg-[radial-gradient(ellipse_at_15%_50%,rgba(29,78,216,0.07)_0%,transparent_55%),linear-gradient(160deg,#060d1a_0%,#0a1628_50%,#060d1a_100%)]";

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
      </div>
    );
  }

  return <div className={rootCls}>{children}</div>;
};

export default AuthGate;
