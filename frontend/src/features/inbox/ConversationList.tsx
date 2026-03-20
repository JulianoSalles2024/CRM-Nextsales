import React from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import type { OmniConversation, ConversationStatus } from './hooks/useConversations';
import { ConversationItem } from './ConversationItem';
import { InboxFilters } from './InboxFilters';
import { InboxSearch } from './InboxSearch';

interface ConversationListProps {
  conversations: OmniConversation[];
  loading: boolean;
  activeId: string | null;
  statusFilter: ConversationStatus | null;
  search: string;
  onSelectConversation: (conv: OmniConversation) => void;
  onStatusFilterChange: (v: ConversationStatus | null) => void;
  onSearchChange: (v: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  loading,
  activeId,
  statusFilter,
  search,
  onSelectConversation,
  onStatusFilterChange,
  onSearchChange,
}) => (
  <div className="flex flex-col w-96 flex-shrink-0 border-r border-slate-800 bg-[#0B1220]">
    {/* Header */}
    <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
      <h2 className="text-base font-semibold text-white flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-blue-400" />
        Conversas
      </h2>
      {conversations.length > 0 && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          {conversations.length}
        </span>
      )}
    </div>

    <InboxSearch value={search} onChange={onSearchChange} />
    <InboxFilters active={statusFilter} onChange={onStatusFilterChange} />

    {/* List */}
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 h-32 text-slate-500">
          <MessageCircle className="w-8 h-8" />
          <span className="text-sm">Nenhuma conversa</span>
        </div>
      ) : (
        conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onClick={() => onSelectConversation(conv)}
          />
        ))
      )}
    </div>
  </div>
);
