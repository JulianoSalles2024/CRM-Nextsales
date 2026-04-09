import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, Users, AlertCircle, Check } from 'lucide-react'
import { supabase } from '@/src/lib/supabase'

const STATUS_COLORS: Record<string, string> = {
  active:   '#34D399',
  trialing: '#FBBF24',
  past_due: '#FB923C',
  canceled: '#F87171',
}

const PLANS = ['trial', 'starter', 'growth', 'scale']

interface CompanyDetail {
  company_id:       string
  company_name:     string
  created_at:       string
  plan_slug:        string
  sub_status:       string
  billing_interval: string | null
  current_period_end: string | null
  trial_ends_at:    string | null
  member_count:     number
  lead_count:       number
  owner_email:      string | null
}

export default function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [newPlan, setNewPlan] = useState('')
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    if (!id) return
    supabase.rpc('admin_list_companies', { p_limit: 200, p_offset: 0, p_status: null, p_plan: null, p_search: null })
      .then(({ data }) => {
        const found = (data as CompanyDetail[])?.find(c => c.company_id === id) ?? null
        setCompany(found)
        if (found) { setNewPlan(found.plan_slug); setNewStatus(found.sub_status) }
        setLoading(false)
      })
  }, [id])

  async function handleSavePlan() {
    if (!id || !newPlan) return
    setSaving(true)
    await supabase.rpc('admin_update_company_plan', {
      p_company_id: id,
      p_plan_slug:  newPlan,
      p_status:     newStatus,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setCompany(prev => prev ? { ...prev, plan_slug: newPlan, sub_status: newStatus } : prev)
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-6 w-48 rounded animate-pulse" style={{ background: '#1a1a1a' }} />
        <div className="h-32 rounded-xl animate-pulse" style={{ background: '#111' }} />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-8">
        <div className="rounded-xl p-6 flex items-start gap-2"
          style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertCircle size={14} style={{ color: '#F87171' }} />
          <p className="text-sm font-light" style={{ color: '#F87171' }}>Empresa não encontrada.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">

      {/* Back */}
      <button
        onClick={() => navigate('/admin/empresas')}
        className="flex items-center gap-1.5 text-xs font-light transition-colors"
        style={{ color: 'rgba(255,255,255,0.35)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
      >
        <ArrowLeft size={12} />
        Voltar para empresas
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}>
          <Building2 size={16} style={{ color: '#38BDF8' }} />
        </div>
        <div>
          <h1 className="font-light text-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {company.company_name}
          </h1>
          {company.owner_email && (
            <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>{company.owner_email}</p>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Membros',   value: company.member_count, icon: Users },
          { label: 'Leads',     value: company.lead_count,   icon: Building2 },
          { label: 'Plano',     value: company.plan_slug,    icon: Building2 },
          { label: 'Status',    value: company.sub_status,   icon: Building2 },
        ].map(({ label, value }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[10px] tracking-[0.15em] uppercase font-medium mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
            <p className="text-lg font-light capitalize" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {typeof value === 'string' && STATUS_COLORS[value]
                ? <span style={{ color: STATUS_COLORS[value] }}>{value.replace('_', ' ')}</span>
                : value
              }
            </p>
          </motion.div>
        ))}
      </div>

      {/* Datas */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Datas</p>
        <div className="grid grid-cols-2 gap-4 text-sm font-light">
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Cadastro</p>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>{new Date(company.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          {company.trial_ends_at && (
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Trial expira</p>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>{new Date(company.trial_ends_at).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
          {company.current_period_end && (
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Período atual até</p>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>{new Date(company.current_period_end).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Alterar plano */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Alterar plano manualmente
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={newPlan}
            onChange={e => setNewPlan(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm font-light outline-none"
            style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm font-light outline-none"
            style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            {['active', 'trialing', 'past_due', 'canceled', 'suspended'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={handleSavePlan}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: saved ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.1)',
              border:     saved ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(56,189,248,0.2)',
              color:      saved ? '#34D399' : '#38BDF8',
              opacity:    saving ? 0.6 : 1,
            }}
          >
            {saved ? <Check size={13} /> : null}
            {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
        <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Atualiza companies.plan_slug + subscriptions.status
        </p>
      </div>

    </div>
  )
}
