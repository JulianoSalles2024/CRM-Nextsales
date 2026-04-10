import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers, RefreshCw, AlertCircle, Save, Infinity,
  Check, X, ChevronDown, ChevronUp, Plus,
} from 'lucide-react'
import { supabase } from '@/src/lib/supabase'

// ── tipos ────────────────────────────────────────────────────────────────────

interface PlanConfig {
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
  max_sellers: number | null
  max_admins: number | null
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

// ── helpers de display ───────────────────────────────────────────────────────

const LIMIT_LABELS: Record<string, string> = {
  max_pipelines:           'Pipelines',
  max_leads:               'Leads ativos',
  max_users:               'Usuários',
  max_agents:              'Agentes IA',
  max_whatsapp_instances:  'Instâncias WhatsApp',
  max_playbooks:           'Playbooks',
  max_custom_fields:       'Campos customizados',
  max_sellers:             'Vendedores',
  max_admins:              'Admins',
}

const FLAG_LABELS: Record<string, string> = {
  has_whatsapp:             'WhatsApp integrado',
  has_ai_sdr:               'Agente SDR',
  has_ai_closer:            'Agente Closer',
  has_ai_followup:          'Agente Follow-up',
  has_portfolio:            'Portfólio de produtos',
  has_reports_advanced:     'Relatórios avançados',
  has_api_access:           'Acesso à API',
  has_priority_support:     'Suporte prioritário',
  has_dedicated_onboarding: 'Onboarding dedicado',
  has_community:            'Comunidade',
  has_custom_fields:        'Campos customizados',
  has_sla:                  'SLA garantido',
}

const AGENT_LABELS: Record<string, string> = {
  sdr:      'SDR',
  closer:   'Closer',
  followup: 'Follow-up',
}

const ALL_AGENTS = ['sdr', 'closer', 'followup']

const SLUG_COLORS: Record<string, string> = {
  trial:   '#94A3B8',
  starter: '#38BDF8',
  growth:  '#818CF8',
  scale:   '#34D399',
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── campo numérico (null = ilimitado) ────────────────────────────────────────

function LimitField({
  label, value, onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState(value === null ? '' : String(value))

  function commit() {
    setEditing(false)
    if (raw === '' || raw === '∞') { onChange(null); return }
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n >= 0) onChange(n)
    else setRaw(value === null ? '' : String(value))
  }

  return (
    <div className="flex items-center justify-between py-1.5 group">
      <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      {editing ? (
        <input
          autoFocus
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit() }}
          placeholder="∞"
          className="w-20 text-right text-xs rounded px-1.5 py-0.5 outline-none"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(56,189,248,0.4)' }}
        />
      ) : (
        <button
          onClick={() => { setRaw(value === null ? '' : String(value)); setEditing(true) }}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
          style={{ color: value === null ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.04)' }}
          title="Clique para editar (deixe vazio = ilimitado)"
        >
          {value === null ? <><Infinity size={11} /> ilimitado</> : value}
        </button>
      )}
    </div>
  )
}

// ── toggle de feature ────────────────────────────────────────────────────────

function FeatureToggle({
  label, value, onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full py-1.5 transition-opacity"
      style={{ opacity: value ? 1 : 0.5 }}
    >
      <span className="text-xs font-light text-left" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <div
        className="w-8 h-4 rounded-full flex items-center transition-colors relative"
        style={{ background: value ? '#38BDF8' : 'rgba(255,255,255,0.12)' }}
      >
        <div
          className="absolute w-3 h-3 rounded-full bg-white transition-transform"
          style={{ transform: value ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </div>
    </button>
  )
}

// ── card do plano ────────────────────────────────────────────────────────────

function PlanCard({
  plan, onSave,
}: {
  plan: PlanConfig
  onSave: (p: PlanConfig) => Promise<void>
}) {
  const [local, setLocal] = useState<PlanConfig>(plan)
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(local) !== JSON.stringify(plan)
  const accent = SLUG_COLORS[local.slug] ?? '#38BDF8'

  function setField<K extends keyof PlanConfig>(k: K, v: PlanConfig[K]) {
    setLocal(p => ({ ...p, [k]: v }))
  }

  function toggleAgent(slug: string) {
    setLocal(p => ({
      ...p,
      allowed_agents: p.allowed_agents.includes(slug)
        ? p.allowed_agents.filter(a => a !== slug)
        : [...p.allowed_agents, slug],
    }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(local)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ background: '#0f0f0f', border: `1px solid ${dirty ? accent + '44' : 'rgba(255,255,255,0.07)'}` }}
    >
      {/* Header do card */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        style={{ borderBottom: expanded ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {local.display_name}
              </span>
              {local.is_popular && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium tracking-wider"
                  style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}>
                  POPULAR
                </span>
              )}
              {!local.is_active && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium tracking-wider"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                  INATIVO
                </span>
              )}
            </div>
            <p className="text-xs font-light mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {fmt(local.price_monthly_cents)}/mês · {fmt(local.price_yearly_cents)}/ano
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={e => { e.stopPropagation(); handleSave() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}
            >
              {saving ? <RefreshCw size={10} className="animate-spin" /> : saved ? <Check size={10} /> : <Save size={10} />}
              {saved ? 'Salvo' : 'Salvar'}
            </button>
          )}
          {expanded ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
        </div>
      </div>

      {/* Corpo expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Coluna 1: Limites numéricos */}
              <div className="space-y-1">
                <p className="text-[10px] tracking-[0.15em] uppercase font-medium mb-3"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Limites</p>

                {(Object.keys(LIMIT_LABELS) as (keyof PlanConfig)[]).map(k => (
                  <LimitField
                    key={k}
                    label={LIMIT_LABELS[k]}
                    value={local[k] as number | null}
                    onChange={v => setField(k, v as any)}
                  />
                ))}

                {/* Preços */}
                <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] tracking-[0.15em] uppercase font-medium mb-2"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>Preços</p>
                  {[
                    { label: 'Mensal (centavos)', key: 'price_monthly_cents' as const },
                    { label: 'Anual (centavos)',  key: 'price_yearly_cents'  as const },
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                      <input
                        type="number"
                        value={local[key] as number}
                        onChange={e => setField(key, parseInt(e.target.value) || 0)}
                        className="w-24 text-right text-xs rounded px-1.5 py-0.5 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna 2: Feature flags */}
              <div className="space-y-0.5">
                <p className="text-[10px] tracking-[0.15em] uppercase font-medium mb-3"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Features</p>

                {(Object.keys(FLAG_LABELS) as (keyof PlanConfig)[]).map(k => (
                  <FeatureToggle
                    key={k}
                    label={FLAG_LABELS[k]}
                    value={local[k] as boolean}
                    onChange={v => setField(k, v as any)}
                  />
                ))}
              </div>

              {/* Coluna 3: Agentes + meta */}
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] tracking-[0.15em] uppercase font-medium mb-3"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>Agentes liberados</p>
                  <div className="space-y-2">
                    {ALL_AGENTS.map(ag => (
                      <button
                        key={ag}
                        onClick={() => toggleAgent(ag)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors"
                        style={{
                          background: local.allowed_agents.includes(ag) ? `${accent}12` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${local.allowed_agents.includes(ag) ? accent + '30' : 'rgba(255,255,255,0.07)'}`,
                          color: local.allowed_agents.includes(ag) ? accent : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        {AGENT_LABELS[ag]}
                        {local.allowed_agents.includes(ag)
                          ? <Check size={11} />
                          : <X size={11} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                  <p className="text-[10px] tracking-[0.15em] uppercase font-medium mb-3"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>Meta</p>
                  <div className="space-y-2">
                    <FeatureToggle label="Plano ativo" value={local.is_active} onChange={v => setField('is_active', v)} />
                    <FeatureToggle label="Destacar como popular" value={local.is_popular} onChange={v => setField('is_popular', v)} />
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.45)' }}>Ordem de exibição</span>
                      <input
                        type="number"
                        value={local.sort_order}
                        onChange={e => setField('sort_order', parseInt(e.target.value) || 0)}
                        className="w-16 text-right text-xs rounded px-1.5 py-0.5 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div className="pt-1">
                      <label className="text-xs font-light block mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Descrição</label>
                      <textarea
                        rows={2}
                        value={local.description ?? ''}
                        onChange={e => setField('description', e.target.value || null)}
                        className="w-full text-xs rounded px-2 py-1.5 outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Rodapé com botão salvar */}
            {dirty && (
              <div className="px-5 py-3 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: accent, color: '#000' }}
                >
                  {saving ? <RefreshCw size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
                  {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── página principal ─────────────────────────────────────────────────────────

export default function AdminPlans() {
  const [plans, setPlans] = useState<PlanConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('admin_get_plan_configs')
    if (err) { setError(err.message); setLoading(false); return }
    setPlans((data as PlanConfig[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(updated: PlanConfig) {
    const { error: err } = await supabase.rpc('admin_upsert_plan_config', {
      p_config: updated as any,
    })
    if (err) { alert('Erro ao salvar: ' + err.message); return }
    // Atualiza localmente
    setPlans(ps => ps.map(p => p.slug === updated.slug ? updated : p))
  }

  return (
    <div className="p-8 space-y-6 w-full">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-light text-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Planos
          </h1>
          <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Configure limites e features de cada plano — aplicado automaticamente no CRM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-light transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-xl p-4 flex items-start gap-2"
          style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertCircle size={14} style={{ color: '#F87171', flexShrink: 0 }} />
          <p className="text-sm font-light" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#111' }} />
          ))}
        </div>
      )}

      {/* Lista de planos */}
      {!loading && (
        <div className="space-y-3">
          {plans.map(p => (
            <PlanCard key={p.slug} plan={p} onSave={handleSave} />
          ))}

          {plans.length === 0 && !error && (
            <div className="rounded-xl p-12 text-center" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <Layers size={24} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
              <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Nenhum plano configurado. Execute a migration 123 no Supabase.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
