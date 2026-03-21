import { supabaseAdmin } from '../_lib/supabase.js';
import { requireAnyAuth } from '../_lib/apiKeyAuth.js';
import { AppError, apiError } from '../_lib/errors.js';

export default async function handler(req: any, res: any) {
  try {
    const ctx = await requireAnyAuth(req);

    // ── GET /api/v1/leads ────────────────────────────────────────
    if (req.method === 'GET') {
      const {
        status, board_id, owner_id,
        page  = '1',
        limit = '50',
      } = req.query as Record<string, string>;

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
        meta: {
          total: count ?? 0,
          page:  pageNum,
          limit: limitNum,
          pages: Math.ceil((count ?? 0) / limitNum),
        },
      });
    }

    // ── POST /api/v1/leads ───────────────────────────────────────
    if (req.method === 'POST') {
      const { name, email, phone, company_name, value, board_id, column_id, owner_id } = req.body ?? {};

      if (!name?.trim()) throw new AppError(400, 'O campo name é obrigatório.');

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
          owner_id:     owner_id     ?? null,
          status:       'NOVO',
        })
        .select()
        .single();

      if (error) throw new AppError(500, 'Erro ao criar lead.');
      return res.status(201).json({ data });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    return apiError(res, err);
  }
}
