import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Activity } from '@/types';
import { mapActivityFromDb, mapActivityToDb } from '@/src/lib/mappers';

export function useActivities(companyId: string | null) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!companyId) {
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (!error) setActivities((data ?? []).map(mapActivityFromDb));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // company_id is NOT sent — the enforce_company_id() trigger stamps it server-side.
  const createActivity = useCallback(async (act: Omit<Activity, 'id'>): Promise<Activity> => {
    if (!companyId) throw new Error('CompanyId missing');
    const { data, error } = await supabase
      .from('activities')
      .insert(mapActivityToDb(act))
      .select()
      .single();
    if (error) throw error;
    const created = mapActivityFromDb(data);
    await fetchActivities();
    return created;
  }, [companyId, fetchActivities]);

  return { activities, loading, createActivity, refetch: fetchActivities };
}
