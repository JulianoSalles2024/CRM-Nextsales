import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Validação de variáveis obrigatórias ───────────────────────
// Falha explicitamente no boot da Function se as vars estiverem
// ausentes — melhor do que um erro críptico em runtime.
if (!process.env.SUPABASE_URL) {
  throw new Error('[api/_lib/supabase] SUPABASE_URL não configurada.');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('[api/_lib/supabase] SUPABASE_SERVICE_ROLE_KEY não configurada.');
}

// ── Cliente singleton com service_role ────────────────────────
// service_role bypassa RLS completamente.
// Este módulo deve ser importado APENAS dentro de api/ — nunca no frontend.
// O frontend usa o cliente com anon key em src/lib/supabase.ts.
// .trim() previne falhas causadas por newlines acidentais nas env vars
// (erro comum ao copiar chaves do dashboard Supabase)
export const supabaseAdmin: SupabaseClient = createClient(
  process.env.SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
);
