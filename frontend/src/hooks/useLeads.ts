import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Lead, Id } from '@/types';
import { mapLeadFromDb, mapLeadToDb } from '@/src/lib/mappers';
import { safeLog } from '@/src/utils/logger';

export function useLeads(companyId: string | null) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!companyId) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    // — DIAGNÓSTICO TEMPORÁRIO — remover após validação
    safeLog('DEBUG useLeads rows returned from DB:', data?.length ?? 0);
    if (!error) setLeads((data ?? []).map(mapLeadFromDb));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // company_id is NOT sent — the enforce_company_id() trigger stamps it server-side.
  // .select() is intentionally omitted: the SELECT policy (tenant_isolation) blocks
  // reading back the row immediately after INSERT because company_id is set by trigger,
  // not in the payload. The lead is returned from input data; fetchLeads() syncs state.
  const createLead = useCallback(async (lead: Omit<Lead, 'id'>): Promise<Lead> => {
    if (!companyId) throw new Error('CompanyId missing');
    const { data: { session } } = await supabase.auth.getSession();
    const ownerId = session?.user?.id;
    if (!ownerId) throw new Error('User not authenticated');
    const { error } = await supabase
      .from('leads')
      .insert({ ...mapLeadToDb({ ...lead, ownerId }), company_id: companyId, is_archived: false });
    if (error) throw error;
    await fetchLeads();
    return { ...lead, id: '' } as Lead;
  }, [companyId, fetchLeads]);

  const updateLead = useCallback(async (id: Id, updates: Partial<Lead>): Promise<void> => {
    if (!companyId) throw new Error('CompanyId missing');
    const { error } = await supabase
      .from('leads')
      .update(mapLeadToDb(updates))
      .eq('id', id);
    if (error) throw error;
    await fetchLeads();
  }, [companyId, fetchLeads]);

  const deleteLead = useCallback(async (id: Id): Promise<void> => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    await fetchLeads();
  }, [fetchLeads]);

  const bulkUpdateLeads = useCallback(async (updates: Array<{ id: Id; data: Partial<Lead> }>): Promise<void> => {
    if (!companyId) throw new Error('CompanyId missing');
    await Promise.all(
      updates.map(({ id, data }) =>
        supabase.from('leads').update(mapLeadToDb(data)).eq('id', id)
      )
    );
    await fetchLeads();
  }, [companyId, fetchLeads]);

  return { leads, loading, createLead, updateLead, deleteLead, bulkUpdateLeads, refetch: fetchLeads };
}
