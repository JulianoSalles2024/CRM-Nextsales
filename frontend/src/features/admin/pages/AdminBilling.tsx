import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, TrendingUp, AlertCircle, RefreshCw, Clock } from 'lucide-react'
import { supabase } from '@/src/lib/supabase'

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_COLORS: Record<string, string> = {
  paid:     '#34D399',
  pending:  '#FBBF24',
  overdue:  '#F87171',
  canceled: 'rgba(255,255,255,0.3)',
  refunded: '#818CF8',
}

interface Invoice {
  id:                string
  company_id:        string
  plan_slug:         string
  status:            string
  payment_type:      string
  amount_cents:      number
  due_date:          string | null
  paid_at:           string | null
  created_at:        string
}

interface Company {
  id:         string
  name:       string
  plan_slug:  string
  plan_status: string
  trial_ends_at: string | null
}

export default function AdminBilling() {
  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [invRes, compRes] = await Promise.all([
        supabase.rpc('admin_get_invoices', { p_limit: 50 }),
        supabase.rpc('admin_list_companies', { p_limit: 200, p_offset: 0, p_status: null, p_plan: null, p_search: null }),
      ])

      if (invRes.error) throw invRes.error
      if (compRes.error) throw compRes.error

      setInvoices((invRes.data as any[]) ?? [])
      // Mapeia AdminCompany para o formato Company simples que precisamos
      const mapped = ((compRes.data as any[]) ?? []).map((c: any) => ({
        id:           c.company_id,
        name:         c.company_name,
        plan_slug:    c.plan_slug,
        plan_status:  c.sub_status,
        trial_ends_at: c.trial_ends_at,
      }))
      setCompanies(mapped)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar dados')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // MRR simplificado a partir de companies ativas
  const PLAN_PRICES: Record<string, number> = { starter: 29700, growth: 69700, scale: 149700 }
  const mrr = companies
    .filter(c => c.plan_status === 'active')
    .reduce((sum, c) => sum + (PLAN_PRICES[c.plan_slug] ?? 0), 0)

  // Renovações nos próximos 30 dias
  const upcoming = companies.filter(c => {
    if (!c.trial_ends_at || c.plan_status !== 'trialing') return false
    const diff = new Date(c.trial_ends_at).getTime() - Date.now()
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
  })

  return (
    <div className="p-8 space-y-8 w-full">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-light text-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Billing
          </h1>
          <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Receita e cobranças da plataforma
          </p>
        </div>
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

      {error && (
        <div className="rounded-xl p-4 flex items-start gap-2"
          style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertCircle size={14} style={{ color: '#F87171', flexShrink: 0 }} />
          <p className="text-sm font-light" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'MRR estimado',  value: fmt(mrr),          icon: TrendingUp, color: '#38BDF8', sub: 'empresas ativas' },
          { label: 'ARR estimado',  value: fmt(mrr * 12),      icon: TrendingUp, color: '#818CF8', sub: 'anualizado'       },
          { label: 'Trials ativos', value: upcoming.length,    icon: Clock,      color: '#FBBF24', sub: 'expiram em 30d'  },
        ].map(({ label, value, icon: Icon, color, sub }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-5 space-y-3"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
              <div className="p-1.5 rounded-lg" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <div>
              <p className="font-light leading-none text-2xl" style={{ color: 'rgba(255,255,255,0.9)' }}>{value}</p>
              <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Trials expirando */}
      {upcoming.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(251,191,36,0.2)' }}>
          <div className="flex items-center gap-2 px-5 py-4"
            style={{ background: 'rgba(251,191,36,0.05)', borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
            <Clock size={13} style={{ color: '#FBBF24' }} />
            <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: '#FBBF24' }}>
              Trials expirando em 30 dias
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {upcoming.map((c, i) => (
              <motion.div key={c.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.name}</p>
                <p className="text-xs font-light" style={{ color: '#FBBF24' }}>
                  {new Date(c.trial_ends_at!).toLocaleDateString('pt-BR')}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas faturas */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 px-5 py-4"
          style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <CreditCard size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Últimas cobranças
          </p>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: '#1a1a1a' }} />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Nenhuma cobrança registrada.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Empresa', 'Plano', 'Tipo', 'Valor', 'Status', 'Data'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[10px] tracking-[0.15em] uppercase font-medium"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any, i) => {
                const companyName = (inv as any).company_name ?? companies.find(c => c.id === inv.company_id)?.name ?? '—'
                return (
                  <motion.tr key={inv.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-4 py-3 text-sm font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>{companyName}</td>
                    <td className="px-4 py-3 text-xs font-light capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{inv.plan_slug}</td>
                    <td className="px-4 py-3 text-xs font-light capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{inv.payment_type}</td>
                    <td className="px-4 py-3 text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>{fmt(inv.amount_cents)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ color: STATUS_COLORS[inv.status] ?? 'rgba(255,255,255,0.4)', background: `${STATUS_COLORS[inv.status] ?? 'rgba(255,255,255,0.1)'}15` }}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-light" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
