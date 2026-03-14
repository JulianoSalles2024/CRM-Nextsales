import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';

export type ConversationStatus = 'waiting' | 'in_progress' | 'resolved' | 'blocked';

export interface OmniConversation {
  id: string;
  company_id: string;
  channel_connection_id: string;
  lead_id: string | null;
  contact_identifier: string;
  contact_name: string | null;
  status: ConversationStatus;
  assignee_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export function useConversations(statusFilter: ConversationStatus | null = null, search: string = '') {
  const { user, companyId, currentUserRole } = useAuth();
  const [conversations, setConversations] = useState<OmniConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    let query = supabase
      .from('conversations')
      .select('*')
      .eq('company_id', companyId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (currentUserRole !== 'admin' && user) {
      query = query.eq('assignee_id', user.id);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (search.trim()) {
      query = query.or(`contact_name.ilike.%${search}%,contact_identifier.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (!error && data) setConversations(data as OmniConversation[]);
    setLoading(false);
  }, [companyId, currentUserRole, user, statusFilter, search]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Ref sempre aponta para a versão mais recente de fetchConversations
  // sem ser dependência do effect de subscription — evita loop e gap de canal
  const fetchConversationsRef = useRef(fetchConversations);
  useEffect(() => { fetchConversationsRef.current = fetchConversations; }, [fetchConversations]);

  // Canal nomeado com companyId para evitar colisão no React 18 Strict Mode
  // Reconecta apenas quando companyId muda — não quando filtros ou search mudam
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`omni-conversations-realtime-${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `company_id=eq.${companyId}`,
      }, () => fetchConversationsRef.current())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const removeConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
  }, []);

  return { conversations, loading, refetch: fetchConversations, removeConversation };
}
