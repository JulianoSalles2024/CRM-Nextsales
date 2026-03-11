import { supabaseAdmin } from '../_lib/supabase';
import { requireAuth, requireRole } from '../_lib/auth';
import { AppError, apiError } from '../_lib/errors';

export default async function handler(req: any, res: any) {
  try {
    // ── 1. Autenticação obrigatória para todos os métodos ─────
    const ctx = await requireAuth(req);

    // ── GET: listar credenciais da empresa autenticada ─────────
    if (req.method === 'GET') {
      // ctx.companyId vem do JWT — organizationId do query param é ignorado.
      const { data, error } = await supabaseAdmin
        .from('organization_ai_credentials')
        .select('ai_provider, ai_api_key, model')
        .eq('organization_id', ctx.companyId);

      if (error) {
        throw new AppError(500, 'Falha ao buscar credenciais.');
      }

      if (!data || data.length === 0) return res.json({});

      const result: Record<string, object> = {};
      for (const row of data) {
        result[row.ai_provider] = {
          provider: row.ai_provider,
          model: row.model,
          status: 'connected',
          apiKey: '********',   // chave real nunca retorna ao cliente
        };
      }

      return res.json(result);
    }

    // ── POST: criar / atualizar / desconectar (admin only) ─────
    if (req.method === 'POST') {
      requireRole(ctx, 'admin');   // 403 para seller / user

      const body = req.body || {};
      // organizationId do body é ignorado — nunca confiamos em IDs do cliente.
      const { provider, apiKey, model, action } = body;

      if (action === 'disconnect') {
        if (!provider) {
          throw new AppError(400, 'provider é obrigatório.');
        }

        const { error } = await supabaseAdmin
          .from('organization_ai_credentials')
          .delete()
          .eq('organization_id', ctx.companyId)   // companyId do JWT
          .eq('ai_provider', provider);

        if (error) throw new AppError(500, 'Falha ao desconectar.');
        return res.json({ success: true });
      }

      if (!provider || !model) {
        throw new AppError(400, 'provider e model são obrigatórios.');
      }

      let finalKey = apiKey;
      if (!apiKey || apiKey === '********') {
        const { data: existing } = await supabaseAdmin
          .from('organization_ai_credentials')
          .select('ai_api_key')
          .eq('organization_id', ctx.companyId)   // companyId do JWT
          .eq('ai_provider', provider)
          .single();

        if (!existing?.ai_api_key) {
          throw new AppError(400, 'API key é obrigatória.');
        }
        finalKey = existing.ai_api_key;
      }

      const { error } = await supabaseAdmin
        .from('organization_ai_credentials')
        .upsert(
          {
            organization_id: ctx.companyId,        // companyId do JWT
            ai_provider: provider,
            ai_api_key: finalKey,
            model,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,ai_provider' },
        );

      if (error) throw new AppError(500, 'Falha ao salvar credencial.');
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    return apiError(res, err);
  }
}
