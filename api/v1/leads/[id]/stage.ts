import { supabaseAdmin } from '../../../_lib/supabase.js';
import { requireAnyAuth } from '../../../_lib/apiKeyAuth.js';
import { AppError, apiError } from '../../../_lib/errors.js';

// PATCH /api/v1/leads/:id/stage
// Body: { column_id: string }
export default async function handler(req: any, res: any) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const ctx = await requireAnyAuth(req);
    const { id } = req.query as { id: string };
    const { column_id } = req.body ?? {};

    if (!column_id) throw new AppError(400, 'O campo column_id é obrigatório.');

    // Verifica que o lead pertence à empresa
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, board_id')
      .eq('id', id)
      .eq('company_id', ctx.companyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!lead) throw new AppError(404, 'Lead não encontrado.');

    // Verifica que a coluna pertence à empresa
    const { data: stage } = await supabaseAdmin
      .from('board_stages')
      .select('id, name, linked_lifecycle_stage')
      .eq('id', column_id)
      .eq('company_id', ctx.companyId)
      .maybeSingle();

    if (!stage) throw new AppError(404, 'Coluna não encontrada nesta empresa.');

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update({
        column_id,
        board_id:      stage.linked_lifecycle_stage ? lead.board_id : lead.board_id,
        updated_at:    new Date().toISOString(),
        last_activity: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(500, 'Erro ao mover lead.');
    return res.status(200).json({ data, stage: { id: stage.id, name: stage.name } });
  } catch (err) {
    return apiError(res, err);
  }
}
