import type { InstallState } from '../context/InstallContext';

function normalizeUrl(url: string) {
  return url.trim().replace(/\/$/, '');
}

// ── 1. Verificar infraestrutura ───────────────────────────────────────────────
// Tests both tokens and auto-detects the Vercel project (matches current domain
// or falls back to the first project in the account).
export async function verificarInfraestrutura(
  state: InstallState,
): Promise<{ vercelProjectId: string }> {
  // Verify Vercel token
  const vRes = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${state.vercelToken}` },
  });
  if (!vRes.ok) {
    throw new Error('Token da Vercel inválido. Verifique e tente novamente.');
  }

  // Verify Supabase connection
  const sbUrl = normalizeUrl(state.supabaseUrl);
  const sRes = await fetch(`${sbUrl}/rest/v1/`, {
    headers: {
      Authorization: `Bearer ${state.supabaseServiceKey}`,
      apikey: state.supabaseServiceKey,
    },
  });
  if (!sRes.ok) {
    throw new Error('Não foi possível conectar ao Supabase. Verifique a URL e o token.');
  }

  // List Vercel projects and match current hostname (or use first)
  const pRes = await fetch('https://api.vercel.com/v9/projects?limit=20', {
    headers: { Authorization: `Bearer ${state.vercelToken}` },
  });
  if (!pRes.ok) throw new Error('Erro ao listar projetos da Vercel.');
  const { projects } = await pRes.json();
  if (!projects?.length) throw new Error('Nenhum projeto encontrado na Vercel.');

  const hostname = window.location.hostname;
  const matched = projects.find((p: any) =>
    p.alias?.some((a: any) => (a.domain ?? '').includes(hostname)),
  );
  const project = matched ?? projects[0];

  return { vercelProjectId: project.id as string };
}

// ── 2. Criar variáveis de ambiente na Vercel ──────────────────────────────────
export async function criarEnvVars(
  state: InstallState,
  projectId: string,
): Promise<void> {
  const sbUrl = normalizeUrl(state.supabaseUrl);

  const vars = [
    { key: 'VITE_SUPABASE_URL',      value: sbUrl,                 type: 'plain', target: ['production'] },
    { key: 'VITE_SUPABASE_ANON_KEY', value: state.supabaseAnonKey, type: 'plain', target: ['production'] },
    { key: 'SUPABASE_SERVICE_ROLE_KEY',     value: state.supabaseServiceKey,  type: 'encrypted', target: ['production'] },
  ];

  for (const v of vars) {
    const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(v),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Vercel returns 400 + ENV_ALREADY_EXISTS when the variable was created
      // by a previous run. This is expected on retries — skip and continue.
      if (err?.error?.code === 'ENV_ALREADY_EXISTS') continue;
      throw new Error(err.error?.message ?? `Erro ao criar variável ${v.key}.`);
    }
  }
}

// ── 3. Criar usuário administrador no Supabase Auth ───────────────────────────
export async function criarAdmin(state: InstallState): Promise<string> {
  const sbUrl = normalizeUrl(state.supabaseUrl);

  const res = await fetch(`${sbUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${state.supabaseServiceKey}`,
      apikey: state.supabaseServiceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: state.adminEmail,
      password: state.adminPassword,
      email_confirm: true,
      user_metadata: { full_name: state.adminName, role: 'admin' },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[install] criarAdmin error body:', text);

    let err: any = {};
    try { err = JSON.parse(text); } catch { /* raw text */ }

    // Usuário já existe (retry do installer) — busca o ID e continua.
    if (err?.error_code === 'email_exists') {
      console.info('[install] criarAdmin: usuário já existe, buscando ID...');
      const listRes = await fetch(`${sbUrl}/auth/v1/admin/users?per_page=200`, {
        headers: {
          Authorization: `Bearer ${state.supabaseServiceKey}`,
          apikey: state.supabaseServiceKey,
        },
      });
      if (listRes.ok) {
        const { users } = await listRes.json();
        const found = (users as any[]).find((u: any) => u.email === state.adminEmail);
        if (found?.id) {
          console.info('[install] criarAdmin: ID recuperado:', found.id);
          return found.id as string;
        }
      }
      throw new Error('Usuário já existe mas não foi possível recuperar o ID. Tente novamente.');
    }

    throw new Error(err?.msg ?? err?.message ?? 'Erro ao criar usuário administrador.');
  }

  const data = await res.json();
  return data.id as string;
}

// ── 4. Rodar migrations ───────────────────────────────────────────────────────
// Delegates to /api/install/migrate (Vercel serverless function).
// The Management API call happens server-side — sem bloqueio de CORS.
// PAT is required — throws if absent or if the API returns error.
export async function rodarMigrations(
  state: InstallState,
  signal?: AbortSignal,
): Promise<void> {
  if (!state.supabasePatToken) {
    throw new Error(
      'Token PAT do Supabase é obrigatório para executar as migrations. ' +
      'Informe o token no campo "Supabase PAT" da etapa anterior.',
    );
  }

  console.log('[install] calling /api/install/migrate');

  let res: Response;
  try {
    res = await fetch('/api/install/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabaseUrl:      normalizeUrl(state.supabaseUrl),
        supabasePatToken: state.supabasePatToken,
      }),
      signal,
    });
  } catch (fetchErr) {
    console.error('[install] fetch threw (network error / abort):', fetchErr);
    throw fetchErr;
  }

  console.log('[install] migrate response status:', res.status);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.error ?? `Erro ao executar migrations (HTTP ${res.status}).`,
    );
  }

  console.info('[install] Migrations ran:', data.ran, '| skipped:', data.skipped);
}

// ── 5. Verificar perfil do administrador ─────────────────────────────────────
// Reads the profile created by the handle_new_user + bootstrap_company triggers
// and asserts that role='admin' and company_id are set correctly.
// Throws a descriptive error if the state is inconsistent so the installer
// stops before redeploy with a clear message — not after a silent failure.
export async function verificarPerfil(
  state: InstallState,
  adminUserId: string,
): Promise<void> {
  const sbUrl = normalizeUrl(state.supabaseUrl);

  const res = await fetch(
    `${sbUrl}/rest/v1/profiles?id=eq.${adminUserId}&select=role,company_id`,
    {
      headers: {
        Authorization: `Bearer ${state.supabaseServiceKey}`,
        apikey: state.supabaseServiceKey,
        Accept: 'application/json',
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Erro ao verificar perfil do administrador (HTTP ${res.status}).`);
  }

  const rows = await res.json();
  const profile = rows?.[0];

  if (!profile) {
    throw new Error(
      'Perfil do administrador não foi criado. Verifique se as migrations foram executadas antes da criação do usuário.',
    );
  }

  if (profile.role !== 'admin') {
    throw new Error(
      `Perfil criado com role incorreto: "${profile.role}". Esperado: "admin". Verifique se o trigger handle_new_user está instalado.`,
    );
  }

  if (!profile.company_id) {
    throw new Error(
      'Empresa não foi criada automaticamente. O perfil do administrador está sem company_id. Verifique se o trigger bootstrap_company_for_new_user está instalado.',
    );
  }
}

// ── 5. Acionar redeploy na Vercel ─────────────────────────────────────────────
export async function triggerRedeploy(
  vercelToken: string,
  projectId: string,
): Promise<void> {
  // Get the latest production deployment
  const dRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=1`,
    { headers: { Authorization: `Bearer ${vercelToken}` } },
  );
  if (!dRes.ok) throw new Error('Erro ao buscar deployments da Vercel.');

  const { deployments } = await dRes.json();
  if (!deployments?.length) return; // Nothing to redeploy on a fresh project

  const deployment = deployments[0];
  const rRes = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deploymentId: deployment.uid,
      name: deployment.name,
      target: 'production',
    }),
  });

  if (!rRes.ok) {
    const err = await rRes.json().catch(() => ({}));
    throw new Error(err.error?.message ?? 'Erro ao acionar redeploy na Vercel.');
  }
}
