import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { safeError } from '@/src/utils/logger';
import type { Board, ColumnData, Id } from '@/types';

function mapStagesForBoard(
  boardId: string,
  stages: Record<string, unknown>[],
): ColumnData[] {
  return stages
    .filter((s) => s.board_id === boardId)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map((s) => ({
      id: s.id as string,
      title: (s.name as string) ?? '',
      color: (s.color as string) ?? '#6b7280',
      type: (s.linked_lifecycle_stage as ColumnData['type']) ?? 'open',
    }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (id: string) => UUID_RE.test(id);

export function useBoards(companyId: string | null) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<Id>('');
  const [loading, setLoading] = useState(true);

  const fetchBoards = useCallback(async () => {
    if (!companyId) {
      setBoards([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [boardsRes, stagesRes] = await Promise.all([
      supabase.from('boards').select('*').eq('company_id', companyId),
      supabase
        .from('board_stages')
        .select('*')
        .eq('company_id', companyId)
        .order('order', { ascending: true }),
    ]);

    if (!boardsRes.error && !stagesRes.error) {
      const stages = (stagesRes.data ?? []) as Record<string, unknown>[];
      const mapped: Board[] = ((boardsRes.data ?? []) as Record<string, unknown>[]).map((b) => ({
        id: b.id as string,
        name: (b.name as string) ?? '',
        slug: (b.slug as string) ?? '',
        description: (b.description as string) ?? undefined,
        type: (b.type as Board['type']) ?? 'sales',
        isDefault: Boolean(b.is_default),
        columns: mapStagesForBoard(b.id as string, stages),
      }));

      setBoards(mapped);
      setActiveBoardId((prev) => {
        if (prev && mapped.some((b) => b.id === prev)) return prev;
        const defaultBoard = mapped.find((b) => b.isDefault) ?? mapped[0];
        return defaultBoard?.id ?? '';
      });
    } else {
      safeError('useBoards fetch error:', boardsRes.error ?? stagesRes.error);
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  /** Cria board + estágios no Supabase. Retorna o novo board ID ou null em erro. */
  const createBoard = useCallback(async (boardData: Omit<Board, 'id'>): Promise<string | null> => {
    if (!companyId) return null;

    const boardId = crypto.randomUUID();
    const { error: boardError } = await supabase
      .from('boards')
      .insert({
        id: boardId,
        name: boardData.name,
        description: boardData.description ?? null,
        type: boardData.type,
        company_id: companyId,
        is_default: false,
      })
      .select();

    if (boardError) {
      safeError('createBoard error:', boardError);
      return null;
    }

    if (boardData.columns.length > 0) {
      const stages = boardData.columns.map((col, idx) => ({
        id: crypto.randomUUID(),
        board_id: boardId,
        company_id: companyId,
        name: col.title,
        color: col.color,
        linked_lifecycle_stage: col.type,
        order: idx,
      }));
      const { error: stagesError } = await supabase.from('board_stages').insert(stages);
      if (stagesError) safeError('createBoard stages error:', stagesError);
    }

    await fetchBoards();
    return boardId;
  }, [companyId, fetchBoards]);

  /**
   * Persiste as colunas do board no Supabase.
   * - Stages existentes (UUID válido) → upsert
   * - Stages novos (ID temporário) → insert com novo UUID
   * - Stages removidos → delete (se não houver leads vinculados)
   */
  const saveBoardStages = useCallback(async (boardId: string, columns: ColumnData[]): Promise<boolean> => {
    if (!companyId) return false;

    const { data: existing, error: fetchErr } = await supabase
      .from('board_stages')
      .select('id')
      .eq('board_id', boardId);

    if (fetchErr) {
      safeError('saveBoardStages fetch error:', fetchErr);
      return false;
    }

    const existingIds = new Set((existing ?? []).map((r: any) => r.id as string));
    const keptIds = new Set(columns.filter(c => isUUID(String(c.id))).map(c => String(c.id)));

    const toDelete = [...existingIds].filter(id => !keptIds.has(id));
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('board_stages')
        .delete()
        .in('id', toDelete);
      if (delErr) safeError('saveBoardStages delete error:', delErr);
    }

    const stagesToUpsert = columns.map((col, idx) => ({
      id: isUUID(String(col.id)) ? String(col.id) : crypto.randomUUID(),
      board_id: boardId,
      company_id: companyId,
      name: col.title,
      color: col.color,
      linked_lifecycle_stage: col.type,
      order: idx,
    }));

    const { error: upsertErr } = await supabase
      .from('board_stages')
      .upsert(stagesToUpsert, { onConflict: 'id' });

    if (upsertErr) {
      safeError('saveBoardStages upsert error:', upsertErr);
      return false;
    }

    await fetchBoards();
    return true;
  }, [companyId, fetchBoards]);

  /** Deleta board e seus stages. Retorna true em sucesso. */
  const deleteBoard = useCallback(async (boardId: string): Promise<boolean> => {
    await supabase.from('board_stages').delete().eq('board_id', boardId);

    const { error } = await supabase.from('boards').delete().eq('id', boardId);
    if (error) {
      safeError('deleteBoard error:', error);
      return false;
    }

    await fetchBoards();
    return true;
  }, [fetchBoards]);

  return {
    boards,
    setBoards,
    activeBoardId,
    setActiveBoardId,
    loading,
    refetch: fetchBoards,
    createBoard,
    saveBoardStages,
    deleteBoard,
  };
}
