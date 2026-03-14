import React, { useState, useCallback } from 'react';
import type { OmniConversation, ConversationStatus } from './hooks/useConversations';
import { useConversations } from './hooks/useConversations';
import { ConversationList } from './ConversationList';
import { ConversationPanel } from './ConversationPanel';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';

export const InboxPage: React.FC = () => {
  const { companyId } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | null>(null);
  const [search, setSearch] = useState('');
  const [activeConversation, setActiveConversation] = useState<OmniConversation | null>(null);

  const { conversations, loading, removeConversation } = useConversations(statusFilter, search);

  const handleSelectConversation = useCallback((conv: OmniConversation) => {
    setActiveConversation(conv);
    // Zera badge de não lidas ao abrir a conversa (fire-and-forget)
    if (conv.unread_count > 0 && companyId) {
      supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conv.id)
        .eq('company_id', companyId)
        .then(() => {});
    }
  }, [companyId]);

  const handleStatusChange = useCallback((conversationId: string, newStatus: ConversationStatus) => {
    setActiveConversation((prev) =>
      prev?.id === conversationId ? { ...prev, status: newStatus } : prev
    );
  }, []);

  const handleDeleteConversation = useCallback((conversationId: string) => {
    removeConversation(conversationId);
    setActiveConversation(null);
  }, [removeConversation]);

  return (
    <div className="flex h-full -mx-6 -mt-6 -mb-6 overflow-hidden rounded-xl border border-slate-800">
      <ConversationList
        conversations={conversations}
        loading={loading}
        activeId={activeConversation?.id ?? null}
        statusFilter={statusFilter}
        search={search}
        onSelectConversation={handleSelectConversation}
        onStatusFilterChange={setStatusFilter}
        onSearchChange={setSearch}
      />
      <ConversationPanel
        conversation={activeConversation}
        onStatusChange={handleStatusChange}
        onDeleteConversation={handleDeleteConversation}
      />
    </div>
  );
};
