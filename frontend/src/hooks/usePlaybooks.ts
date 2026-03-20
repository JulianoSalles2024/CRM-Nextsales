import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Playbook } from '@/types';

interface DbPlaybook {
  id: string;
  company_id: string;
  name: string;
  stages: Playbook['stages'];
  steps: Playbook['steps'];
  created_at: string;
  updated_at: string;
}

function mapRow(row: DbPlaybook): Playbook {
  return {
    id: row.id,
    name: row.name,
    stages: row.stages ?? [],
    steps: row.steps ?? [],
  };
}

export function usePlaybooks(companyId: string | null, userId: string | null = null) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaybooks = useCallback(async () => {
    if (!companyId) {
      setPlaybooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('playbooks')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('usePlaybooks fetch error:', error);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as DbPlaybook[];

    // One-time localStorage migration
    if (rows.length === 0) {
      const raw = localStorage.getItem('crm-playbooks');
      if (raw) {
        try {
          const local: Playbook[] = JSON.parse(raw);
          if (Array.isArray(local) && local.length > 0) {
            const toInsert = local.map(p => ({
              company_id: companyId,
              name: p.name,
              stages: p.stages,
              steps: p.steps,
              ...(userId ? { created_by: userId } : {}),
            }));
            const { data: inserted } = await supabase
              .from('playbooks')
              .insert(toInsert)
              .select('*');
            localStorage.removeItem('crm-playbooks');
            setPlaybooks(((inserted ?? []) as DbPlaybook[]).map(mapRow));
            setLoading(false);
            return;
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    setPlaybooks(rows.map(mapRow));
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  const createPlaybook = useCallback(
    async (data: Omit<Playbook, 'id'>) => {
      if (!companyId) return;
      const { data: inserted, error } = await supabase
        .from('playbooks')
        .insert({ company_id: companyId, name: data.name, stages: data.stages, steps: data.steps, ...(userId ? { created_by: userId } : {}) })
        .select('*')
        .single();
      if (error) { console.error('createPlaybook error:', error); return; }
      setPlaybooks(prev => [...prev, mapRow(inserted as DbPlaybook)]);
    },
    [companyId, userId],
  );

  const updatePlaybook = useCallback(
    async (id: string, data: Partial<Omit<Playbook, 'id'>>) => {
      const { error } = await supabase
        .from('playbooks')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) { console.error('updatePlaybook error:', error); return; }
      setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    },
    [],
  );

  const deletePlaybook = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('playbooks').delete().eq('id', id);
      if (error) { console.error('deletePlaybook error:', error); return; }
      setPlaybooks(prev => prev.filter(p => p.id !== id));
    },
    [],
  );

  /**
   * replacePlaybooks — used by PlaybookSettings which passes the full updated array.
   * Diffs against current state and calls create/update/delete appropriately.
   */
  const replacePlaybooks = useCallback(
    async (newPlaybooks: Playbook[]) => {
      if (!companyId) return;
      const current = playbooks;
      const currentIds = new Set(current.map(p => String(p.id)));
      const newIds = new Set(newPlaybooks.map(p => String(p.id)));

      // Deletes
      for (const p of current) {
        if (!newIds.has(String(p.id))) {
          await deletePlaybook(String(p.id));
        }
      }

      // Creates and updates
      for (const p of newPlaybooks) {
        const isNew = !currentIds.has(String(p.id)) || String(p.id).startsWith('playbook-');
        if (isNew) {
          await createPlaybook({ name: p.name, stages: p.stages, steps: p.steps });
        } else {
          await updatePlaybook(String(p.id), { name: p.name, stages: p.stages, steps: p.steps });
        }
      }
    },
    [companyId, playbooks, createPlaybook, updatePlaybook, deletePlaybook],
  );

  return { playbooks, loading, createPlaybook, updatePlaybook, deletePlaybook, replacePlaybooks };
}
