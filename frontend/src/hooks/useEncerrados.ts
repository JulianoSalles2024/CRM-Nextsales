import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Lead } from '@/types';
import { mapLeadFromDb } from '@/src/lib/mappers';

export const ENCERRADOS_PAGE_SIZE = 4;

export function useEncerrados(companyId: string | null, page: number) {
  const [encerrados, setEncerrados] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!companyId) { setEncerrados([]); setTotal(0); return; }
    setLoading(true);
    const from = (page - 1) * ENCERRADOS_PAGE_SIZE;
    const to = from + ENCERRADOS_PAGE_SIZE - 1;

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'ENCERRADO')
        .eq('is_archived', false)
        .is('deleted_at', null)
        .order('last_activity_timestamp', { ascending: false })
        .range(from, to),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'ENCERRADO')
        .eq('is_archived', false)
        .is('deleted_at', null),
    ]);

    if (!error && data) setEncerrados(data.map(mapLeadFromDb));
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [companyId, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return { encerrados, total, loading, refetch: fetch };
}
