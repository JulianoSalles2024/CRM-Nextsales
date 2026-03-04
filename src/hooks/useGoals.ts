import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Goal, CreateGoalData } from '@/types';

export function useGoals(companyId: string | null) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!companyId) {
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      safeError('useGoals fetch error:', error);
    } else {
      setGoals(
        (data ?? []).map(row => ({
          id: row.id,
          companyId: row.company_id,
          name: row.name,
          goalType: row.goal_type,
          frequency: row.period_type,
          targetValue: row.goal_value,
          isActive: row.is_active,
          createdAt: row.created_at,
          startDate: row.start_date ?? '',
          endDate: row.end_date ?? '',
          userId: row.user_id ?? null,
        }))
      );
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const createGoal = useCallback(async (data: CreateGoalData): Promise<string | null> => {
    if (!companyId) return 'Empresa não identificada.';

    const { data: goalRow, error: goalError } = await supabase
      .from('goals')
      .insert({
        company_id: companyId,
        name: data.name,
        goal_type: data.goalType,
        period_type: data.frequency,
        goal_value: data.targetValue,
        start_date: data.periodStart,
        end_date: data.periodEnd,
        is_active: false,
        user_id: data.userId ?? null,
      })
      .select('id')
      .single();

    if (goalError) return goalError.message;

    if (data.isActive) {
      const { error: rpcError } = await supabase.rpc('activate_goal', {
        p_goal_id: goalRow.id,
        p_company_id: companyId,
      });
      if (rpcError) return rpcError.message;
    }

    await fetchGoals();
    return null;
  }, [companyId, fetchGoals]);

  const updateGoal = useCallback(async (goalId: string, data: CreateGoalData): Promise<string | null> => {
    if (!companyId) return 'Empresa não identificada.';

    const { error: updateError } = await supabase
      .from('goals')
      .update({
        name:        data.name,
        goal_type:   data.goalType,
        period_type: data.frequency,
        goal_value:  data.targetValue,
        start_date:  data.periodStart,
        end_date:    data.periodEnd,
      })
      .eq('id', goalId)
      .eq('company_id', companyId);

    if (updateError) return updateError.message;

   if (data.isActive) {
  const { error: rpcError } = await supabase.rpc('activate_goal', {
    p_goal_id: goalId,
    p_company_id: companyId,
  });
  if (rpcError) return rpcError.message;
} else {
  // Se desmarcou como ativa, desativa manualmente
  const { error: deactivateError } = await supabase
    .from('goals')
    .update({ is_active: false })
    .eq('id', goalId)
    .eq('company_id', companyId);

  if (deactivateError) return deactivateError.message;
}

    await fetchGoals();
    return null;
  }, [companyId, fetchGoals]);

  const deleteGoal = useCallback(async (goalId: string): Promise<string | null> => {
    if (!companyId) return 'Empresa não identificada.';

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('company_id', companyId);

    if (error) return error.message;

    await fetchGoals();
    return null;
  }, [companyId, fetchGoals]);

  const activateGoal = useCallback(async (goalId: string): Promise<string | null> => {
    if (!companyId) return 'Empresa não identificada.';
    setActivating(goalId);
    const { error } = await supabase.rpc('activate_goal', {
      p_goal_id: goalId,
      p_company_id: companyId,
    });
    setActivating(null);
    if (error) return error.message;
    await fetchGoals();
    return null;
  }, [companyId, fetchGoals]);

  return { goals, loading, activating, fetchGoals, createGoal, updateGoal, deleteGoal, activateGoal };
}
