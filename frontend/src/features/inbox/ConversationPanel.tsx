import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Phone, UserCheck, CheckCircle, Loader2, AlertCircle, X, RefreshCw, RefreshCcw, MoreVertical, Trash2, ShieldBan, Eraser } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useAppContext } from '@/src/app/AppContext';
import type { OmniConversation, ConversationStatus } from './hooks/useConversations';
import { MessageList } from './MessageList';
import { MessageComposer } from './components/MessageComposer';
import { useSendMessage } from './hooks/useSendMessage';
import { useMessages } from './hooks/useMessages';
import { useConversationActions } from './hooks/useConversationActions';

const STATUS_LABEL: Record<string, string> = {
  waiting:     'Em espera',
  in_progress: 'Em atendimento',
  resolved:    'Encerrado',
  blocked:     'Bloqueado',
};

const STATUS_COLOR: Record<string, string> = {
  waiting:     'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  resolved:    'text-green-400 bg-green-500/10 border-green-500/20',
  blocked:     'text-red-400 bg-red-500/10 border-red-500/20',
};

interface ConversationPanelProps {
  conversation: OmniConversation | null;
  onStatusChange: (conversationId: string, newStatus: ConversationStatus) => void;
  onDeleteConversation: (conversationId: string) => void;
}

type ConfirmAction = 'clear' | 'block' | 'delete' | null;

export const ConversationPanel: React.FC<ConversationPanelProps> = ({ conversation, onStatusChange, onDeleteConversation }) => {
  const { user, companyId, currentUserRole } = useAuth();
  const { localUser } = useAppContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const { sendMessage, isSending, sendError, clearError } = useSendMessage();
  const { messages, loading: messagesLoading, addOptimisticMessage, resetMessages } = useMessages(conversation?.id ?? null);

  // ── Menu de ações (⋯) ────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { clearMessages, blockContact, deleteConversation, isLoading: isActing, error: actionError } = useConversationActions(
    conversation?.id ?? null,
    conversation?.lead_id ?? null,
  );

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleConfirm = async () => {
    let ok = false;
    if (confirmAction === 'clear')  ok = await clearMessages();
    if (confirmAction === 'block')  ok = await blockContact();
    if (confirmAction === 'delete') ok = await deleteConversation();
    if (ok) {
      if (confirmAction === 'clear')  resetMessages();
      if (confirmAction === 'delete') onDeleteConversation(conversation!.id);
      setConfirmAction(null);
    }
  };

  const CONFIRM_CONFIG: Record<NonNullable<ConfirmAction>, { title: string; description: string; confirmLabel: string; danger: boolean }> = {
    clear: {
      title: 'Limpar mensagens',
      description: 'Isso apagará todo o histórico desta conversa. A conversa permanece na lista, mas sem mensagens. Esta ação não pode ser desfeita.',
      confirmLabel: 'Limpar histórico',
      danger: true,
    },
    block: {
      title: 'Bloquear contato',
      description: 'O contato será bloqueado. A conversa ficará com status "Bloqueado" e o lead marcado internamente. O WF-03 não enviará mais follow-ups para este contato.',
      confirmLabel: 'Bloquear',
      danger: true,
    },
    delete: {
      title: 'Apagar conversa',
      description: 'A conversa e todas as mensagens serão apagadas permanentemente. Esta ação não pode ser desfeita.',
      confirmLabel: 'Apagar conversa',
      danger: true,
    },
  };

  const reopenConversation = async () => {
    if (!conversation || !companyId || !user) return;
    setIsReopening(true);
    setReopenError(null);
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'in_progress', assignee_id: user.id })
      .eq('id', conversation.id)
      .eq('company_id', companyId);
    if (error) setReopenError('Não foi possível reabrir a conversa. Tente novamente.');
    setIsReopening(false);
  };

  const canUpdate =
    currentUserRole === 'admin' ||
    conversation?.assignee_id === user?.id;

  const updateStatus = async (newStatus: ConversationStatus) => {
    if (!conversation || !companyId || !canUpdate) return;
    setIsUpdating(true);

    const { error } = await supabase
      .from('conversations')
      .update({ status: newStatus })
      .eq('id', conversation.id)
      .eq('company_id', companyId);

    if (!error) {
      const userName = localUser?.name ?? user?.email ?? 'Usuário';
      const previousStatus = conversation.status;
      const content =
        newStatus === 'in_progress' && previousStatus === 'resolved'
          ? `${userName} reabriu a conversa`
          : newStatus === 'in_progress'
          ? `${userName} assumiu o atendimento`
          : 'Conversa marcada como resolvida';

      await supabase.from('messages').insert({
        company_id: companyId,
        conversation_id: conversation.id,
        direction: null,
        sender_type: 'system',
        content,
        content_type: 'text',
      });

      onStatusChange(conversation.id, newStatus);
    }

    setIsUpdating(false);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600 bg-[#080E1A]">
        <MessageCircle className="w-12 h-12" />
        <p className="text-sm">Selecione uma conversa</p>
      </div>
    );
  }

  const displayName = conversation.contact_name || conversation.contact_identifier;
  const statusLabel = STATUS_LABEL[conversation.status] ?? conversation.status;
  const statusColor = STATUS_COLOR[conversation.status] ?? STATUS_COLOR.open;

  return (
    <div className="flex-1 flex flex-col bg-[#080E1A] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0B1220] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{displayName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-400">{conversation.contact_identifier}</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">WhatsApp</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor}`}>
            {statusLabel}
          </span>

          {canUpdate && conversation.status === 'waiting' && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              Assumir atendimento
            </button>
          )}

          {canUpdate && conversation.status === 'in_progress' && (
            <button
              onClick={() => updateStatus('resolved')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Encerrar
            </button>
          )}

          {canUpdate && conversation.status === 'resolved' && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Retornar Agente
            </button>
          )}

          {/* Menu ⋯ */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(p => !p)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Mais ações"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#0B1220] border border-slate-700 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); setConfirmAction('clear'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <Eraser className="w-4 h-4 text-slate-400" />
                  Limpar mensagens
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setConfirmAction('block'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <ShieldBan className="w-4 h-4 text-slate-400" />
                  Bloquear contato
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={() => { setMenuOpen(false); setConfirmAction('delete'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Apagar conversa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0B1220] border border-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-base font-semibold text-white mb-2">
              {CONFIRM_CONFIG[confirmAction].title}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              {CONFIRM_CONFIG[confirmAction].description}
            </p>

            {actionError && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-300">{actionError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={isActing}
                className="px-4 py-2 text-sm text-slate-300 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isActing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {CONFIRM_CONFIG[confirmAction].confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} loading={messagesLoading} />

      {/* Reabrir conversa — aparece apenas quando resolved */}
      {conversation.status === 'resolved' && (
        <div className="flex-shrink-0 flex flex-col items-center gap-2 px-4 py-3 border-t border-slate-800 bg-[#0B1220]">
          {reopenError && (
            <div className="w-full flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="flex-1 text-xs text-red-300">{reopenError}</span>
              <button onClick={() => setReopenError(null)} aria-label="Fechar erro" className="text-red-400 hover:text-red-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={reopenConversation}
            disabled={isReopening}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isReopening
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCcw className="w-4 h-4" />}
            Reabrir conversa
          </button>
        </div>
      )}

      {/* Banner de erro de envio */}
      {sendError && (
        <div className="flex-shrink-0 flex items-center gap-2 mx-4 mb-1 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="flex-1 text-xs text-red-300">{sendError}</span>
          <button onClick={clearError} aria-label="Fechar erro" className="text-red-400 hover:text-red-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <MessageComposer
        conversationId={conversation.id}
        conversationStatus={conversation.status}
        canSend={canUpdate && conversation.status === 'in_progress' && !isSending}
        onSendMessage={(text) => {
          addOptimisticMessage(text);
          sendMessage(conversation.id, text, conversation.contact_identifier);
        }}
      />
    </div>
  );
};
