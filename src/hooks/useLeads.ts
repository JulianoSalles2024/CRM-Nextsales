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
  const createLead = useCallback(async (lead: Omit<Lead, 'id'>): Promise<Lead> => {
    if (!companyId) throw new Error('CompanyId missing');
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('leads')
      .insert(mapLeadToDb({ ...lead, ownerId: user?.id }))
      .select()
      .single();
    if (error) throw error;
    const created = mapLeadFromDb(data);
    await fetchLeads();
    return created;
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
