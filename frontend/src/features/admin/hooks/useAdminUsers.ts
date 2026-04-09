import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/src/lib/supabase'

export interface AdminUser {
  user_id:         string
  email:           string
  full_name:       string | null
  company_id:      string | null
  company_name:    string | null
  role:            string | null
  sub_status:      string | null
  plan_slug:       string | null
  created_at:      string
  last_sign_in_at: string | null
  is_disabled:     boolean
}

export function useAdminUsers() {
  const [users, setUsers]     = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('admin_list_users', {
      p_limit:  200,
      p_offset: 0,
      p_search: null,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setUsers((data as AdminUser[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  return { users, loading, error, refresh: loadUsers }
}
