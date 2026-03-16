import { requireAuth } from '../_lib/auth.js';
import { AppError, apiError } from '../_lib/errors.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireAuth(req);

    const { name } = req.query;
    if (!name) throw new AppError(400, 'Parâmetro "name" obrigatório.');

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const apiKey      = process.env.EVOLUTION_API_KEY;
    if (!evolutionUrl || !apiKey) throw new AppError(500, 'Evolution API não configurada.');

    const instanceName = encodeURIComponent(name as string);

    // Consulta estado da conexão
    const stateRes = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(6000),
    });

    if (!stateRes.ok) {
      return res.status(200).json({ state: 'error', base64: null });
    }

    const stateData = await stateRes.json();
    const state = stateData?.instance?.state ?? stateData?.state ?? 'unknown';

    // Se ainda não conectado, traz QR atualizado
    let base64: string | null = null;
    if (state !== 'open') {
      try {
        const qrRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
          headers: { apikey: apiKey },
          signal: AbortSignal.timeout(6000),
        });
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          base64 = qrData?.base64 ?? qrData?.qrcode?.base64 ?? null;
        }
      } catch { /* ignora erros de QR */ }
    }

    return res.status(200).json({ state, base64 });
  } catch (err) {
    return apiError(res, err);
  }
}
