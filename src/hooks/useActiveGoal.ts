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
    if (!companyId || !sellerId) {
      setActiveGoal(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      // Query 1: meta individual ativa do vendedor
      const { data: individual } = await supabase
        .from('goals')
        .select('id, goal_value, goal_type, user_id')
        .eq('company_id', companyId)
        .eq('user_id', sellerId)
        .eq('is_active', true)
        .maybeSingle();

      if (cancelled) return;

      if (individual) {
        setActiveGoal({ id: individual.id, targetValue: individual.goal_value ?? 0, goalType: individual.goal_type, userId: individual.user_id });
        setLoading(false);
        return;
      }

      // Query 2: fallback para meta global ativa
      const { data: global } = await supabase
        .from('goals')
        .select('id, goal_value, goal_type, user_id')
        .eq('company_id', companyId)
        .is('user_id', null)
        .eq('is_active', true)
        .maybeSingle();

      if (cancelled) return;

      setActiveGoal(global ? { id: global.id, targetValue: global.goal_value ?? 0, goalType: global.goal_type, userId: null } : null);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [companyId, sellerId]);

  return { activeGoal, loading };
}
