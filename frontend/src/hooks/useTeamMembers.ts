import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Vendedor';
}

export function useTeamMembers(companyId: string | null) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!companyId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, company_id, is_active, is_archived')
      .eq('company_id', companyId)
      .eq('is_archived', false);

    if (error) {
      safeError('useTeamMembers fetch error:', error);
    } else {
      setMembers(
        (data ?? []).map(row => ({
          id: row.id,
          name: row.name ?? row.email,
          email: row.email,
          role: row.role === 'admin' ? 'Admin' : 'Vendedor',
        }))
      );
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  return { members, loading };
}
