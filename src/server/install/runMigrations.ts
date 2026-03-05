/**
 * runMigrations — executa migrations pendentes via Supabase Management API.
 *
 * Fonte única de schema: supabase/migrations/*.sql
 * Os arquivos são carregados em tempo de build pelo Vite (import.meta.glob).
 *
 * Fluxo:
 *  1. Carrega todos os arquivos *.sql de supabase/migrations/ (bundled pelo Vite)
 *  2. Ordena por nome de arquivo (prefixo numérico garante ordem correta)
 *  3. Consulta schema_migrations para verificar quais já foram executadas
 *  4. Executa apenas as pendentes, em ordem
 *  5. Registra cada versão em schema_migrations após execução bem-sucedida
 *
 * Falhas são fatais — erros são lançados para o caller (installService).
 * PAT do Supabase é obrigatório.
 */

// Carrega todos os arquivos SQL de supabase/migrations/ em tempo de build.
// O Vite substitui este glob por um objeto estático contendo o conteúdo
// de cada arquivo como string. Nenhum arquivo SQL é lido em runtime.
const migrationModules = import.meta.glob('/supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Ordena pelos nomes de arquivo (prefixo numérico: 001_, 002_, ...)
// e extrai version = nome do arquivo sem extensão.
const MIGRATIONS = Object.entries(migrationModules)
  .map(([path, sql]) => ({
    version: path.split('/').pop()!.replace('.sql', ''),
    sql: sql as string,
  }))
  .sort((a, b) => a.version.localeCompare(b.version));

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

    // schema_migrations ainda não existe (primeira instalação).
    // 001_init.sql criará a tabela — comportamento esperado.
    if (
      message.includes('schema_migrations') ||
      message.includes('42P01') ||
      message.includes('does not exist')
    ) {
      return new Set();
    }

    throw new Error(`Erro ao consultar schema_migrations: ${message || `HTTP ${res.status}`}`);
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

// ── Public API ────────────────────────────────────────────────

/**
 * Executa todas as migrations pendentes em ordem.
 *
 * @throws {Error} se o PAT for inválido, a URL for inválida, ou qualquer
 *                 migration falhar. Erros são intencionalmente fatais —
 *                 o installer não deve avançar com schema incompleto.
 */
export async function runMigrations(
  supabaseUrl: string,
  patToken: string,
): Promise<{ ran: string[]; skipped: string[] }> {
  const ref = extractProjectRef(supabaseUrl);
  const executed = await getExecutedVersions(ref, patToken);

  const ran: string[] = [];
  const skipped: string[] = [];

  for (const migration of MIGRATIONS) {
    if (executed.has(migration.version)) {
      skipped.push(migration.version);
      continue;
    }

    // Executa o SQL. Lança em caso de falha — sem catch aqui.
    await runSql(ref, patToken, migration.sql);

    // Registra a versão somente após execução bem-sucedida.
    await recordVersion(ref, patToken, migration.version);

    ran.push(migration.version);
  }

  return { ran, skipped };
}
