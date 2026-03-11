import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Task, Id } from '@/types';
import { mapTaskFromDb, mapTaskToDb } from '@/src/lib/mappers';

// PGRST205 = table not found in schema cache (tasks table may not exist yet)
const TABLE_NOT_FOUND = 'PGRST205';

export function useTasks(companyId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!companyId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    let result = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', companyId)
      .order('due_date', { ascending: true });

    // 42703 = coluna não existe no schema — fallback para created_at
    if (result.error?.code === '42703') {
      result = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    }

    if (result.error) {
      if (result.error.code !== TABLE_NOT_FOUND) safeError('useTasks fetch error:', result.error);
    } else {
      setTasks((result.data ?? []).map(mapTaskFromDb));
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // company_id is NOT sent — the enforce_company_id() trigger stamps it server-side.
  const createTask = useCallback(async (task: Omit<Task, 'id'>): Promise<Task> => {
    if (!companyId) throw new Error('CompanyId missing');
    const { data, error } = await supabase
      .from('tasks')
      .insert(mapTaskToDb(task))
      .select()
      .single();
    if (error) {
      if (error.code === TABLE_NOT_FOUND) {
        safeWarn('useTasks: tasks table not found, skipping createTask');
        return { ...task, id: `tmp-${Date.now()}` } as Task;
      }
      throw error;
    }
    const created = mapTaskFromDb(data);
    await fetchTasks();
    return created;
  }, [companyId, fetchTasks]);

  const createManyTasks = useCallback(async (taskList: Array<Omit<Task, 'id'>>): Promise<void> => {
    if (!companyId) throw new Error('CompanyId missing');
    if (taskList.length === 0) return;
    const { error } = await supabase
      .from('tasks')
      .insert(taskList.map(t => mapTaskToDb(t)));
    if (error) {
      if (error.code === TABLE_NOT_FOUND) {
        safeWarn('useTasks: tasks table not found, skipping createManyTasks');
        return;
      }
      throw error;
    }
    await fetchTasks();
  }, [companyId, fetchTasks]);

  const updateTask = useCallback(async (id: Id, updates: Partial<Task>): Promise<void> => {
    if (!companyId) throw new Error('CompanyId missing');
    const { error } = await supabase
      .from('tasks')
      .update(mapTaskToDb(updates))
      .eq('id', id);
    if (error) {
      if (error.code === TABLE_NOT_FOUND) {
        safeWarn('useTasks: tasks table not found, skipping updateTask');
        return;
      }
      throw error;
    }
    await fetchTasks();
  }, [companyId, fetchTasks]);

  const deleteTask = useCallback(async (id: Id): Promise<void> => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      if (error.code === TABLE_NOT_FOUND) {
        safeWarn('useTasks: tasks table not found, skipping deleteTask');
        return;
      }
      throw error;
    }
    await fetchTasks();
  }, [fetchTasks]);

  const deleteManyTasks = useCallback(async (ids: Id[]): Promise<void> => {
    if (ids.length === 0) return;
    const { error } = await supabase.from('tasks').delete().in('id', ids);
    if (error) {
      if (error.code === TABLE_NOT_FOUND) {
        safeWarn('useTasks: tasks table not found, skipping deleteManyTasks');
        return;
      }
      throw error;
    }
    await fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, createTask, createManyTasks, updateTask, deleteTask, deleteManyTasks, refetch: fetchTasks };
}
