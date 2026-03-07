import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Supabase (service role — bypasses RLS) ────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Response shape ────────────────────────────────────────────
interface OpportunityItem {
  lead_id: string;
  lead_name: string;
  column_id: string | null;
  owner_id: string | null;
  conversion_score: number;
  upsell_score: number;
  risk_score: number;
  priority_band: string;
  next_best_action: string | null;
  explanation: string | null;
  last_analyzed_at: string;
}

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── 1. Validar sessão via Authorization header ────────────
  const authHeader = (req.headers['authorization'] ?? req.headers['Authorization']) as string | undefined;
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Authorization token required.' });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    // ── 2. Identificar company_id do usuário autenticado ──────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return res.status(400).json({ error: 'Perfil ou empresa não encontrados.' });
    }

    const companyId: string = profile.company_id;

    // ── 3. Buscar oportunidades com dados do lead via join ────
    // Ordenação comercial: leads quentes primeiro, depois upsell,
    // depois risco — vendedor vê o que mais importa no topo.
    const { data: scores, error: scoresError } = await supabase
      .from('lead_opportunity_scores')
      .select(`
        lead_id,
        conversion_score,
        upsell_score,
        risk_score,
        priority_band,
        next_best_action,
        explanation,
        last_analyzed_at,
        leads (
          name,
          column_id,
          owner_id
        )
      `)
      .eq('company_id', companyId)
      .order('conversion_score', { ascending: false })
      .order('upsell_score',     { ascending: false })
      .order('risk_score',       { ascending: false })
      .limit(50);

    if (scoresError) {
      return res.status(500).json({ error: scoresError.message });
    }

    // ── 4. Normalizar resposta ────────────────────────────────
    const items: OpportunityItem[] = (scores ?? []).map((row: any) => ({
      lead_id:          row.lead_id,
      lead_name:        row.leads?.name ?? '—',
      stage_id:         row.leads?.column_id ?? null,
      owner_id:         row.leads?.owner_id ?? null,
      conversion_score: row.conversion_score,
      upsell_score:     row.upsell_score,
      risk_score:       row.risk_score,
      priority_band:    row.priority_band,
      next_best_action: row.next_best_action ?? null,
      explanation:      row.explanation ?? null,
      last_analyzed_at: row.last_analyzed_at,
    }));

    return res.status(200).json(items);
  } catch (err: any) {
    console.error('[opportunities/list]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
