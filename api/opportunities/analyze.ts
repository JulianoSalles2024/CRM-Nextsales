import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Supabase (service role — bypasses RLS) ────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ─────────────────────────────────────────────────────
type PriorityBand = 'hot' | 'warm' | 'cold' | 'risk' | 'upsell';

interface LeadSignals {
  recent_activity: boolean;        // atividade nos últimos 7 dias
  days_without_activity: number;   // dias desde a última atividade registrada
  has_future_task: boolean;        // existe tarefa pendente com vencimento futuro
  has_previous_sale: boolean;      // existe venda registrada para este lead
  stage: string | null;            // column_id do lead no momento da análise
  days_in_stage: number;           // dias desde last_activity (proxy de tempo no estágio)
  lead_value: number;              // valor monetário do lead
}

// ── Helpers ───────────────────────────────────────────────────
function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// ── Scoring: conversion (0–100) ───────────────────────────────
// Probabilidade de fechar negócio com base em engajamento e tempo no estágio.
function calcConversionScore(s: LeadSignals): number {
  let score = 50;

  // Bônus por engajamento ativo
  if (s.has_future_task)               score += 20;
  if (s.days_without_activity <= 7)       score += 15;
  else if (s.days_without_activity <= 14) score += 10;

  // Penalidade por inatividade
  if (s.days_without_activity > 60)       score -= 20;
  else if (s.days_without_activity > 30)  score -= 10;

  // Penalidade por estagnação no estágio
  if (s.days_in_stage > 60)            score -= 25;
  else if (s.days_in_stage > 30)       score -= 15;

  return clamp(score);
}

// ── Scoring: upsell (0–100) ───────────────────────────────────
// Potencial de venda adicional com base em histórico e valor do lead.
function calcUpsellScore(s: LeadSignals): number {
  let score = 20;

  // Base forte: já é cliente (tem venda anterior)
  if (s.has_previous_sale)         score += 40;

  // Valor do lead indica ticket alto
  if (s.lead_value > 10_000)    score += 20;
  else if (s.lead_value > 5_000) score += 10;

  // Engajamento atual facilita abordagem de upsell
  if (s.has_future_task)       score += 10;

  return clamp(score);
}

// ── Scoring: risk (0–100) ─────────────────────────────────────
// Risco de perder o lead por inatividade ou estagnação.
function calcRiskScore(s: LeadSignals): number {
  let score = 20;

  // Estagnação no estágio
  if (s.days_in_stage > 60)            score += 30;
  else if (s.days_in_stage > 30)       score += 20;

  // Inatividade prolongada
  if (s.days_without_activity > 60)      score += 20;
  else if (s.days_without_activity > 30) score += 10;

  // Mitigadores: alguém está acompanhando / lead ativo recentemente
  if (s.has_future_task)              score -= 20;
  if (s.days_without_activity <= 7)      score -= 10;

  return clamp(score);
}

// ── Classificação: priority_band ─────────────────────────────
// Ordem de prioridade: risk > hot > upsell > warm > cold
function classifyBand(
  conversion: number,
  upsell: number,
  risk: number,
  signals: LeadSignals
): PriorityBand {
  if (risk >= 60)                              return 'risk';
  if (conversion >= 70)                        return 'hot';
  if (upsell >= 60 && signals.has_previous_sale)  return 'upsell';
  if (conversion >= 40)                        return 'warm';
  return 'cold';
}

// ── Ação recomendada por band ─────────────────────────────────
const NEXT_BEST_ACTION: Record<PriorityBand, string> = {
  hot:    'Agende uma reunião de fechamento — lead está engajado e pronto.',
  warm:   'Faça um follow-up nos próximos 2 dias para manter o interesse aquecido.',
  cold:   'Envie um conteúdo de valor para reengajar o lead.',
  risk:   'Contate o lead imediatamente — risco de perda por inatividade.',
  upsell: 'Apresente um produto complementar ou upgrade com base no histórico de compra.',
};

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    // ── 3. Buscar leads ativos da empresa ─────────────────────
    // Excluir: arquivados, deletados, ganhos e encerrados
    // (esses não precisam de análise de oportunidade)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, owner_id, column_id, value, last_activity')
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .is('deleted_at', null)
      .neq('status', 'GANHO')
      .neq('status', 'ENCERRADO')
      .limit(500);

    if (leadsError) {
      return res.status(500).json({ error: leadsError.message });
    }

    if (!leads || leads.length === 0) {
      return res.json({ analyzed: 0, upserted: 0 });
    }

    const leadIds = leads.map((l) => l.id);

    // ── 4. Buscar dados de suporte em paralelo ────────────────
    const [activitiesResult, tasksResult, salesResult] = await Promise.all([
      // Última atividade por lead (já vem ordenado desc — primeiro hit = mais recente)
      supabase
        .from('activities')
        .select('lead_id, occurred_at')
        .in('lead_id', leadIds)
        .order('occurred_at', { ascending: false }),

      // Tarefas pendentes com vencimento futuro (filtrado no banco)
      supabase
        .from('tasks')
        .select('lead_id')
        .in('lead_id', leadIds)
        .eq('is_done', false)
        .gte('due_date', new Date().toISOString().split('T')[0]),

      // Vendas vinculadas ao lead (presença indica cliente ativo)
      supabase
        .from('sales')
        .select('lead_id')
        .in('lead_id', leadIds),
    ]);

    // ── 5. Montar mapas de lookup ─────────────────────────────

    // Última atividade por lead_id
    const latestActivityMap: Record<string, string> = {};
    for (const act of activitiesResult.data ?? []) {
      if (!latestActivityMap[act.lead_id]) {
        latestActivityMap[act.lead_id] = act.occurred_at;
      }
    }

    // Leads com tarefa futura pendente (já filtrado no banco)
    const futureTasks = new Set<string>(
      (tasksResult.data ?? []).map((t) => t.lead_id)
    );

    // Leads com histórico de vendas
    const hasSalesSet = new Set<string>(
      (salesResult.data ?? []).map((s) => s.lead_id)
    );

    // ── 6. Calcular scores e classificar ─────────────────────
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
        company_id:        companyId,
        lead_id:           lead.id,
        owner_id:          lead.owner_id ?? null,
        conversion_score:  conversion,
        upsell_score:      upsell,
        risk_score:        risk,
        priority_band:     band,
        next_best_action:  NEXT_BEST_ACTION[band],
        signals,
        last_analyzed_at:  now,
        updated_at:        now,
        // explanation e recommended_window: reservados para fase de IA
      };
    });

    // ── 7. Upsert por (company_id, lead_id) ──────────────────
    const { error: upsertError, count } = await supabase
      .from('lead_opportunity_scores')
      .upsert(rows, {
        onConflict: 'company_id,lead_id',
        count: 'exact',
      });

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message });
    }

    return res.json({ analyzed: leads.length, upserted: count ?? rows.length });
  } catch (err: any) {
    console.error('[opportunities/analyze]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
