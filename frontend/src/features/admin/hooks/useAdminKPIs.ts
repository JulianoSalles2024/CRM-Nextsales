import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/src/lib/supabase'

export interface AdminKPIs {
  total_companies: number
  active:          number
  trialing:        number
  past_due:        number
  canceled:        number
  new_last_30d:    number
  total_users:     number
  mrr_cents:       number
  mrr_by_plan:     { plan: string; count: number; mrr_cents: number }[]
}

export function useAdminKPIs() {
  const [kpis, setKpis]       = useState<AdminKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const loadKPIs = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_get_kpis')
    if (error) { setError(error.message); setLoading(false); return }
    setKpis(data as AdminKPIs)
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { loadKPIs() }, [loadKPIs])

  useEffect(() => {
    const id = setInterval(loadKPIs, 5 * 60_000)
    return () => clearInterval(id)
  }, [loadKPIs])

  return { kpis, loading, error, refresh: loadKPIs }
}
