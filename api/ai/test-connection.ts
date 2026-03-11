import { testProviderConnection } from '../_utils.js';
import { requireAuth } from '../_lib/auth';
import { AppError, apiError } from '../_lib/errors';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── 1. Autenticação obrigatória ───────────────────────────
    await requireAuth(req);   // garante sessão válida; ctx não é necessário aqui

    const { provider, model, apiKey } = req.body;

    if (!provider || !model) {
      throw new AppError(400, 'provider e model são obrigatórios.');
    }

    // Rejeita placeholder — o teste deve sempre usar a chave real digitada.
    // Não buscamos mais chaves por userId livre (vetor de IDOR removido no hotfix).
    if (!apiKey || apiKey === '********') {
      throw new AppError(400, 'Insira uma API Key válida para testar a conexão.');
    }

    // ── 2. Testar conexão com o provedor ─────────────────────
    await testProviderConnection(provider, model, apiKey);

    return res.json({ success: true, message: 'Conexão estabelecida com sucesso!' });

  } catch (err: any) {
    // Erros de provider (chave inválida, modelo inexistente) → 400
    // Erros de infra → apiError() → 500 genérico
    if (err?.status === 401 || err?.status === 403 || err?.status === 400) {
      return apiError(res, err);
    }
    console.error('[api/ai/test-connection]', err);
    return res.status(400).json({
      success: false,
      message: 'Falha na conexão. Verifique a chave e o modelo selecionado.',
    });
  }
}
