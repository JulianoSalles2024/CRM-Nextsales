import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/src/lib/supabase';

// ── Types ──────────────────────────────────────────────────

interface Invite {
  token: string;
  role: string;
  company_id: string | null;
  used_at: string | null;
  expires_at: string | null;
}

type PageState =
  | { status: 'validating' }
  | { status: 'invalid'; message: string }
  | { status: 'form'; invite: Invite }
  | { status: 'submitting'; invite: Invite }
  | { status: 'error'; invite: Invite; message: string };

const safeError = (...args: unknown[]) => console.error(...args);
const safeWarn = (...args: unknown[]) => console.warn(...args);

// ── Main component ─────────────────────────────────────────

const InvitePage: React.FC<{ token: string }> = ({ token: pathToken }) => {
  // Support both /invite/:token (path) and ?token= (query string)
  const token =
    pathToken ||
    new URLSearchParams(window.location.search).get('token') ||
    '';

  const [state, setState] = useState<PageState>({ status: 'validating' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // ── PASSO 1–3: Validate invite on mount ─────────────────
  useEffect(() => {
    if (!token) {
      setState({ status: 'invalid', message: 'Token não encontrado na URL.' });
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .rpc('validate_invite', { p_token: token });

      if (error) {
        safeError('[InvitePage] validate_invite error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        setState({ status: 'invalid', message: 'Erro ao validar convite. Tente novamente.' });
        return;
      }

      if (!data || data.length === 0) {
        safeWarn('[InvitePage] token not found:', token);
        setState({ status: 'invalid', message: 'Convite não encontrado.' });
        return;
      }

      const invite = data[0] as Invite;

      if (invite.used_at) {
        setState({ status: 'invalid', message: 'Este convite já foi utilizado.' });
        return;
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setState({ status: 'invalid', message: 'Este convite expirou.' });
        return;
      }

      setState({ status: 'form', invite: { ...invite, token } });
    })();
  }, [token]);

  // ── PASSO 4–7: Handle signup ─────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (state.status !== 'form') return;
    const { invite } = state;

    setState({ status: 'submitting', invite });

    // PASSO 4 — Criar / recuperar usuário
    let userId: string | null = null;

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInData?.user) {
      userId = signInData.user.id;
    } else if (signInError && signInError.message === 'Invalid login credentials') {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            invite_token: token,
          },
        },
      });

      if (signUpError) {
        const is429 =
          signUpError.message.includes('429') ||
          signUpError.message.toLowerCase().includes('rate limit') ||
          signUpError.status === 429;

        setState({
          status: 'error',
          invite,
          message: is429
            ? 'Too many signup attempts. Please wait a few minutes.'
            : signUpError.message || 'Erro ao criar conta.',
        });
        return;
      }

      userId = signUpData?.user?.id ?? null;
    } else {
      setState({
        status: 'error',
        invite,
        message: signInError?.message || 'Erro ao autenticar.',
      });
      return;
    }

    if (!userId) {
      setState({ status: 'error', invite, message: 'Não foi possível obter o usuário.' });
      return;
    }

    // PASSO 5 — Aceitar convite via RPC
    const { data: inviteRow, error: inviteRowError } = await supabase
      .from('invites')
      .select('id')
      .eq('token', token)
      .single();

    if (inviteRowError || !inviteRow?.id) {
      setState({ status: 'error', invite, message: 'Não foi possível localizar o convite.' });
      return;
    }

    const { error: rpcError } = await supabase.rpc('accept_invite', {
      invite_id: inviteRow.id,
    });

    if (rpcError) {
      setState({ status: 'error', invite, message: rpcError.message });
      return;
    }

    // PASSO 6 — Redirecionar
    window.location.href = '/';
  };

  // ── Render ───────────────────────────────────────────────

  const inputClass =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0f1c3a] to-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-md border border-white/[0.06] rounded-2xl shadow-xl shadow-black/30 px-8 py-10">

        {state.status === 'validating' && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Validando convite...</p>
          </div>
        )}

        {state.status === 'invalid' && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Convite inválido</h1>
            <p className="text-slate-400 text-sm mb-8">{state.message}</p>
            <a href="/" className="block w-full py-3 rounded-xl text-sm font-semibold border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-all">
              Voltar ao início
            </a>
          </div>
        )}

        {(state.status === 'form' || state.status === 'submitting' || state.status === 'error') && (
          <>
            <div className="mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white text-center">Criar conta</h1>
              <p className="text-slate-400 text-sm text-center mt-1">
                Convite válido — preencha seus dados para continuar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Nome completo
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass}
                />
              </div>

              {state.status === 'error' && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400" role="alert">
                  {state.message}
                </div>
              )}

              <button
                type="submit"
                disabled={state.status === 'submitting'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.97] mt-2"
              >
                {state.status === 'submitting' && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {state.status === 'submitting' ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-600">
              Já tem uma conta?{' '}
              <a href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
                Entrar
              </a>
            </p>
          </>
        )}

      </div>
    </div>
  );
};

// ── Invalid token page (no token in URL at all) ────────────

export const InvalidTokenPage: React.FC = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0f1c3a] to-slate-950 px-4">
    <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-md border border-white/[0.06] rounded-2xl shadow-xl shadow-black/30 px-8 py-10 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Token inválido</h1>
      <p className="text-slate-400 text-sm mb-8">
        Este link de convite é inválido ou expirou. Solicite um novo convite.
      </p>
      <a href="/" className="block w-full py-3 rounded-xl text-sm font-semibold border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-all">
        Voltar ao início
      </a>
    </div>
  </div>
);

export default InvitePage;
