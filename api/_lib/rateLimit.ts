// ── Rate limiter — sliding window via Upstash Redis ──────────────────
//
// Persiste entre cold starts do Vercel e entre instâncias paralelas.
// Usa a REST API do Upstash diretamente (sem dependência extra).
//
// Limite padrão: 20 requisições / minuto por userId.
// Fallback: permite a request se Redis estiver indisponível (fail-open).

const WINDOW_MS   = 60_000; // 1 minuto
const MAX_REQUESTS = 20;

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(commands: unknown[][]): Promise<unknown[]> {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);
  const data = await res.json() as { result: unknown }[];
  return data.map(d => d.result);
}

/**
 * Retorna true se o userId excedeu o limite da janela atual.
 * Em caso negativo, registra o timestamp da requisição corrente.
 */
export async function isRateLimited(userId: string): Promise<boolean> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    // Sem Redis configurado — fallback para in-memory (dev local)
    return inMemoryFallback(userId);
  }

  try {
    const key = `rl:${userId}`;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    // Pipeline: remove entradas antigas + adiciona atual + conta total
    const [, , countRaw] = await redisCommand([
      ['ZREMRANGEBYSCORE', key, '-inf', windowStart],
      ['ZADD', key, now, `${now}`],
      ['ZCARD', key],
      ['EXPIRE', key, 120], // TTL 2 min para limpeza automática
    ]);

    const count = Number(countRaw);
    return count > MAX_REQUESTS;
  } catch (err) {
    console.error('[rateLimit] Redis error, fail-open:', err);
    return false; // fail-open: permite a request se Redis der erro
  }
}

// ── Fallback in-memory para desenvolvimento local ─────────────────────
const _mem = new Map<string, number[]>();

function inMemoryFallback(userId: string): boolean {
  const now = Date.now();
  const recent = (_mem.get(userId) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    _mem.set(userId, recent);
    return true;
  }
  recent.push(now);
  _mem.set(userId, recent);
  return false;
}
