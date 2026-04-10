/**
 * PlanGuard — bloqueia ações quando o plano não permite.
 *
 * Uso 1 — wrapper de botão:
 *   <PlanGuard feature="has_whatsapp" reason="WhatsApp não está no seu plano">
 *     <button onClick={...}>Conectar</button>
 *   </PlanGuard>
 *
 * Uso 2 — limite numérico:
 *   <PlanGuard limit="max_pipelines" current={boards.length} reason="Limite de pipelines atingido">
 *     <button onClick={...}>Nova pipeline</button>
 *   </PlanGuard>
 *
 * Uso 3 — agente específico:
 *   <PlanGuard agent="closer" reason="Agente Closer não está no seu plano">
 *     <button>Ativar Closer</button>
 *   </PlanGuard>
 *
 * Quando bloqueado: renderiza o children com pointer-events:none + overlay de cadeado + tooltip.
 * Quando loading: renderiza children normalmente (fail-open para não quebrar UX durante fetch).
 */

import React from 'react'
import { Lock } from 'lucide-react'
import { usePlanLimits, PlanLimits } from '@/src/hooks/usePlanLimits'

type FeatureFlag = keyof Pick<PlanLimits,
  'has_whatsapp' | 'has_ai_sdr' | 'has_ai_closer' | 'has_ai_followup' |
  'has_portfolio' | 'has_reports_advanced' | 'has_api_access' |
  'has_priority_support' | 'has_dedicated_onboarding' |
  'has_community' | 'has_custom_fields' | 'has_sla'
>

type LimitKey = keyof Pick<PlanLimits,
  'max_pipelines' | 'max_leads' | 'max_users' | 'max_agents' |
  'max_whatsapp_instances' | 'max_playbooks' | 'max_custom_fields' |
  'max_sellers' | 'max_admins'
>

interface PlanGuardProps {
  children: React.ReactNode
  reason: string
  /** Feature flag — bloqueia se false */
  feature?: FeatureFlag
  /** Limite numérico — bloqueia se current >= limit */
  limit?: LimitKey
  current?: number
  /** Agente específico — bloqueia se não está em allowed_agents */
  agent?: string
}

export function PlanGuard({ children, reason, feature, limit, current = 0, agent }: PlanGuardProps) {
  const { limits, loading, hasFeature, canCreate, canUseAgent } = usePlanLimits()

  // Durante carregamento, não bloqueia (fail-open)
  if (loading || !limits) return <>{children}</>

  let blocked = false
  if (feature)             blocked = !hasFeature(feature)
  else if (limit !== undefined) blocked = !canCreate(limit, current)
  else if (agent)          blocked = !canUseAgent(agent)

  if (!blocked) return <>{children}</>

  const planName = limits.display_name ?? 'seu plano'

  return (
    <div className="relative inline-flex" title={`${reason} · Faça upgrade do plano ${planName}`}>
      {/* children desabilitados visualmente */}
      <div style={{ pointerEvents: 'none', opacity: 0.35, userSelect: 'none' }}>
        {children}
      </div>

      {/* Overlay clicável que mostra tooltip */}
      <div
        className="absolute inset-0 flex items-center justify-center rounded cursor-not-allowed"
        style={{ background: 'rgba(0,0,0,0.01)' }}
      >
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <Lock size={9} />
          Upgrade
        </div>
      </div>
    </div>
  )
}

/**
 * usePlanBlock — versão hook para usar dentro de handlers (sem JSX).
 * Retorna { blocked, reason } para checar antes de abrir modais.
 */
export function usePlanBlock() {
  const { limits, loading, hasFeature, canCreate, canUseAgent } = usePlanLimits()

  function check(opts: {
    feature?: FeatureFlag
    limit?: LimitKey
    current?: number
    agent?: string
    reason: string
  }): { blocked: boolean; reason: string } {
    if (loading || !limits) return { blocked: false, reason: '' }

    let blocked = false
    if (opts.feature)        blocked = !hasFeature(opts.feature)
    else if (opts.limit)     blocked = !canCreate(opts.limit, opts.current ?? 0)
    else if (opts.agent)     blocked = !canUseAgent(opts.agent)

    return { blocked, reason: blocked ? opts.reason : '' }
  }

  return { check, limits, loading }
}
