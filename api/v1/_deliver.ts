import { deliverWebhooks } from '../_lib/deliverWebhooks.js';

// ── POST /api/v1/_deliver ──────────────────────────────────────
//
// Chamado pelo Supabase Database Webhook quando um lead é
// inserido/atualizado diretamente pelo frontend (sem passar pelo
// endpoint REST da API).
//
// Configuração no Supabase Dashboard:
//   Database → Webhooks → Create webhook
//   Table:  leads
//   Events: INSERT, UPDATE
//   URL:    https://SEU-DOMINIO.vercel.app/api/v1/_deliver
//   Headers: x-webhook-secret: <SUPABASE_WEBHOOK_SECRET>
//
const SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // Valida o secret para garantir que veio do Supabase
  if (SECRET) {
    const incoming = req.headers['x-webhook-secret'];
    if (incoming !== SECRET) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
  }

  try {
    const { type, record, old_record } = req.body ?? {};

    if (!record?.company_id) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }

    // INSERT → lead.created
    if (type === 'INSERT') {
      await deliverWebhooks(record.company_id, 'lead.created', record);
    }

    // UPDATE com mudança de column_id → lead.stage_changed
    if (type === 'UPDATE' && old_record?.column_id !== record.column_id) {
      await deliverWebhooks(record.company_id, 'lead.stage_changed', record);
    }

    // UPDATE geral → lead.updated
    if (type === 'UPDATE') {
      await deliverWebhooks(record.company_id, 'lead.updated', record);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[_deliver]', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
}
