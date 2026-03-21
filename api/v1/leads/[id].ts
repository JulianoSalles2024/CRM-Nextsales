import { supabaseAdmin } from '../../_lib/supabase.js';
import { requireAnyAuth } from '../../_lib/apiKeyAuth.js';
import { AppError, apiError } from '../../_lib/errors.js';

async function getLeadOrThrow(id: string, companyId: string) {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) throw new AppError(404, 'Lead não encontrado.');
  return data;
}

export default async function handler(req: any, res: any) {
  try {
    const ctx = await requireAnyAuth(req);
    const { id } = req.query as { id: string };

    await getLeadOrThrow(id, ctx.companyId);

    // ── GET /api/v1/leads/:id ────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new AppError(500, 'Erro ao buscar lead.');
      return res.status(200).json({ data });
    }

    // ── PUT /api/v1/leads/:id ────────────────────────────────────
    if (req.method === 'PUT') {
      const { name, email, phone, company_name, value, owner_id, description } = req.body ?? {};

      if (!name?.trim()) throw new AppError(400, 'O campo name é obrigatório.');

      const { data, error } = await supabaseAdmin
        .from('leads')
        .update({
          name:         name.trim(),
          email:        email        ?? null,
          phone:        phone        ?? null,
          company_name: company_name ?? null,
          value:        value        ?? null,
          owner_id:     owner_id     ?? null,
          description:  description  ?? null,
          updated_at:   new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(500, 'Erro ao atualizar lead.');
      return res.status(200).json({ data });
    }

    // ── DELETE /api/v1/leads/:id (soft delete) ───────────────────
    if (req.method === 'DELETE') {
      const { error } = await supabaseAdmin
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new AppError(500, 'Erro ao excluir lead.');
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    return apiError(res, err);
  }
}
