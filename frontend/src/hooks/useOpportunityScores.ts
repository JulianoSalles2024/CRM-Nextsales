import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/features/auth/AuthContext';

// ── Types ─────────────────────────────────────────────────────
export interface OpportunityScore {
  lead_id: string;
  lead_name: string;
  stage_id: string | null;
  owner_id: string | null;
  conversion_score: number;
  upsell_score: number;
  risk_score: number;
  priority_band: 'hot' | 'warm' | 'cold' | 'risk' | 'upsell';
  next_best_action: string | null;
  explanation: string | null;
  last_analyzed_at: string;
}

interface UseOpportunityScoresReturn {
  opportunities: OpportunityScore[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ── Hook ──────────────────────────────────────────────────────
export function useOpportunityScores(): UseOpportunityScoresReturn {
  const { session } = useAuth();

  // Primitivo string — useCallback/useEffect só recriam quando o token muda de valor,
  // não quando o objeto session ganha nova referência por re-renders do AuthContext.
  const accessToken = session?.access_token ?? null;

  const [opportunities, setOpportunities] = useState<OpportunityScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    // Guard sem side-effects — sem setState aqui, não dispara re-render
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/opportunities/list', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Erro ${res.status}`);
      }

      const data: OpportunityScore[] = await res.json();
      setOpportunities(data);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar oportunidades.');
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]); // único primitivo — função estável entre re-renders com mesmo token

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]); // re-executa só quando accessToken muda (fetchOpportunities é recriada)

  return { opportunities, loading, error, refresh: fetchOpportunities };
}
