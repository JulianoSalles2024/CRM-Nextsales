import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'

export interface PlanLimits {
  slug: string
  display_name: string
  description: string | null
  is_popular: boolean
  is_active: boolean
  sort_order: number

  price_monthly_cents: number
  price_yearly_cents: number

  max_pipelines: number | null
  max_leads: number | null
  max_users: number | null
  max_agents: number | null
  max_whatsapp_instances: number | null
  max_playbooks: number | null
  max_custom_fields: number | null

  has_whatsapp: boolean
  has_ai_sdr: boolean
  has_ai_closer: boolean
  has_ai_followup: boolean
  has_portfolio: boolean
  has_reports_advanced: boolean
  has_api_access: boolean
  has_priority_support: boolean
  has_dedicated_onboarding: boolean
  has_community: boolean
  has_custom_fields: boolean
  has_sla: boolean

  allowed_agents: string[]
}

interface UsePlanLimitsReturn {
  limits: PlanLimits | null
  loading: boolean
  /** Retorna true se o uso atual está dentro do limite (null = ilimitado = sempre true) */
  canCreate: (resource: keyof Pick<PlanLimits,
    'max_pipelines' | 'max_leads' | 'max_users' | 'max_agents' |
    'max_whatsapp_instances' | 'max_playbooks' | 'max_custom_fields'
  >, currentCount: number) => boolean
  /** Retorna true se a feature está liberada no plano */
  hasFeature: (flag: keyof Pick<PlanLimits,
    'has_whatsapp' | 'has_ai_sdr' | 'has_ai_closer' | 'has_ai_followup' |
    'has_portfolio' | 'has_reports_advanced' | 'has_api_access' |
    'has_priority_support' | 'has_dedicated_onboarding' |
    'has_community' | 'has_custom_fields' | 'has_sla'
  >) => boolean
  /** Retorna true se o agente está liberado no plano */
  canUseAgent: (agentSlug: string) => boolean
}

export function usePlanLimits(): UsePlanLimitsReturn {
  const [limits, setLimits] = useState<PlanLimits | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_my_plan_limits').then(({ data, error }) => {
      if (!error && data) setLimits(data as PlanLimits)
      setLoading(false)
    })
  }, [])

  function canCreate(
    resource: keyof Pick<PlanLimits,
      'max_pipelines' | 'max_leads' | 'max_users' | 'max_agents' |
      'max_whatsapp_instances' | 'max_playbooks' | 'max_custom_fields'
    >,
    currentCount: number
  ): boolean {
    if (!limits) return false
    const max = limits[resource]
    if (max === null) return true   // ilimitado
    return currentCount < max
  }

  function hasFeature(
    flag: keyof Pick<PlanLimits,
      'has_whatsapp' | 'has_ai_sdr' | 'has_ai_closer' | 'has_ai_followup' |
      'has_portfolio' | 'has_reports_advanced' | 'has_api_access' |
      'has_priority_support' | 'has_dedicated_onboarding' |
      'has_community' | 'has_custom_fields' | 'has_sla'
    >
  ): boolean {
    if (!limits) return false
    return Boolean(limits[flag])
  }

  function canUseAgent(agentSlug: string): boolean {
    if (!limits) return false
    return limits.allowed_agents.includes(agentSlug)
  }

  return { limits, loading, canCreate, hasFeature, canUseAgent }
}
