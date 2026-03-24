import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';

export interface SupervisorInsight {
  id: string;
  company_id: string;
  agent_id: string | null;
  profile_id: string | null;
  type: 'performance_drop' | 'script_issue' | 'channel_weak' | 'goal_risk' | 'general';
  severity: 'info' | 'warning' | 'critical';
  content: string;
  recommendation: string | null;
  is_read: boolean;
  is_applied: boolean;
  created_at: string;
  // agente IA
  agent_name?: string | null;
  agent_avatar_color?: string | null;
  // vendedor humano
  profile_name?: string | null;
  profile_avatar_color?: string | null;
}

export function useSupervisorInsights() {
  const { companyId } = useAuth();
  const [insights, setInsights] = useState<SupervisorInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setFetchError(null);
    try {
      // Busca sem join primeiro para evitar erro de FK
      const { data, error } = await supabase
        .from('supervisor_insights')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useSupervisorInsights] error:', error);
        setFetchError(error.message);
        return;
      }

      const rows = data ?? [];
      console.log('[useSupervisorInsights] rows:', rows.length, 'companyId:', companyId);

      // Busca nomes dos agentes separadamente
      const agentIds = [...new Set(rows.map((r: any) => r.agent_id).filter(Boolean))];
      const agentMap: Record<string, { name: string; avatar_color: string }> = {};
      if (agentIds.length > 0) {
        const { data: agents } = await supabase
          .from('ai_agents')
          .select('id, name, avatar_color')
          .in('id', agentIds);
        (agents ?? []).forEach((a: any) => { agentMap[a.id] = a; });
      }

      const mapped: SupervisorInsight[] = rows.map((row: any) => ({
        ...row,
        agent_name: agentMap[row.agent_id]?.name ?? null,
        agent_avatar_color: agentMap[row.agent_id]?.avatar_color ?? null,
        profile_name: null,
        profile_avatar_color: null,
      }));

      setInsights(mapped);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const markRead = useCallback(async (id: string) => {
    await supabase
      .from('supervisor_insights')
      .update({ is_read: true })
      .eq('id', id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i));
  }, []);

  const markApplied = useCallback(async (id: string) => {
    await supabase
      .from('supervisor_insights')
      .update({ is_read: true, is_applied: true })
      .eq('id', id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true, is_applied: true } : i));
  }, []);

  // Realtime: atualiza automaticamente quando WF-09 insere novos insights
  useEffect(() => {
    if (!companyId) return;
    fetch();

    channelRef.current = supabase
      .channel(`supervisor_insights:${companyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'supervisor_insights',
        filter: `company_id=eq.${companyId}`,
      }, () => { fetch(); })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = insights.filter(i => !i.is_read).length;

  return { insights, loading, unreadCount, fetchError, markRead, markApplied, refetch: fetch };
}
