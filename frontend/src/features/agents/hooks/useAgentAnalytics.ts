import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';

export type Period = '7d' | '30d' | '90d';

export interface CompanyAnalytics {
  total_runs: number;
  total_tokens: number;
  total_cost: number;
  total_approaches: number;
  total_responses: number;
  total_qualified: number;
  total_meetings: number;
  total_sales: number;
  avg_response_rate: number;
  avg_conversion: number;
  avg_duration_ms: number;
}

export interface AgentRanking {
  agent_id: string;
  agent_name: string;
  function_type: string;
  avatar_color: string;
  is_active: boolean;
  total_approaches: number;
  total_responses: number;
  total_qualified: number;
  total_meetings: number;
  total_sales: number;
  total_escalations: number;
  total_revenue: number;
  total_tokens: number;
  total_cost: number;
  response_rate: number;
  conversion_rate: number;
  avg_duration_ms: number;
}

function getPeriodDates(period: Period): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const today = fmt(now);
  const daysMap: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const start = new Date(now);
  start.setDate(now.getDate() - daysMap[period]);
  return { start: fmt(start), end: today };
}

export function useAgentAnalytics(companyId: string | null, initialPeriod: Period = '30d') {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [summary, setSummary] = useState<CompanyAnalytics | null>(null);
  const [agents, setAgents] = useState<AgentRanking[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { start, end } = getPeriodDates(period);
    try {
      const [summaryRes, agentsRes] = await Promise.all([
        supabase.rpc('get_company_analytics', {
          p_company_id: companyId,
          p_start: start,
          p_end: end,
        }),
        supabase.rpc('get_agent_ranking', {
          p_company_id: companyId,
          p_start: start,
          p_end: end,
        }),
      ]);

      if (summaryRes.data) {
        // RPC may return array with one row or a single object
        const raw = Array.isArray(summaryRes.data)
          ? summaryRes.data[0]
          : summaryRes.data;
        setSummary(raw ?? null);
      } else {
        setSummary(null);
      }

      setAgents(agentsRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [companyId, period]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { summary, agents, loading, period, setPeriod };
}
