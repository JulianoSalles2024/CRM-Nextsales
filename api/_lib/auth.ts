import { supabaseAdmin } from './supabase.js';
import { AuthError } from './errors.js';

// ── Contexto de autenticação retornado por requireAuth() ──────
export interface AuthContext {
  userId: string;
  companyId: string;             // sempre derivado do JWT — nunca do request
  role: 'admin' | 'seller' | 'user';
}

// ── requireAuth ───────────────────────────────────────────────
//
// Valida o JWT do header Authorization e retorna o contexto
// seguro do usuário autenticado.
//
// Fluxo:
//   1. Extrai o Bearer token do header
//   2. Valida o token via supabase.auth.getUser() (verifica assinatura + expiração)
//   3. Busca company_id e role do perfil no banco
//   4. Retorna AuthContext — nunca confia em dados do request body
//
// Lança AuthError (401/403) se qualquer etapa falhar.
// O chamador deve capturar via apiError() para resposta padronizada.
//
export async function requireAuth(req: any): Promise<AuthContext> {
  const raw = (
    req.headers['authorization'] ?? req.headers['Authorization']
  ) as string | undefined;

  const token = raw?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw new AuthError(401, 'Token de autenticação obrigatório.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    throw new AuthError(401, 'Token inválido ou expirado.');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    throw new AuthError(403, 'Perfil sem empresa associada. Contate o suporte.');
  }

  return {
    userId: user.id,
    companyId: profile.company_id,
    role: profile.role as AuthContext['role'],
  };
}

// ── requireRole ───────────────────────────────────────────────
//
// Verifica se o usuário autenticado possui o role exigido.
// Deve ser chamado APÓS requireAuth().
// Lança AuthError(403) se o role for insuficiente.
//
export function requireRole(ctx: AuthContext, role: 'admin'): void {
  if (ctx.role !== role) {
    throw new AuthError(403, 'Permissão insuficiente.');
  }
}
