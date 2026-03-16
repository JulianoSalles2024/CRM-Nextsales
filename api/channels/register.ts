import { supabaseAdmin } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';
import { AppError, apiError } from '../_lib/errors.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ctx = await requireAuth(req);
    const { userId, companyId } = ctx;

    const { instanceName, displayName } = req.body ?? {};
    if (!instanceName) throw new AppError(400, 'instanceName obrigatório.');

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const apiKey      = process.env.EVOLUTION_API_KEY;

    // Confirma que a instância está realmente conectada antes de salvar
    if (evolutionUrl && apiKey) {
      const stateRes = await fetch(
        `${evolutionUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
        { headers: { apikey: apiKey }, signal: AbortSignal.timeout(6000) }
      );
      if (stateRes.ok) {
        const sd = await stateRes.json();
        const state = sd?.instance?.state ?? sd?.state ?? 'unknown';
        if (state !== 'open') throw new AppError(400, `WhatsApp ainda não conectado (state: ${state}).`);
      }
    }

    const name = displayName?.trim() || `WhatsApp (${instanceName})`;

    const { data, error } = await supabaseAdmin
      .from('channel_connections')
      .upsert(
        {
          company_id:  companyId,
          owner_id:    userId,
          channel:     'whatsapp',
          name,
          external_id: instanceName,
          status:      'active',
          is_active:   true,
          config: {
            evolution_url: evolutionUrl ?? null,
            api_key:       apiKey ?? null,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,external_id' }
      )
      .select()
      .single();

    if (error) throw new AppError(500, 'Erro ao registrar conexão no banco.');
    return res.status(201).json({ connection: data });
  } catch (err) {
    return apiError(res, err);
  }
}
