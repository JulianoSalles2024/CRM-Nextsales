import { useState, useCallback } from 'react';
import { useAuth } from '@/src/features/auth/AuthContext';
import { supabase } from '@/src/lib/supabase';

const WEBHOOK_URL = import.meta.env.VITE_N8N_OUTBOUND_WEBHOOK_URL as string;

export function useSendMessage() {
  const { user, companyId } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const clearError = useCallback(() => setSendError(null), []);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    contactIdentifier: string,
    channelConnectionId: string,
  ): Promise<void> => {
    if (!WEBHOOK_URL) throw new Error('Webhook URL não configurada.');
    if (!companyId || !user) throw new Error('Sessão expirada. Faça login novamente.');

    // Resolve the Evolution API instance name from the channel_connection record
    const { data: conn } = await supabase
      .from('channel_connections')
      .select('external_id')
      .eq('id', channelConnectionId)
      .maybeSingle();
    const instanceName = conn?.external_id ?? '';
    if (!instanceName) throw new Error('Instância WhatsApp não encontrada para esta conversa.');

    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          companyId,
          contactIdentifier,
          content,
          agentId: user.id,
          instanceName,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Erro ao enviar mensagem.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido.';
      setSendError(message);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [companyId, user]);

  return { sendMessage, isSending, sendError, clearError };
}
