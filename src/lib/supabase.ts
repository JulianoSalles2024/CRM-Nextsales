import { createClient } from '@supabase/supabase-js';
import { safeError } from '@/src/utils/logger';

// ── Runtime install config (priority 1) ──────────────────────────────────────
// The installer saves {url, anonKey} here after a successful installation so
// the app can connect to the correct Supabase immediately — before the Vercel
// redeploy (which bakes env vars into the build) has time to finish.
function readInstallConfig(): { url: string; anonKey: string } | null {
  try {
    const raw = localStorage.getItem('crm_supabase_config');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { url?: string; anonKey?: string };
    // .trim() previne JWT malformado caso o installer tenha salvo chaves com newlines
    if (parsed.url && parsed.anonKey) return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
  } catch { /* ignore parse errors */ }
  return null;
}

const installConfig = readInstallConfig();

// Priority: localStorage (post-install) → build-time env var (post-redeploy)
// .trim() em ambas as fontes previne JWT malformado por newlines nas env vars
export const supabaseUrl: string = (
  installConfig?.url ??
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  ''
).trim();

const supabaseAnonKey: string = (
  installConfig?.anonKey ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'NOT_CONFIGURED'
).trim();

if (!supabaseUrl) {
  safeError('[Supabase] ⚠️  Supabase URL não configurada. Execute o instalador primeiro.');
}

if (supabaseAnonKey === 'NOT_CONFIGURED') {
  safeError('[Supabase] ⚠️  VITE_SUPABASE_ANON_KEY não configurada.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey,
);
