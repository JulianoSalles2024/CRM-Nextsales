import { testProviderConnection } from '../_utils.js';
import { requireAuth } from '../_lib/auth.js';
import { AppError, AuthError, apiError } from '../_lib/errors.js';

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
    // AppError / AuthError (validação interna ou auth) → resposta controlada
    if (err instanceof AppError || err instanceof AuthError) {
      return apiError(res, err);
    }
    // Erros de provider (OpenAI, Anthropic, Gemini) → 400 user-facing
    // Nota: erros do SDK têm .status mas não são AppError/AuthError;
    // passar por apiError() retornaria 500 genérico — evitado aqui.
    console.error('[api/ai/test-connection]', err);
    return res.status(400).json({
      success: false,
      message: 'Falha na conexão. Verifique a chave e o modelo selecionado.',
    });
  }
}
