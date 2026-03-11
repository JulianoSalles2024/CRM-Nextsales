import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  companyId: string | null;
  toolId: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

const mapRow = (row: any): AIConversation => ({
  id: row.id,
  userId: row.user_id,
  companyId: row.company_id,
  toolId: row.tool_id,
  title: row.title,
  messages: row.messages ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const useAIConversations = (userId: string | undefined, toolId: string) => {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeConversation = conversations.find(c => c.id === activeId) ?? null;

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('tool_id', toolId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[useAIConversations] fetchConversations error:', error);
      } else if (data) {
        const mapped = data.map(mapRow);
        setConversations(mapped);
        setActiveId(prev => prev ?? mapped[0]?.id ?? null);
      }
    } catch (e) {
      console.error('[useAIConversations] fetchConversations exception:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, toolId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const createConversation = async (): Promise<AIConversation | null> => {
    if (!userId) {
      console.error('[useAIConversations] createConversation: userId is missing');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({ user_id: userId, tool_id: toolId, title: 'Nova conversa' })
        .select()
        .single();
      if (error) {
        console.error('[useAIConversations] createConversation error:', error);
        return null;
      }
      if (!data) return null;
      const mapped = mapRow(data);
      setConversations(prev => [mapped, ...prev]);
      setActiveId(mapped.id);
      return mapped;
    } catch (e) {
      console.error('[useAIConversations] createConversation exception:', e);
      return null;
    }
  };

  const saveMessages = async (conversationId: string, messages: AIMessage[], autoTitle?: string) => {
    const updates: Record<string, any> = { messages, updated_at: new Date().toISOString() };
    if (autoTitle) updates.title = autoTitle;

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .update(updates)
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        console.error('[useAIConversations] saveMessages error:', error);
        return;
      }
      if (data) {
        const mapped = mapRow(data);
        setConversations(prev =>
          prev
            .map(c => c.id === conversationId ? mapped : c)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        );
      }
    } catch (e) {
      console.error('[useAIConversations] saveMessages exception:', e);
    }
  };

  const updateTitle = async (conversationId: string, title: string) => {
    await supabase
      .from('ai_conversations')
      .update({ title })
      .eq('id', conversationId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title } : c));
  };

  const deleteConversation = async (conversationId: string) => {
    await supabase.from('ai_conversations').delete().eq('id', conversationId);
    const remaining = conversations.filter(c => c.id !== conversationId);
    setConversations(remaining);
    if (activeId === conversationId) {
      setActiveId(remaining[0]?.id ?? null);
    }
  };

  return {
    conversations,
    activeConversation,
    activeId,
    setActiveId,
    loading,
    createConversation,
    saveMessages,
    updateTitle,
    deleteConversation,
  };
};
