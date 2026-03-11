import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { User } from '@/types';

function mapProfileToUser(row: Record<string, unknown>): User {
  const role = row.role as string;
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    email: '',
    avatarUrl: (row.avatar_url as string) ?? undefined,
    role: role === 'admin' ? 'Admin' : role === 'seller' ? 'Vendedor' : undefined,
    joinedAt: (row.created_at as string) ?? undefined,
  };
}

export function useUsers(companyId: string | null) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!companyId) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, role, created_at')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (!error) setUsers((data ?? []).map(mapProfileToUser));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return { users, loading, refetch: fetchUsers };
}
