import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '../_lib/supabase.js';
import { requireAuth, requireRole } from '../_lib/auth.js';
import { AppError, apiError } from '../_lib/errors.js';

// Handles both /api/api-keys (list/create) and /api/api-keys/:id (delete)
export default async function handler(req: any, res: any) {
  try {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    const { companyId } = ctx;

    // Detect if there's an id segment: /api/api-keys/some-id
    const segments = (req.url as string).split('/').filter(Boolean);
    const id = segments[segments.length - 1] !== 'api-keys' ? segments[segments.length - 1] : null;

    // ── DELETE /api/api-keys/:id ────────────────────────────────
    if (req.method === 'DELETE' && id) {
      const { error } = await supabaseAdmin
        .from('api_keys')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw new AppError(500, 'Erro ao revogar chave.');
      return res.status(204).end();
    }

    // ── GET /api/api-keys — list ────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('id, name, key_preview, last_used_at, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw new AppError(500, 'Erro ao listar chaves.');
      return res.status(200).json({ keys: data ?? [] });
    }

    // ── POST /api/api-keys — create ─────────────────────────────
    if (req.method === 'POST') {
      const { name } = req.body ?? {};
      if (!name?.trim()) throw new AppError(400, 'Nome é obrigatório.');

      const raw     = `sk_live_${randomBytes(32).toString('hex')}`;
      const hash    = createHash('sha256').update(raw).digest('hex');
      const preview = `${raw.slice(0, 16)}...${raw.slice(-4)}`;

      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .insert({ company_id: companyId, name: name.trim(), key_hash: hash, key_preview: preview })
        .select('id, name, key_preview, last_used_at, created_at')
        .single();

      if (error) throw new AppError(500, 'Erro ao criar chave.');
      return res.status(201).json({ key: raw, ...data });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    return apiError(res, err);
  }
}
