import { supabaseAdmin } from '../_lib/supabase.js';
import { requireAnyAuth } from '../_lib/apiKeyAuth.js';
import { AppError, apiError } from '../_lib/errors.js';
import { deliverWebhooks } from '../_lib/deliverWebhooks.js';

// ── Router interno ─────────────────────────────────────────────
// /api/v1/leads                    → leads()
// /api/v1/leads/:id                → leadById()
// /api/v1/leads/:id/stage          → leadStage()
// /api/v1/deliver                  → deliver()  ← Supabase DB webhook
export default async function handler(req: any, res: any) {
  // Parse path from URL directly — mais confiável que req.query.path no Vercel
  const rawPath = (req.url as string).split('?')[0];
  const segments = rawPath.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean);

  const [resource, id, action] = segments;

  try {
    // ── POST /api/v1/deliver — Supabase DB webhook receiver ──────
    if (resource === 'deliver') {
      return await handleDeliver(req, res);
    }

    if (resource !== 'leads') {
      return res.status(404).json({ error: 'Recurso não encontrado.' });
    }

    const ctx = await requireAnyAuth(req);

    if (!id)     return await handleLeads(req, res, ctx);
    if (!action) return await handleLeadById(req, res, ctx, id);
    if (action === 'stage') return await handleLeadStage(req, res, ctx, id);

    return res.status(404).json({ error: 'Rota não encontrada.' });
  } catch (err) {
    return apiError(res, err);
  }
}

// ── GET /api/v1/leads · POST /api/v1/leads ────────────────────
async function handleLeads(req: any, res: any, ctx: any) {
  if (req.method === 'GET') {
    const { status, board_id, owner_id, page = '1', limit = '50' } =
      req.query as Record<string, string>;

    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const from     = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('leads')
      .select(
        'id, name, email, phone, company_name, value, status, board_id, column_id, owner_id, created_at, updated_at',
        { count: 'exact' },
      )
      .eq('company_id', ctx.companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, from + limitNum - 1);

    if (status)   query = query.eq('status', status);
    if (board_id) query = query.eq('board_id', board_id);
    if (owner_id) query = query.eq('owner_id', owner_id);

    const { data, error, count } = await query;
    if (error) throw new AppError(500, 'Erro ao listar leads.');

    return res.status(200).json({
      data,
      meta: { total: count ?? 0, page: pageNum, limit: limitNum, pages: Math.ceil((count ?? 0) / limitNum) },
    });
  }

  if (req.method === 'POST') {
    const { name, email, phone, company_name, value, board_id, column_id, owner_id } = req.body ?? {};
    if (!name?.trim()) throw new AppError(400, 'O campo name é obrigatório.');

    // Resolve owner_id: usa o do body ou cai para o admin da empresa
    let resolvedOwner = owner_id ?? null;
    if (!resolvedOwner) {
      const { data: admin } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('company_id', ctx.companyId)
        .eq('role', 'admin')
        .limit(1)
        .single();
      resolvedOwner = admin?.id ?? ctx.userId;
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        company_id:   ctx.companyId,
        name:         name.trim(),
        email:        email        ?? null,
        phone:        phone        ?? null,
        company_name: company_name ?? null,
        value:        value        ?? null,
        board_id:     board_id     ?? null,
        column_id:    column_id    ?? null,
        owner_id:     resolvedOwner,
        status:       'NOVO',
      })
      .select()
      .single();

    if (error) throw new AppError(500, 'Erro ao criar lead.');
    await deliverWebhooks(ctx.companyId, 'lead.created', data);
    return res.status(201).json({ data });
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}

// ── GET · PUT · DELETE /api/v1/leads/:id ──────────────────────
async function handleLeadById(req: any, res: any, ctx: any, id: string) {
  const { data: existing } = await supabaseAdmin
    .from('leads').select('id').eq('id', id).eq('company_id', ctx.companyId).is('deleted_at', null).maybeSingle();
  if (!existing) throw new AppError(404, 'Lead não encontrado.');

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('leads').select('*').eq('id', id).single();
    if (error) throw new AppError(500, 'Erro ao buscar lead.');
    return res.status(200).json({ data });
  }

  if (req.method === 'PUT') {
    const { name, email, phone, company_name, value, owner_id, description } = req.body ?? {};
    if (!name?.trim()) throw new AppError(400, 'O campo name é obrigatório.');
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update({ name: name.trim(), email: email ?? null, phone: phone ?? null,
        company_name: company_name ?? null, value: value ?? null,
        owner_id: owner_id ?? null, description: description ?? null,
        updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw new AppError(500, 'Erro ao atualizar lead.');
    await deliverWebhooks(ctx.companyId, 'lead.updated', data);
    return res.status(200).json({ data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin
      .from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new AppError(500, 'Erro ao excluir lead.');
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}

// ── PATCH /api/v1/leads/:id/stage ─────────────────────────────
async function handleLeadStage(req: any, res: any, ctx: any, id: string) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método não permitido.' });

  const { column_id } = req.body ?? {};
  if (!column_id) throw new AppError(400, 'O campo column_id é obrigatório.');

  const { data: lead } = await supabaseAdmin
    .from('leads').select('id, board_id').eq('id', id).eq('company_id', ctx.companyId).is('deleted_at', null).maybeSingle();
  if (!lead) throw new AppError(404, 'Lead não encontrado.');

  const { data: stage } = await supabaseAdmin
    .from('board_stages').select('id, name').eq('id', column_id).eq('company_id', ctx.companyId).maybeSingle();
  if (!stage) throw new AppError(404, 'Coluna não encontrada.');

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update({ column_id, updated_at: new Date().toISOString(), last_activity: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw new AppError(500, 'Erro ao mover lead.');

  await deliverWebhooks(ctx.companyId, 'lead.stage_changed', { ...data, stage });
  return res.status(200).json({ data, stage });
}

// ── POST /api/v1/deliver — recebe DB webhook do Supabase ───────
async function handleDeliver(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });


  const { type, record, old_record } = req.body ?? {};

  // No evento DELETE do Supabase, record é null — dados ficam em old_record
  const data       = record ?? old_record;
  const companyId  = data?.company_id;
  if (!companyId) return res.status(400).json({ error: 'Payload inválido.' });

  if (type === 'INSERT') {
    await deliverWebhooks(companyId, 'lead.created', data);
  }

  if (type === 'DELETE') {
    await deliverWebhooks(companyId, 'lead.deleted', data);
  }

  if (type === 'UPDATE') {
    // Estágio mudou
    if (old_record?.column_id !== record.column_id) {
      await deliverWebhooks(companyId, 'lead.stage_changed', record);
    }
    // Lead ganho (convertido)
    if (!old_record?.won_at && record.won_at) {
      await deliverWebhooks(companyId, 'lead.converted', record);
    }
    // Lead perdido
    if (!old_record?.lost_at && record.lost_at) {
      await deliverWebhooks(companyId, 'lead.lost', record);
    }
    // Lead deletado via soft delete
    if (!old_record?.deleted_at && record.deleted_at) {
      await deliverWebhooks(companyId, 'lead.deleted', record);
    }
    // Atualização geral
    await deliverWebhooks(companyId, 'lead.updated', record);
  }

  return res.status(200).json({ ok: true });
}
