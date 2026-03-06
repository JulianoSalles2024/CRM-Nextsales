import { useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { NotificationEventType } from './notifications.types';

export function useNotificationActions(
  companyId: string | null,
  actorUserId: string | null,
) {
  const getAdminIds = useCallback(async (): Promise<string[]> => {
    if (!companyId) return [];
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', companyId)
      .eq('role', 'admin')
      .eq('is_active', true);
    return (data ?? []).map((r: { id: string }) => r.id);
  }, [companyId]);

  const notify = useCallback(
    async (type: NotificationEventType, title: string, description: string) => {
      if (!companyId || !actorUserId) return;
      const adminIds = await getAdminIds();
      if (adminIds.length === 0) return;

      const rows = adminIds.map((adminId) => ({
        company_id: companyId,
        recipient_user_id: adminId,
        actor_user_id: actorUserId,
        type,
        title,
        description,
        is_read: false,
      }));

      await supabase.from('notifications').insert(rows);
    },
    [companyId, actorUserId, getAdminIds],
  );

  const notifyLeadCreated = useCallback(
    async (actorName: string, leadName: string) => {
      await notify(
        'lead_created',
        'Novo lead criado',
        `${actorName} cadastrou um novo lead: ${leadName}`,
      );
    },
    [notify],
  );

  const notifyLeadWon = useCallback(
    async (actorName: string, leadName: string, value: number) => {
      const formatted = value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      await notify(
        'lead_won',
        'Venda fechada',
        `${actorName} fechou a venda ${leadName} - ${formatted}`,
      );
    },
    [notify],
  );

  const notifyLeadLost = useCallback(
    async (actorName: string, leadName: string, value: number) => {
      const formatted = value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      await notify(
        'lead_lost',
        'Lead perdido',
        `${actorName} perdeu o lead ${leadName} - ${formatted}`,
      );
    },
    [notify],
  );

  return { notifyLeadCreated, notifyLeadWon, notifyLeadLost };
}
