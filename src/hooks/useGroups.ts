import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Group } from '@/types';

function mapGroupFromDb(row: any): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    accessLink: row.access_link ?? undefined,
    status: row.status ?? 'Ativo',
    memberGoal: row.member_goal ?? undefined,
    createdBy: row.created_by ?? undefined,
  };
}

export function useGroups(companyId: string | null) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!companyId) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (!error && data) setGroups(data.map(mapGroupFromDb));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const createGroup = useCallback(async (data: Omit<Group, 'id'>): Promise<Group> => {
    if (!companyId) throw new Error('companyId ausente');
    const { data: { user } } = await supabase.auth.getUser();
    const { data: result, error } = await supabase
      .from('groups')
      .insert({
        name: data.name,
        description: data.description ?? null,
        access_link: data.accessLink ?? null,
        status: data.status ?? 'Ativo',
        member_goal: data.memberGoal ?? null,
        company_id: companyId,
        created_by: user?.id,
      })
      .select()
      .single();
    if (error) {
      // Constraint de nome duplicado
      if (error.code === '23505') throw new Error('Já existe um grupo com esse nome.');
      throw error;
    }
    const created = mapGroupFromDb(result);
    setGroups(prev => [created, ...prev]);
    return created;
  }, [companyId]);

  const updateGroup = useCallback(async (id: string, data: Partial<Group>): Promise<void> => {
    const { data: result, error } = await supabase
      .from('groups')
      .update({
        name: data.name,
        description: data.description ?? null,
        access_link: data.accessLink ?? null,
        status: data.status,
        member_goal: data.memberGoal ?? null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('Já existe um grupo com esse nome.');
      throw error;
    }
    if (result) setGroups(prev => prev.map(g => g.id === id ? mapGroupFromDb(result) : g));
  }, []);

  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw error;
    setGroups(prev => prev.filter(g => g.id !== id));
  }, []);

  return { groups, loading, createGroup, updateGroup, deleteGroup, refetch: fetchGroups };
}
