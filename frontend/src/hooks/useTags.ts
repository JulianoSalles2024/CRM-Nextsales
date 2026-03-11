import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Tag } from '@/types';

interface DbTag {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

function mapRow(row: DbTag): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

export function useTags(companyId: string | null) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    if (!companyId) {
      setTags([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) {
      console.error('useTags fetch error:', error);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as DbTag[];

    // One-time localStorage migration
    if (rows.length === 0) {
      const raw = localStorage.getItem('crm-tags');
      if (raw) {
        try {
          const local: Tag[] = JSON.parse(raw);
          if (Array.isArray(local) && local.length > 0) {
            const toInsert = local.map(t => ({
              company_id: companyId,
              name: t.name,
              color: t.color,
            }));
            const { data: inserted } = await supabase
              .from('tags')
              .insert(toInsert)
              .select('*');
            localStorage.removeItem('crm-tags');
            setTags(((inserted ?? []) as DbTag[]).map(mapRow));
            setLoading(false);
            return;
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    setTags(rows.map(mapRow));
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(
    async (data: Omit<Tag, 'id'>) => {
      if (!companyId) return;
      const { data: inserted, error } = await supabase
        .from('tags')
        .insert({ company_id: companyId, name: data.name, color: data.color })
        .select('*')
        .single();
      if (error) { console.error('createTag error:', error); return; }
      setTags(prev => [...prev, mapRow(inserted as DbTag)]);
    },
    [companyId],
  );

  const updateTag = useCallback(
    async (id: string | number, data: Partial<Omit<Tag, 'id'>>) => {
      const { error } = await supabase
        .from('tags')
        .update(data)
        .eq('id', String(id));
      if (error) { console.error('updateTag error:', error); return; }
      setTags(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    },
    [],
  );

  const deleteTag = useCallback(
    async (id: string | number) => {
      const { error } = await supabase.from('tags').delete().eq('id', String(id));
      if (error) { console.error('deleteTag error:', error); return; }
      setTags(prev => prev.filter(t => t.id !== id));
    },
    [],
  );

  return { tags, loading, createTag, updateTag, deleteTag };
}
