import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Phone, UserCheck, CheckCircle, Loader2, AlertCircle, X, RefreshCw, RefreshCcw, MoreVertical, Trash2, ShieldBan, Eraser, Bot } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useAppContext } from '@/src/app/AppContext';
import { useAgents } from '@/src/features/agents/hooks/useAgents';
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
  const [assignAgentOpen, setAssignAgentOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const { agents } = useAgents();
  const activeAgents = agents.filter(a => a.is_active && !a.is_archived);
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

    // Encerramento usa a RPC unificada que faz cleanup completo:
    // fecha conversa, exaure follow-ups, arquiva memória do agente.
    // Outros status continuam com PATCH direto (sem efeitos colaterais complexos).
    if (newStatus === 'resolved') {
      const userName = localUser?.name ?? user?.email ?? 'atendente';
      const { error } = await supabase.rpc('close_conversation', {
        p_conversation_id: conversation.id,
        p_company_id:      companyId,
        p_reason:          `Encerrado manualmente por ${userName}`,
        p_outcome:         'neutral',
      });
      if (!error) onStatusChange(conversation.id, newStatus);
      setIsUpdating(false);
      return;
    }

    // Note: do NOT clear assignee_id when returning to 'waiting' — RLS blocks
    // sellers from creating rows with assignee_id=null (only admins can do that).
    // The seller stays linked to the conversation; status='waiting' disables the composer.
    const { error } = await supabase
      .from('conversations')
      .update({ status: newStatus })
      .eq('id', conversation.id)
      .eq('company_id', companyId);

    if (!error) {
      const userName = localUser?.name ?? user?.email ?? 'Usuário';
      const content =
        newStatus === 'in_progress' && conversation.status === 'resolved'
          ? `${userName} reabriu a conversa`
          : newStatus === 'in_progress'
          ? `${userName} assumiu o atendimento`
          : `${userName} devolveu o atendimento para o agente`;

      await supabase.from('messages').insert({
        company_id:      companyId,
        conversation_id: conversation.id,
        direction:       null,
        sender_type:     'system',
        content,
        content_type:    'text',
      });

      onStatusChange(conversation.id, newStatus);
    }

    setIsUpdating(false);
  };

  const assignAgent = async (agentId: string | null) => {
    if (!conversation || !companyId) return;
    setIsAssigning(true);
    const { error } = await supabase
      .from('conversations')
      .update({ ai_agent_id: agentId, status: agentId ? 'waiting' : conversation.status })
      .eq('id', conversation.id)
      .eq('company_id', companyId);
    if (!error) {
      const label = agentId
        ? `Agente IA atribuído à conversa`
        : `Agente IA removido da conversa`;
      await supabase.from('messages').insert({
        company_id: companyId,
        conversation_id: conversation.id,
        direction: null,
        sender_type: 'system',
        content: label,
        content_type: 'text',
      });
      onStatusChange(conversation.id, agentId ? 'waiting' : conversation.status);
      setAssignSuccess(true);
      setTimeout(() => { setAssignSuccess(false); setAssignAgentOpen(false); }, 1200);
    }
    setIsAssigning(false);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#080E1A]">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-blue-500/40" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-blue-500/5 blur-xl pointer-events-none" />
        </div>
        <div className="text-center">
          <p className="text-slate-400 font-medium text-sm">Nenhuma conversa selecionada</p>
          <p className="text-slate-600 text-xs mt-1">Selecione uma conversa ao lado para começar</p>
        </div>
      </div>
    );
  }

  const displayName = conversation.contact_name || conversation.contact_identifier;
  const statusLabel = STATUS_LABEL[conversation.status] ?? conversation.status;
  const statusColor = STATUS_COLOR[conversation.status] ?? STATUS_COLOR.open;

  const AVATAR_GRADIENTS = [
    'from-blue-500 to-cyan-400',
    'from-violet-500 to-purple-400',
    'from-emerald-500 to-teal-400',
    'from-orange-500 to-amber-400',
    'from-rose-500 to-pink-400',
    'from-indigo-500 to-blue-400',
    'from-teal-500 to-emerald-400',
    'from-fuchsia-500 to-violet-400',
  ];
  const avatarGradient = AVATAR_GRADIENTS[
    ((displayName.charCodeAt(0) || 0) + (displayName.charCodeAt(1) || 0)) % AVATAR_GRADIENTS.length
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#080E1A] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0B1220] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}>
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
          {conversation.ai_agent_id && (
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border text-blue-400 bg-blue-500/10 border-blue-500/20">
              <Bot className="w-3 h-3" />
              Agente IA
            </span>
          )}
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor}`}>
            {statusLabel}
          </span>

          {canUpdate && conversation.status === 'waiting' && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-500 hover:shadow-[0_0_14px_rgba(29,161,242,0.4)] hover:-translate-y-0.5 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all duration-200"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              Assumir atendimento
            </button>
          )}

          {canUpdate && conversation.status === 'in_progress' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateStatus('waiting')}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors border border-slate-600"
                title="Devolver atendimento para o Agente de IA"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Voltar para Agente
              </button>
              
              <button
                onClick={() => updateStatus('resolved')}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Encerrar
              </button>
            </div>
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
                  onClick={() => { setMenuOpen(false); setAssignAgentOpen(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <Bot className="w-4 h-4 text-blue-400" />
                  {conversation.ai_agent_id ? 'Trocar Agente IA' : 'Atribuir Agente IA'}
                </button>
                {conversation.ai_agent_id && (
                  <button
                    onClick={() => { setMenuOpen(false); assignAgent(null); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <Bot className="w-4 h-4 text-slate-400" />
                    Remover Agente IA
                  </button>
                )}
                <div className="my-1 border-t border-slate-800" />
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

      {/* Modal Atribuir Agente IA */}
      {assignAgentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0B1220] border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-900/20 w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-semibold text-white">Atribuir Agente IA</h3>
              </div>
              <button onClick={() => setAssignAgentOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Selecione um agente para assumir automaticamente esta conversa.</p>
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {activeAgents.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum agente ativo encontrado.</p>
              )}
              {activeAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => assignAgent(agent.id)}
                  disabled={isAssigning}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    conversation.ai_agent_id === agent.id
                      ? 'bg-blue-500/10 border border-blue-500/30 text-white'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-slate-500">{agent.function_type}</p>
                  </div>
                  {conversation.ai_agent_id === agent.id && (
                    <span className="ml-auto text-xs text-blue-400">Atual</span>
                  )}
                </button>
              ))}
            </div>
            {isAssigning && !assignSuccess && (
              <div className="flex items-center justify-center gap-2 mt-3 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Atribuindo...
              </div>
            )}
            {assignSuccess && (
              <div className="flex items-center justify-center gap-2 mt-3 text-green-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> Agente atribuído com sucesso!
              </div>
            )}
          </div>
        </div>
      )}

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
          sendMessage(conversation.id, text, conversation.contact_identifier, conversation.channel_connection_id);
        }}
      />
    </div>
  );
};
