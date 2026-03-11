import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { AppNotification } from './notifications.types';

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Fetch latest 5 for display
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Count total unread (no limit)
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_user_id', userId)
      .is('deleted_at', null)
      .eq('is_read', false);

    setNotifications((data ?? []) as AppNotification[]);
    setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      await fetchNotifications();
    },
    [fetchNotifications],
  );

  const deleteNotification = useCallback(
    async (id: string) => {
      await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      await fetchNotifications();
    },
    [fetchNotifications],
  );

  const deleteAll = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('recipient_user_id', userId)
      .is('deleted_at', null);
    await fetchNotifications();
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    deleteAll,
    refetch: fetchNotifications,
  };
}
