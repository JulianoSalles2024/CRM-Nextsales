export type NotificationEventType = 'lead_created' | 'lead_won' | 'lead_lost' | 'lead_reactivation';

export interface AppNotification {
  id: string;
  company_id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
  is_read: boolean;
  type: NotificationEventType;
  title: string;
  description: string;
}
