import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';

export interface OmniMessage {
  id: string;
  company_id: string;
  conversation_id: string;
  external_message_id: string | null;
  direction: 'inbound' | 'outbound';
  sender_type: 'lead' | 'agent' | 'bot' | 'system';
  sender_id: string | null;
  content: string | null;
  content_type: string;
  media_url: string | null;
  status: string | null;
  metadata: Record<string, any>;
  sent_at: string;
  created_at: string;
}

export function useMessages(conversationId: string | null) {
  const { companyId, user } = useAuth();
  const [messages, setMessages] = useState<OmniMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !companyId) { setMessages([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data as OmniMessage[]);
    setLoading(false);
  }, [conversationId, companyId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Ref para evitar stale closure no callback do realtime
  const fetchMessagesRef = useRef(fetchMessages);
  useEffect(() => { fetchMessagesRef.current = fetchMessages; }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`omni-messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const incoming = payload.new as OmniMessage;
        setMessages(prev => {
          // Evita duplicar se update otimista já inseriu uma msg com mesmo id temporário
          const alreadyExists = prev.some(m => m.id === incoming.id);
          if (alreadyExists) return prev;
          // Remove o placeholder otimista (id começa com 'optimistic-') e adiciona a real
          const withoutOptimistic = prev.filter(m => !m.id.startsWith('optimistic-') || m.content !== incoming.content);
          return [...withoutOptimistic, incoming];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Optimistic update: mostra a mensagem imediatamente ao enviar, antes do webhook retornar
  const addOptimisticMessage = useCallback((content: string) => {
    if (!conversationId || !companyId || !user) return;
    const optimistic: OmniMessage = {
      id: `optimistic-${Date.now()}`,
      company_id: companyId,
      conversation_id: conversationId,
      external_message_id: null,
      direction: 'outbound',
      sender_type: 'agent',
      sender_id: user.id,
      content,
      content_type: 'text',
      status: 'sending',
      metadata: {},
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
  }, [conversationId, companyId, user]);

  return { messages, loading, addOptimisticMessage };
}
