import { requireAuth } from '../_lib/auth.js';
import { apiError } from '../_lib/errors.js';
import { AppError } from '../_lib/errors.js';

const N8N_WEBHOOK_URL = process.env.N8N_OUTBOUND_WEBHOOK_URL;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── 1. Autenticação obrigatória — companyId vem do JWT ─────────
    const ctx = await requireAuth(req);

    if (!N8N_WEBHOOK_URL) {
      throw new AppError(500, 'Webhook de envio não configurado.');
    }

    const { conversationId, contactIdentifier, content, instanceName } = req.body;

    if (!conversationId || !contactIdentifier || !content || !instanceName) {
      throw new AppError(400, 'conversationId, contactIdentifier, content e instanceName são obrigatórios.');
    }

    // ── 2. Proxy para n8n — URL nunca exposta ao browser ──────────
    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        companyId: ctx.companyId,   // sempre do JWT, nunca do body
        contactIdentifier,
        content,
        agentId: ctx.userId,
        instanceName,
      }),
    });

    if (!n8nRes.ok) {
      const body = await n8nRes.json().catch(() => ({}));
      throw new AppError(502, (body as { error?: string }).error ?? 'Erro ao enviar mensagem via n8n.');
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    return apiError(res, err);
  }
}
