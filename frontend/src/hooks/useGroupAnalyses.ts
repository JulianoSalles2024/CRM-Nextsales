import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { GroupAnalysis, CreateGroupAnalysisData, UpdateGroupAnalysisData, Id } from '@/types';

interface DbGroupAnalysis {
  id: string;
  company_id: string;
  group_id: string;
  content: string;
  status: 'saved' | 'draft';
  created_at: string;
  updated_at: string;
}

function mapRow(row: DbGroupAnalysis): GroupAnalysis {
  return {
    id: row.id,
    groupId: row.group_id,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function useGroupAnalyses(companyId: string | null) {
  const [groupAnalyses, setGroupAnalyses] = useState<GroupAnalysis[]>([]);

  const fetchGroupAnalyses = useCallback(async () => {
    if (!companyId) {
      setGroupAnalyses([]);
      return;
    }
    const { data, error } = await supabase
      .from('group_analyses')
      .select('*')
      .eq('company_id', companyId);

    if (error) {
      console.error('useGroupAnalyses fetch error:', error);
      return;
    }

    const rows = (data ?? []) as DbGroupAnalysis[];

    // One-time localStorage migration
    if (rows.length === 0) {
      const raw = localStorage.getItem('crm-groupAnalyses');
      if (raw) {
        try {
          const local: GroupAnalysis[] = JSON.parse(raw);
          if (Array.isArray(local) && local.length > 0) {
            const toInsert = local.map(a => ({
              company_id: companyId,
              group_id: String(a.groupId),
              content: a.content,
              status: a.status,
            }));
            const { data: inserted } = await supabase
              .from('group_analyses')
              .insert(toInsert)
              .select('*');
            localStorage.removeItem('crm-groupAnalyses');
            setGroupAnalyses(((inserted ?? []) as DbGroupAnalysis[]).map(mapRow));
            return;
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    setGroupAnalyses(rows.map(mapRow));
  }, [companyId]);

  useEffect(() => {
    fetchGroupAnalyses();
  }, [fetchGroupAnalyses]);

  const createOrUpdateAnalysis = useCallback(
    async (data: CreateGroupAnalysisData | UpdateGroupAnalysisData, analysisId?: Id) => {
      if (!companyId) return;

      if (analysisId) {
        // Update existing
        const updateData: Partial<DbGroupAnalysis> = {
          updated_at: new Date().toISOString(),
        };
        if ('content' in data && data.content !== undefined) updateData.content = data.content;
        if ('status' in data && data.status !== undefined) updateData.status = data.status;

        const { error } = await supabase
          .from('group_analyses')
          .update(updateData)
          .eq('id', String(analysisId));
        if (error) { console.error('createOrUpdateAnalysis update error:', error); return; }
        setGroupAnalyses(prev =>
          prev.map(a => a.id === analysisId ? { ...a, ...(data as UpdateGroupAnalysisData) } : a)
        );
      } else {
        // Insert — delete existing for this group first (enforce single analysis per group)
        const createData = data as CreateGroupAnalysisData;
        await supabase
          .from('group_analyses')
          .delete()
          .eq('company_id', companyId)
          .eq('group_id', String(createData.groupId));

        const { data: inserted, error } = await supabase
          .from('group_analyses')
          .insert({
            company_id: companyId,
            group_id: String(createData.groupId),
            content: createData.content,
            status: createData.status,
          })
          .select('*')
          .single();
        if (error) { console.error('createOrUpdateAnalysis insert error:', error); return; }
        setGroupAnalyses(prev => [
          ...prev.filter(a => a.groupId !== createData.groupId),
          mapRow(inserted as DbGroupAnalysis),
        ]);
      }
    },
    [companyId],
  );

  const deleteAnalysis = useCallback(
    async (id: Id) => {
      const { error } = await supabase
        .from('group_analyses')
        .delete()
        .eq('id', String(id));
      if (error) { console.error('deleteAnalysis error:', error); return; }
      setGroupAnalyses(prev => prev.filter(a => a.id !== id));
    },
    [],
  );

  return { groupAnalyses, createOrUpdateAnalysis, deleteAnalysis, refetch: fetchGroupAnalyses };
}
