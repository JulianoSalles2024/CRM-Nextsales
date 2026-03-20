import React from 'react';
import type { ConversationStatus } from './hooks/useConversations';

interface Filter {
  label: string;
  value: ConversationStatus | null;
}

const FILTERS: Filter[] = [
  { label: 'Todos',          value: null },
  { label: 'Em espera',      value: 'waiting' },
  { label: 'Em atendimento', value: 'in_progress' },
  { label: 'Encerrados',     value: 'resolved' },
];

interface InboxFiltersProps {
  active: ConversationStatus | null;
  onChange: (value: ConversationStatus | null) => void;
}

export const InboxFilters: React.FC<InboxFiltersProps> = ({ active, onChange }) => (
  <div className="flex gap-0.5 px-2 py-2 border-b border-slate-800">
    {FILTERS.map((f) => (
      <button
        key={String(f.value)}
        onClick={() => onChange(f.value)}
        className={`flex-1 px-1.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 border whitespace-nowrap ${
          active === f.value
            ? 'bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-900/20'
            : 'border-transparent text-slate-500 hover:text-white hover:bg-white/5'
        }`}
      >
        {f.label}
      </button>
    ))}
  </div>
);
