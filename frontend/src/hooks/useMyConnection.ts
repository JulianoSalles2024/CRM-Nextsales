import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface MyConnection {
  id: string;
  external_id: string | null;
  name: string;
  status: string;
  is_active: boolean;
  created_at: string;
}

export function useMyConnection(userId: string | null, companyId: string | null) {
  const [connection, setConnection] = useState<MyConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !companyId) { setConnection(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('channel_connections')
      .select('id, external_id, name, status, is_active, created_at')
      .eq('owner_id', userId)
      .eq('company_id', companyId)
      .eq('channel', 'whatsapp')
      .maybeSingle();
    setConnection(data ?? null);
    setLoading(false);
  }, [userId, companyId]);

  useEffect(() => { load(); }, [load]);

  // Realtime — detecta quando a conexão é registrada
  useEffect(() => {
    if (!userId || !companyId) return;
    const sub = supabase
      .channel(`my_connection_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'channel_connections',
      }, load)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [userId, companyId, load]);

  return { connection, loading, hasConnection: !!connection, refetch: load };
}
