import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';

interface ActiveGoal {
  id: string;
  targetValue: number;
  goalType: string;
  userId: string | null;
}

export function useActiveGoal(companyId: string | null, sellerId: string | null) {
  const [activeGoal, setActiveGoal] = useState<ActiveGoal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useActiveGoal] effect disparado | companyId:', companyId, '| sellerId:', sellerId);

    if (!companyId || !sellerId) {
      console.log('[useActiveGoal] early return — aguardando companyId/sellerId');
      setActiveGoal(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    (async () => {
      console.log('[useActiveGoal] iniciando busca | companyId:', companyId, '| sellerId:', sellerId, '| today:', today);

      // Query 1: meta individual ativa do vendedor válida para hoje
      const { data: individualRows, error: errIndividual } = await supabase
        .from('goals')
        .select('id, goal_value, goal_type, user_id')
        .eq('company_id', companyId)
        .eq('user_id', sellerId)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('[useActiveGoal] individual →', individualRows, '| erro:', errIndividual);

      const individual = individualRows?.[0] ?? null;

      if (cancelled) return;

      if (individual) {
        console.log('[useActiveGoal] usando meta individual | goal_value:', individual.goal_value);
        setActiveGoal({ id: individual.id, targetValue: individual.goal_value ?? 0, goalType: individual.goal_type, userId: individual.user_id });
        setLoading(false);
        return;
      }

      // Query 2: fallback para meta global ativa válida para hoje
      const { data: globalRows, error: errGlobal } = await supabase
        .from('goals')
        .select('id, goal_value, goal_type, user_id')
        .eq('company_id', companyId)
        .is('user_id', null)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('[useActiveGoal] global →', globalRows, '| erro:', errGlobal);

      const global = globalRows?.[0] ?? null;

      if (cancelled) return;

      console.log('[useActiveGoal] resultado final | activeGoal:', global ?? null);
      setActiveGoal(global ? { id: global.id, targetValue: global.goal_value ?? 0, goalType: global.goal_type, userId: null } : null);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [companyId, sellerId]);

  return { activeGoal, loading };
}
