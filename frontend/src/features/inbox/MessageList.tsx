import React, { useEffect, useRef } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import type { OmniMessage } from './hooks/useMessages';

interface MessageListProps {
  messages: OmniMessage[];
  loading: boolean;
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function getMsgDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, loading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-slate-600" />
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-500 font-medium">Sem mensagens</p>
          <p className="text-xs text-slate-600 mt-0.5">O histórico desta conversa está vazio</p>
        </div>
      </div>
    );
  }

  // Inserir separadores de data entre grupos de mensagens
  const seenDates = new Set<string>();
  const items: Array<{ type: 'msg'; msg: OmniMessage } | { type: 'date'; label: string; key: string }> = [];

  for (const msg of messages) {
    const dateKey = getMsgDateKey(msg.sent_at);
    if (!seenDates.has(dateKey)) {
      seenDates.add(dateKey);
      items.push({ type: 'date', label: getDateLabel(msg.sent_at), key: dateKey });
    }
    items.push({ type: 'msg', msg });
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      {items.map((item) =>
        item.type === 'date' ? (
          <div key={item.key} className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] font-medium text-slate-500 bg-[#080E1A] px-2 flex-shrink-0">
              {item.label}
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
        ) : (
          <MessageBubble key={item.msg.id} message={item.msg} />
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
};
