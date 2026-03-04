import { createClient } from '@supabase/supabase-js';
import { safeError } from '@/src/utils/logger';

// Env vars injected by Vite (VITE_ prefix) at build / dev time.
// Fallback URL is the active project — safe to hardcode (it's public).
// Fallback key is a sentinel so createClient doesn't throw on missing env;
// all Supabase requests will fail with 401 until the real key is set.
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://fhkhamwrfwtacwydukvb.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'NOT_CONFIGURED';

if (supabaseAnonKey === 'NOT_CONFIGURED') {
  safeError(
    '[Supabase] ⚠️  VITE_SUPABASE_ANON_KEY não configurada!\n' +
    '  Adicione ao .env.local:\n' +
    '  VITE_SUPABASE_ANON_KEY=<anon key do projeto fhkhamwrfwtacwydukvb>',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
