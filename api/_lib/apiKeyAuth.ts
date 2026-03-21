import { createHash } from 'crypto';
import { supabaseAdmin } from './supabase.js';
import { requireAuth } from './auth.js';
import type { AuthContext } from './auth.js';
import { AuthError } from './errors.js';

// ── Valida sk_live_* e retorna AuthContext ─────────────────────
async function requireApiKeyAuth(req: any): Promise<AuthContext> {
  const raw = (req.headers['authorization'] ?? req.headers['Authorization']) as string | undefined;
  const key = raw?.replace(/^Bearer\s+/i, '').trim();

  if (!key?.startsWith('sk_live_')) {
    throw new AuthError(401, 'API key inválida ou ausente.');
  }

  const hash = createHash('sha256').update(key).digest('hex');

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, company_id')
    .eq('key_hash', hash)
    .maybeSingle();

  if (error || !data) {
    throw new AuthError(401, 'API key inválida ou revogada.');
  }

  // Atualiza last_used_at sem bloquear a resposta
  supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {});

  return {
    userId:    data.id,
    companyId: data.company_id,
    role:      'admin',
  };
}

// ── Aceita tanto JWT Supabase quanto sk_live_ ──────────────────
export async function requireAnyAuth(req: any): Promise<AuthContext> {
  const raw = (req.headers['authorization'] ?? req.headers['Authorization']) as string | undefined;
  const token = raw?.replace(/^Bearer\s+/i, '').trim() ?? '';

  if (token.startsWith('sk_live_')) {
    return requireApiKeyAuth(req);
  }

  return requireAuth(req);
}
