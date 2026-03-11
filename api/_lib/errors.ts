// ── Erros tipados da camada de API ────────────────────────────

/** Erro de autenticação ou autorização (4xx). */
export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Erro de negócio com status HTTP explícito (4xx). */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ── Resposta padronizada ──────────────────────────────────────
//
// Regra: nenhuma mensagem de erro interno chega ao cliente.
//
// AuthError e AppError → mensagem vai ao cliente (são mensagens
//   controladas, sem informação sensível de infra).
//
// Qualquer outro erro → mensagem genérica ao cliente,
//   detalhe completo apenas no log do servidor.
//
export function apiError(res: any, err: unknown): any {
  if (err instanceof AuthError || err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error('[api/error]', err);
  return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
}
