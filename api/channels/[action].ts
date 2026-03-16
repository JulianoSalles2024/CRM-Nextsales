import { supabaseAdmin } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';
import { AppError, apiError } from '../_lib/errors.js';

/* ─────────────────────────────────────────────────────────────────────────
   Single entry-point for all /api/channels/:action routes.
   Vercel maps each [action] segment to this function.
───────────────────────────────────────────────────────────────────────── */
export default async function handler(req: any, res: any) {
  const action = req.query.action as string;
  switch (action) {
    case 'connect':        return handleConnect(req, res);
    case 'instance-state': return handleInstanceState(req, res);
    case 'register':       return handleRegister(req, res);
    case 'health':         return handleHealth(req, res);
    case 'send':           return handleSend(req, res);
    case 'disconnect':     return handleDisconnect(req, res);
    default:               return res.status(404).json({ error: `Unknown action: ${action}` });
  }
}

/* ── connect ─────────────────────────────────────────────────────────── */
async function handleConnect(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireAuth(req);
    const { userId, companyId } = ctx;

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const apiKey       = process.env.EVOLUTION_API_KEY;
    const n8nWebhook   = process.env.N8N_INBOUND_WEBHOOK_URL ?? '';

    if (!evolutionUrl || !apiKey) throw new AppError(500, 'Evolution API não configurada.');

    const instanceName = `ns_${userId.replace(/-/g, '').slice(0, 8)}`;

    const { data: existing } = await supabaseAdmin
      .from('channel_connections')
      .select('id, external_id')
      .eq('owner_id', userId)
      .eq('company_id', companyId)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    if (existing) {
      // Já registrado no banco — busca QR fresco para reconexão
      const qr = await fetchQRWithRetry(evolutionUrl, apiKey, existing.external_id ?? instanceName);
      return res.status(200).json({ instanceName: existing.external_id ?? instanceName, ...qr, alreadyRegistered: true });
    }

    console.log(`[connect] Criando instância: ${instanceName} | webhook: ${n8nWebhook || '(vazio)'}`);

    const createRes = await fetch(`${evolutionUrl}/instance/create`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        // Estrutura correta conforme docs Evolution API v2
        ...(n8nWebhook ? {
          webhook: {
            url: n8nWebhook,
            byEvents: false,
            base64: true,
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'SEND_MESSAGE'],
          },
        } : {}),
      }),
      signal: AbortSignal.timeout(12000),
    });

    const createBody = await createRes.json().catch(() => ({}));
    console.log(`[connect] Evolution create status: ${createRes.status}`, JSON.stringify(createBody).slice(0, 400));

    if (createRes.status === 401) {
      throw new AppError(502, `EVOLUTION_API_KEY inválida ou sem permissão (401).`);
    }

    // 403 = instância já existe na Evolution ("already in use") → ok, segue para fetchQR
    // 200/201 = criada com sucesso → também segue para fetchQR (create não retorna QR)
    // Qualquer outro status → loga e segue

    // Docs confirmam: create NUNCA retorna QR — sempre buscar via /instance/connect
    await new Promise(r => setTimeout(r, 2000)); // aguarda instância ficar pronta

    const qr = await fetchQRWithRetry(evolutionUrl, apiKey, instanceName);

    if (!qr.code && !qr.base64) {
      const hint = createRes.status === 403
        ? `Instância "${instanceName}" pode já existir na Evolution. Acesse o painel e delete-a manualmente, ou tente desconectar primeiro.`
        : `Evolution retornou status ${createRes.status}. Verifique as configurações.`;
      throw new AppError(502, hint);
    }

    return res.status(200).json({ instanceName, base64: qr.base64, code: qr.code, alreadyRegistered: false });
  } catch (err) { return apiError(res, err); }
}

async function fetchQRWithRetry(evolutionUrl: string, apiKey: string, instanceName: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(`${evolutionUrl}/instance/connect/${encodeURIComponent(instanceName)}`,
        { headers: { apikey: apiKey }, signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d = await r.json();
        // Evolution v2: { code: "raw-qr-string", pairingCode, count }
        // Evolution v1/legacy: { base64: "data:image/png;base64,..." }
        const code   = d?.code   ?? d?.qrcode?.code   ?? null;
        const base64 = d?.base64 ?? d?.qrcode?.base64 ?? null;
        console.log(`[fetchQR] attempt ${i + 1} — code: ${code ? 'ok' : 'null'} | base64: ${base64 ? 'ok' : 'null'}`);
        if (code || base64) return { code, base64 };
      } else {
        const errBody = await r.text().catch(() => '');
        console.log(`[fetchQR] attempt ${i + 1} — HTTP ${r.status} | body: ${errBody.slice(0, 200)}`);
      }
    } catch (e: any) {
      console.log(`[fetchQR] attempt ${i + 1} error: ${e?.message}`);
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 1500));
  }
  return { base64: null, code: null };
}

/* ── instance-state ──────────────────────────────────────────────────── */
async function handleInstanceState(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await requireAuth(req);
    const { name } = req.query;
    if (!name) throw new AppError(400, 'Parâmetro "name" obrigatório.');

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const apiKey       = process.env.EVOLUTION_API_KEY;
    if (!evolutionUrl || !apiKey) throw new AppError(500, 'Evolution API não configurada.');

    const instanceName = encodeURIComponent(name as string);
    const stateRes = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`,
      { headers: { apikey: apiKey }, signal: AbortSignal.timeout(6000) });

    if (!stateRes.ok) return res.status(200).json({ state: 'error', base64: null });

    const stateData = await stateRes.json();
    const state = stateData?.instance?.state ?? stateData?.state ?? 'unknown';

    let code: string | null   = null;
    let base64: string | null = null;
    if (state !== 'open') {
      try {
        const qrRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`,
          { headers: { apikey: apiKey }, signal: AbortSignal.timeout(6000) });
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          code   = qrData?.code   ?? qrData?.qrcode?.code   ?? null;
          base64 = qrData?.base64 ?? qrData?.qrcode?.base64 ?? null;
        }
      } catch { /* ignora */ }
    }

    return res.status(200).json({ state, code, base64 });
  } catch (err) { return apiError(res, err); }
}

/* ── register ────────────────────────────────────────────────────────── */
async function handleRegister(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireAuth(req);
    const { userId, companyId } = ctx;
    const { instanceName, displayName } = req.body ?? {};
    if (!instanceName) throw new AppError(400, 'instanceName obrigatório.');

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const apiKey       = process.env.EVOLUTION_API_KEY;

    if (evolutionUrl && apiKey) {
      const stateRes = await fetch(
        `${evolutionUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
        { headers: { apikey: apiKey }, signal: AbortSignal.timeout(6000) });
      if (stateRes.ok) {
        const sd = await stateRes.json();
        const state = sd?.instance?.state ?? sd?.state ?? 'unknown';
        if (state !== 'open') throw new AppError(400, `WhatsApp ainda não conectado (state: ${state}).`);
      }
    }

    const name = displayName?.trim() || `WhatsApp (${instanceName})`;
    const { data, error } = await supabaseAdmin
      .from('channel_connections')
      .upsert({
        company_id:  companyId,
        owner_id:    userId,
        channel:     'whatsapp',
        name,
        external_id: instanceName,
        status:      'active',
        is_active:   true,
        config: { evolution_url: evolutionUrl ?? null, api_key: apiKey ?? null },
        updated_at:  new Date().toISOString(),
      }, { onConflict: 'company_id,external_id' })
      .select()
      .single();

    if (error) throw new AppError(500, 'Erro ao registrar conexão no banco.');
    return res.status(201).json({ connection: data });
  } catch (err) { return apiError(res, err); }
}

/* ── health ──────────────────────────────────────────────────────────── */
async function handleHealth(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireAuth(req);
    const { companyId } = ctx;

    const { data: connections, error } = await supabaseAdmin
      .from('channel_connections')
      .select('id, name, channel, external_id, status, config, is_active, updated_at')
      .eq('company_id', companyId);

    if (error) throw new AppError(500, 'Erro ao buscar conexões.');

    const results = await Promise.all(
      (connections ?? []).map(async (conn: any) => {
        const base: Record<string, any> = {
          id: conn.id, name: conn.name, channel: conn.channel,
          external_id: conn.external_id, db_status: conn.status,
          is_active: conn.is_active, updated_at: conn.updated_at,
          evolution_state: 'unknown', evolution_error: null,
        };
        if (conn.channel !== 'whatsapp' || !conn.external_id) return base;

        const evolutionUrl = conn.config?.evolution_url ?? process.env.EVOLUTION_API_URL ?? null;
        const apiKey       = conn.config?.api_key       ?? process.env.EVOLUTION_API_KEY  ?? null;
        if (!evolutionUrl || !apiKey) { base.evolution_error = 'Evolution API não configurada.'; return base; }

        try {
          const r = await fetch(
            `${evolutionUrl.replace(/\/$/, '')}/instance/connectionState/${encodeURIComponent(conn.external_id)}`,
            { headers: { apikey: apiKey }, signal: AbortSignal.timeout(6000) });
          if (r.ok) {
            const j = await r.json();
            base.evolution_state = j?.instance?.state ?? j?.state ?? 'unknown';
          } else {
            base.evolution_state = 'error';
            base.evolution_error = `Evolution API retornou ${r.status}`;
          }
        } catch (e: any) {
          base.evolution_state = 'error';
          base.evolution_error = e?.message ?? 'Timeout ou conexão recusada';
        }
        return base;
      })
    );

    return res.status(200).json({ connections: results, checked_at: new Date().toISOString() });
  } catch (err) { return apiError(res, err); }
}

/* ── send ────────────────────────────────────────────────────────────── */
async function handleSend(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireAuth(req);
    const { conversationId, content } = req.body ?? {};

    if (!conversationId || typeof conversationId !== 'string') throw new AppError(400, 'conversationId é obrigatório.');
    if (!content || typeof content !== 'string' || !content.trim()) throw new AppError(400, 'content não pode ser vazio.');
    if (content.length > 4096) throw new AppError(400, 'Mensagem excede o limite de 4096 caracteres.');

    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('id, company_id, channel_connection_id, contact_identifier, assignee_id, status')
      .eq('id', conversationId)
      .eq('company_id', ctx.companyId)
      .maybeSingle();

    if (convError || !conversation) throw new AppError(404, 'Conversa não encontrada.');
    if (ctx.role !== 'admin' && conversation.assignee_id !== ctx.userId) throw new AppError(403, 'Você não é o responsável por esta conversa.');
    if (conversation.status !== 'in_progress') throw new AppError(400, 'Mensagens só podem ser enviadas em conversas em atendimento.');

    const { data: channel, error: channelError } = await supabaseAdmin
      .from('channel_connections')
      .select('id, name, external_id, channel')
      .eq('id', conversation.channel_connection_id)
      .eq('company_id', ctx.companyId)
      .maybeSingle();

    if (channelError || !channel) throw new AppError(500, 'Canal de comunicação não encontrado.');

    const webhookUrl = process.env.N8N_OUTBOUND_WEBHOOK_URL;
    if (!webhookUrl) throw new AppError(500, 'Webhook de saída não configurado.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let n8nRes: Response;
    try {
      n8nRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id, companyId: ctx.companyId,
          channelConnectionId: conversation.channel_connection_id,
          channelType: channel.channel, instanceName: channel.external_id,
          contactIdentifier: conversation.contact_identifier,
          content: content.trim(), agentId: ctx.userId,
        }),
        signal: controller.signal,
      });
    } finally { clearTimeout(timeout); }

    if (!n8nRes.ok) throw new AppError(502, 'Falha ao encaminhar mensagem. Tente novamente.');
    return res.status(200).json({ ok: true });
  } catch (err) { return apiError(res, err); }
}

/* ── disconnect ──────────────────────────────────────────────────────── */
async function handleDisconnect(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireAuth(req);
    const { userId, companyId } = ctx;

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const apiKey       = process.env.EVOLUTION_API_KEY;

    // Busca o external_id real da conexão do usuário (pode diferir do padrão ns_xxx)
    const { data: conn } = await supabaseAdmin
      .from('channel_connections')
      .select('id, external_id')
      .eq('owner_id', userId)
      .eq('company_id', companyId)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    // Tenta deletar instância na Evolution API — ignora erros (já pode não existir)
    if (evolutionUrl && apiKey && conn?.external_id) {
      try {
        await fetch(`${evolutionUrl}/instance/delete/${encodeURIComponent(conn.external_id)}`, {
          method: 'DELETE',
          headers: { apikey: apiKey },
          signal: AbortSignal.timeout(8000),
        });
      } catch { /* ignora erros de rede — garante limpeza local */ }
    }

    // Remove do banco — isolamento por owner_id + company_id
    const { error } = await supabaseAdmin
      .from('channel_connections')
      .delete()
      .eq('owner_id', userId)
      .eq('company_id', companyId)
      .eq('channel', 'whatsapp');

    if (error) throw new AppError(500, 'Erro ao remover conexão do banco.');

    return res.status(200).json({ ok: true });
  } catch (err) { return apiError(res, err); }
}
