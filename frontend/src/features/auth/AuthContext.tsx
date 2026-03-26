import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';
import { type AppRole, type Permissions, PERMISSIONS } from '@/src/lib/permissions';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isRoleReady: boolean;
  currentUserRole: AppRole;
  currentPermissions: Permissions;
  companyId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  successMessage: string | null;
  blockedError: string | null;
  clearBlockedError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole>('user');
  const [isRoleReady, setIsRoleReady] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [blockedError, setBlockedError] = useState<string | null>(null);
  const clearBlockedError = () => setBlockedError(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Save consent to DB after login (requires user_id)
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem('ns_consent_v1');
      if (!raw) return;
      const consent = JSON.parse(raw) as { accepted_at?: string; policy_version?: string; user_agent?: string; synced?: boolean };
      if (consent.synced) return;
      supabase
        .from('consent_logs')
        .insert({
          user_id: user.id,
          policy_version: consent.policy_version ?? 'v1.0',
          accepted_at: consent.accepted_at,
          user_agent: consent.user_agent,
        })
        .then(({ error }) => {
          if (error) {
            console.error('[AuthContext] consent save failed:', error);
          } else {
            // Mark as synced so it doesn't insert again on next login
            localStorage.setItem('ns_consent_v1', JSON.stringify({ ...consent, synced: true }));
          }
        });
    } catch { /* ignore */ }
  }, [user]);

  // Fetch role + is_active from profiles whenever user changes
  useEffect(() => {
    setIsRoleReady(false);
    if (!user) {
      setCurrentUserRole('user');
      setCompanyId(null);
      setIsRoleReady(true);
      return;
    }
    supabase
      .from('profiles')
      .select('role, is_active, company_id')
      .eq('id', user.id)
      .single()
      .then(async ({ data, error }) => {
        if (error) {
          console.error('[AuthContext] profile query error:', error.message, '| code:', error.code);
          // Keep safe default — do NOT silently show wrong role
          setCurrentUserRole('user');
          setIsRoleReady(true);
          return;
        }

        if (!data) {
          console.warn('[AuthContext] no profile found for user:', user.id);
          setCurrentUserRole('user');
          setIsRoleReady(true);
          return;
        }

        if (data.is_active === false) {
          setBlockedError('Usuário bloqueado. Contate o administrador.');
          supabase.auth.signOut();
          return;
        }

        // Verifica expiração do convite para usuários que se cadastraram via link de convite
        const inviteToken = user.user_metadata?.invite_token as string | undefined;
        if (inviteToken) {
          const { data: invite } = await supabase
            .from('invites')
            .select('expires_at')
            .eq('token', inviteToken)
            .maybeSingle();

          if (invite?.expires_at && new Date(invite.expires_at) < new Date()) {
            setBlockedError('Acesso expirado. Contate o administrador.');
            supabase.auth.signOut();
            return;
          }
        }

        const role = (data.role as AppRole) ?? 'user';
        console.log('[AuthContext] role loaded:', role, '| company_id:', data.company_id);
        setCurrentUserRole(role);
        setCompanyId((data.company_id as string) ?? null);
        setIsRoleReady(true);
      });
  }, [user]);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    setBlockedError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  };

  const register = async (name: string, email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, name } },
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setSuccessMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
  };

  const forgotPassword = async (email: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setSuccessMessage('E-mail de recuperação enviado. Verifique sua caixa de entrada.');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const currentPermissions = PERMISSIONS[currentUserRole];

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, isRoleReady,
      currentUserRole, currentPermissions,
      companyId,
      login, register, signInWithGoogle, forgotPassword, logout,
      authError, successMessage,
      blockedError, clearBlockedError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
