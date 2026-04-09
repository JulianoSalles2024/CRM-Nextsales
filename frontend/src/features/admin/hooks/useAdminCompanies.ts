import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/src/lib/supabase'

export interface AdminCompany {
  company_id:       string
  company_name:     string
  created_at:       string
  plan_slug:        string
  sub_status:       string
  billing_interval: string | null
  current_period_end: string | null
  grace_period_end:   string | null
  trial_ends_at:    string | null
  member_count:     number
  lead_count:       number
  owner_email:      string | null
}

export function useAdminCompanies(filters?: { status?: string; plan?: string; search?: string }) {
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('admin_list_companies', {
      p_limit:  100,
      p_offset: 0,
      p_status: filters?.status ?? null,
      p_plan:   filters?.plan ?? null,
      p_search: filters?.search ?? null,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setCompanies((data as AdminCompany[]) ?? [])
    setLoading(false)
  }, [filters?.status, filters?.plan, filters?.search])

  useEffect(() => { load() }, [load])

  return { companies, loading, error, refresh: load }
}
