import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Supabase (service role — bypasses RLS) ────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Auth helper ───────────────────────────────────────────────
async function resolveCompanyId(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const authHeader = (req.headers['authorization'] ?? req.headers['Authorization']) as string | undefined;
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) { res.status(401).json({ error: 'Authorization token required.' }); return null; }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) { res.status(401).json({ error: 'Token inválido ou expirado.' }); return null; }

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).single();
  if (profileError || !profile?.company_id) { res.status(400).json({ error: 'Perfil ou empresa não encontrados.' }); return null; }

  return profile.company_id as string;
}

// ── Types ─────────────────────────────────────────────────────
type PriorityBand = 'hot' | 'warm' | 'cold' | 'risk' | 'upsell';
interface LeadSignals {
  recent_activity: boolean;
  days_without_activity: number;
  has_future_task: boolean;
  has_previous_sale: boolean;
  stage: string | null;
  days_in_stage: number;
  lead_value: number;
}

// ── Helpers ───────────────────────────────────────────────────
function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }
function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function calcConversionScore(s: LeadSignals): number {
  let score = 50;
  if (s.has_future_task)                   score += 20;
  if (s.days_without_activity <= 7)        score += 15;
  else if (s.days_without_activity <= 14)  score += 10;
  if (s.days_without_activity > 60)        score -= 20;
  else if (s.days_without_activity > 30)   score -= 10;
  if (s.days_in_stage > 60)               score -= 25;
  else if (s.days_in_stage > 30)          score -= 15;
  return clamp(score);
}

function calcUpsellScore(s: LeadSignals): number {
  let score = 20;
  if (s.has_previous_sale)      score += 40;
  if (s.lead_value > 10_000)   score += 20;
  else if (s.lead_value > 5_000) score += 10;
  if (s.has_future_task)        score += 10;
  return clamp(score);
}

function calcRiskScore(s: LeadSignals): number {
  let score = 20;
  if (s.days_in_stage > 60)              score += 30;
  else if (s.days_in_stage > 30)         score += 20;
  if (s.days_without_activity > 60)      score += 20;
  else if (s.days_without_activity > 30) score += 10;
  if (s.has_future_task)                 score -= 20;
  if (s.days_without_activity <= 7)      score -= 10;
  return clamp(score);
}

function classifyBand(conversion: number, upsell: number, risk: number, signals: LeadSignals): PriorityBand {
  if (risk >= 60)                                    return 'risk';
  if (conversion >= 70)                              return 'hot';
  if (upsell >= 60 && signals.has_previous_sale)     return 'upsell';
  if (conversion >= 40)                              return 'warm';
  return 'cold';
}

const NEXT_BEST_ACTION: Record<PriorityBand, string> = {
  hot:    'Agende uma reunião de fechamento — lead está engajado e pronto.',
  warm:   'Faça um follow-up nos próximos 2 dias para manter o interesse aquecido.',
  cold:   'Envie um conteúdo de valor para reengajar o lead.',
  risk:   'Contate o lead imediatamente — risco de perda por inatividade.',
  upsell: 'Apresente um produto complementar ou upgrade com base no histórico de compra.',
};

// ── Handler: GET /api/opportunities/list ─────────────────────
async function handleList(req: VercelRequest, res: VercelResponse) {
  const companyId = await resolveCompanyId(req, res);
  if (!companyId) return;

  const { data: scores, error: scoresError } = await supabase
    .from('lead_opportunity_scores')
    .select(`
      lead_id, conversion_score, upsell_score, risk_score,
      priority_band, next_best_action, explanation, last_analyzed_at,
      leads ( name, column_id, owner_id )
    `)
    .eq('company_id', companyId)
    .order('conversion_score', { ascending: false })
    .order('upsell_score',     { ascending: false })
    .order('risk_score',       { ascending: false })
    .limit(50);

  if (scoresError) return res.status(500).json({ error: scoresError.message });

  const items = (scores ?? []).map((row: any) => ({
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
}

// ── Handler: POST /api/opportunities/analyze ─────────────────
async function handleAnalyze(req: VercelRequest, res: VercelResponse) {
  const companyId = await resolveCompanyId(req, res);
  if (!companyId) return;

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, owner_id, column_id, value, last_activity')
    .eq('company_id', companyId)
    .eq('is_archived', false)
    .is('deleted_at', null)
    .neq('status', 'GANHO')
    .neq('status', 'ENCERRADO')
    .limit(500);

  if (leadsError) return res.status(500).json({ error: leadsError.message });
  if (!leads || leads.length === 0) return res.json({ analyzed: 0, upserted: 0 });

  const leadIds = leads.map((l) => l.id);

  const [activitiesResult, tasksResult, salesResult] = await Promise.all([
    supabase.from('activities').select('lead_id, occurred_at').in('lead_id', leadIds).order('occurred_at', { ascending: false }),
    supabase.from('tasks').select('lead_id').in('lead_id', leadIds).eq('is_done', false).gte('due_date', new Date().toISOString().split('T')[0]),
    supabase.from('sales').select('lead_id').in('lead_id', leadIds),
  ]);

  const latestActivityMap: Record<string, string> = {};
  for (const act of activitiesResult.data ?? []) {
    if (!latestActivityMap[act.lead_id]) latestActivityMap[act.lead_id] = act.occurred_at;
  }
  const futureTasks  = new Set<string>((tasksResult.data  ?? []).map((t) => t.lead_id));
  const hasSalesSet  = new Set<string>((salesResult.data  ?? []).map((s) => s.lead_id));

  const now = new Date().toISOString();
  const rows = leads.map((lead) => {
    const daysWithoutActivity = daysSince(latestActivityMap[lead.id]);
    const signals: LeadSignals = {
      recent_activity:       daysWithoutActivity <= 7,
      days_without_activity: daysWithoutActivity,
      has_future_task:       futureTasks.has(lead.id),
      has_previous_sale:     hasSalesSet.has(lead.id),
      stage:                 lead.column_id ?? null,
      days_in_stage:         daysSince(lead.last_activity),
      lead_value:            Number(lead.value ?? 0),
    };
    const conversion = calcConversionScore(signals);
    const upsell     = calcUpsellScore(signals);
    const risk       = calcRiskScore(signals);
    const band       = classifyBand(conversion, upsell, risk, signals);
    return {
      company_id: companyId, lead_id: lead.id, owner_id: lead.owner_id ?? null,
      conversion_score: conversion, upsell_score: upsell, risk_score: risk,
      priority_band: band, next_best_action: NEXT_BEST_ACTION[band],
      signals, last_analyzed_at: now, updated_at: now,
    };
  });

  const { error: upsertError, count } = await supabase
    .from('lead_opportunity_scores')
    .upsert(rows, { onConflict: 'company_id,lead_id', count: 'exact' });

  if (upsertError) return res.status(500).json({ error: upsertError.message });
  return res.json({ analyzed: leads.length, upserted: count ?? rows.length });
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query['action'];

  try {
    if (action === 'list')    return await handleList(req, res);
    if (action === 'analyze') return await handleAnalyze(req, res);
    return res.status(404).json({ error: 'Action not found.' });
  } catch (err: any) {
    console.error(`[opportunities/${action}]`, err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
