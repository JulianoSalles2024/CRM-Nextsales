import { requireAuth } from '../_lib/auth.js';
import { AppError, apiError } from '../_lib/errors.js';

export default async function handler(req: any, res: any) {
  try {
    // ── Autenticação obrigatória ──────────────────────────────
    await requireAuth(req);

    const { apiKey } = req.body || {};

    if (!apiKey) {
      throw new AppError(400, 'API key não enviada.');
    }

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      // Chave inválida → 400 com mensagem controlada (sem vazar resposta do provider)
      return res.status(400).json({ error: 'Chave inválida ou sem permissão.' });
    }

    return res.status(200).json({ status: "connected" });

  } catch (err) {
    // details: String(err) removido — não vaza stack trace para o cliente
    return apiError(res, err);
  }
}
