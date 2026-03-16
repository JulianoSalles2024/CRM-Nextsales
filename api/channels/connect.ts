import { supabaseAdmin } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';
import { AppError, apiError } from '../_lib/errors.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ctx = await requireAuth(req);
    const { userId, companyId } = ctx;

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const apiKey      = process.env.EVOLUTION_API_KEY;
    const n8nWebhook  = process.env.N8N_INBOUND_WEBHOOK_URL ?? '';

    if (!evolutionUrl || !apiKey) throw new AppError(500, 'Evolution API não configurada.');

    // Instance name: determinístico por userId (ns_ + primeiros 8 hex chars)
    const instanceName = `ns_${userId.replace(/-/g, '').slice(0, 8)}`;

    // Verifica se já existe conexão registrada para este usuário
    const { data: existing } = await supabaseAdmin
      .from('channel_connections')
      .select('id, external_id')
      .eq('owner_id', userId)
      .eq('company_id', companyId)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    if (existing) {
      // Já registrado — apenas retorna QR fresco para reconectar
      const qr = await fetchQR(evolutionUrl, apiKey, instanceName);
      return res.status(200).json({ instanceName, ...qr, alreadyRegistered: true });
    }

    // Tenta criar nova instância na Evolution API
    const createRes = await fetch(`${evolutionUrl}/instance/create`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        webhook: n8nWebhook,
        webhook_by_events: false,
        webhook_base64: true,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'SEND_MESSAGE'],
      }),
      signal: AbortSignal.timeout(12000),
    });

    let base64: string | null = null;
    let code: string | null = null;

    if (createRes.ok) {
      const created = await createRes.json().catch(() => ({}));
      base64 = created?.qrcode?.base64 ?? created?.base64 ?? null;
      code   = created?.qrcode?.code   ?? created?.code   ?? null;
    }
    // Se create falhou (instância já existe na Evolution) ou não trouxe QR, busca diretamente
    if (!base64) {
      const qr = await fetchQR(evolutionUrl, apiKey, instanceName);
      base64 = qr.base64;
      code   = qr.code;
    }

    return res.status(200).json({ instanceName, base64, code, alreadyRegistered: false });
  } catch (err) {
    return apiError(res, err);
  }
}

async function fetchQR(evolutionUrl: string, apiKey: string, instanceName: string) {
  try {
    const res = await fetch(
      `${evolutionUrl}/instance/connect/${encodeURIComponent(instanceName)}`,
      { headers: { apikey: apiKey }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return { base64: null, code: null };
    const data = await res.json();
    return {
      base64: data?.base64 ?? data?.qrcode?.base64 ?? null,
      code:   data?.code   ?? data?.qrcode?.code   ?? null,
    };
  } catch {
    return { base64: null, code: null };
  }
}
