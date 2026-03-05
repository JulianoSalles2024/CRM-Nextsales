/**
 * POST /api/install/migrate
 *
 * Executa migrations pendentes server-side via Supabase Management API.
 * Roda como Vercel serverless function — sem restrição de CORS.
 *
 * Body: { supabaseUrl: string, supabasePatToken: string }
 * Resposta OK: { ran: string[], skipped: string[] }
 * Resposta erro: { error: string }
 *
 * Os arquivos SQL são lidos do filesystem em runtime (incluídos no bundle
 * da função via "includeFiles" em vercel.json).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

// ── Helpers ───────────────────────────────────────────────────

function extractProjectRef(supabaseUrl: string): string {
  const match = supabaseUrl.trim().match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match?.[1]) {
    throw new Error(
      'URL do Supabase inválida. Formato esperado: https://<ref>.supabase.co',
    );
  }
  return match[1];
}

async function runSql(
  projectRef: string,
  patToken: string,
  sql: string,
): Promise<void> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.message ?? body?.error ?? `HTTP ${res.status} ao executar SQL`,
    );
  }
}

async function getExecutedVersions(
  projectRef: string,
  patToken: string,
): Promise<Set<string>> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'select version from schema_migrations order by executed_at',
      }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message: string = body?.message ?? body?.error ?? '';

    // schema_migrations ainda não existe — esperado na primeira instalação.
    // 001_init.sql criará a tabela.
    if (
      message.includes('schema_migrations') ||
      message.includes('42P01') ||
      message.includes('does not exist')
    ) {
      return new Set();
    }

    throw new Error(
      `Erro ao consultar schema_migrations: ${message || `HTTP ${res.status}`}`,
    );
  }

  const data = await res.json();
  const rows: Array<{ version: string }> = Array.isArray(data)
    ? data
    : (data?.rows ?? []);

  return new Set(rows.map((r) => r.version));
}

async function recordVersion(
  projectRef: string,
  patToken: string,
  version: string,
): Promise<void> {
  await runSql(
    projectRef,
    patToken,
    `insert into schema_migrations (version) values ('${version}') on conflict (version) do nothing`,
  );
}

// ── Handler ───────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[migrate] request received', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { supabaseUrl, supabasePatToken } = (req.body ?? {}) as {
    supabaseUrl?: string;
    supabasePatToken?: string;
  };

  console.log('[migrate] body parsed — supabaseUrl present:', !!supabaseUrl, '| pat present:', !!supabasePatToken);

  if (!supabaseUrl || !supabasePatToken) {
    console.log('[migrate] returning 400: missing fields');
    return res.status(400).json({
      error: 'supabaseUrl e supabasePatToken são obrigatórios.',
    });
  }

  try {
    const ref = extractProjectRef(supabaseUrl);
    console.log('[migrate] project ref:', ref);

    // Lê os arquivos .sql de supabase/migrations/ (disponíveis em runtime
    // via "includeFiles" configurado em vercel.json).
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    console.log('[migrate] migrationsDir:', migrationsDir);
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // prefixo numérico garante ordem correta: 001_, 002_, ...
    console.log('[migrate] files found:', files);

    const migrations = files.map((filename) => ({
      version: filename.replace('.sql', ''),
      sql: fs.readFileSync(path.join(migrationsDir, filename), 'utf-8'),
    }));

    const executed = await getExecutedVersions(ref, supabasePatToken);
    const ran: string[] = [];
    const skipped: string[] = [];

    for (const migration of migrations) {
      if (executed.has(migration.version)) {
        skipped.push(migration.version);
        continue;
      }

      await runSql(ref, supabasePatToken, migration.sql);
      await recordVersion(ref, supabasePatToken, migration.version);
      ran.push(migration.version);
    }

    console.log('[migrate] returning 200 —', { ran, skipped });
    return res.status(200).json({ ran, skipped });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Erro interno ao executar migrations.';
    console.error('[migrate] error:', message);
    return res.status(500).json({ error: message });
  }
}
