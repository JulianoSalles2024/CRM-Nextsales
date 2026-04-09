import { motion } from 'framer-motion'
import { TrendingUp, Users, Building2, AlertTriangle, UserPlus, XCircle } from 'lucide-react'
import { useAdminKPIs } from '../hooks/useAdminKPIs'

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ACCENT = '#38BDF8'

interface KPICardProps {
  label:  string
  value:  string | number
  icon:   React.ElementType
  color:  string
  index:  number
  sub?:   string
}

function KPICard({ label, value, icon: Icon, color, index, sub }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-xl p-5 space-y-3"
      style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </p>
        <div className="p-1.5 rounded-lg" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="font-light leading-none text-2xl" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {value}
        </p>
        {sub && <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
      </div>
    </motion.div>
  )
}

function PlanBar({ plan, count, mrr_cents, total }: { plan: string; count: number; mrr_cents: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const colors: Record<string, string> = { starter: '#38BDF8', growth: '#818CF8', scale: '#34D399' }
  const color = colors[plan] ?? '#888'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-light">
        <span className="capitalize" style={{ color: 'rgba(255,255,255,0.6)' }}>{plan}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{count} empresa{count !== 1 ? 's' : ''} · {fmt(mrr_cents)}/mês</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: color }}
        />
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { kpis, loading, error } = useAdminKPIs()

  if (loading) {
    return (
      <div className="p-8 space-y-6 w-full">
        <div className="h-6 w-32 rounded animate-pulse" style={{ background: '#1a1a1a' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: '#111' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl p-6" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <p className="text-sm font-light" style={{ color: '#F87171' }}>Erro ao carregar KPIs: {error}</p>
          <p className="text-xs font-light mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Se o erro for "Acesso negado", faça logout e login novamente para renovar o token.
          </p>
        </div>
      </div>
    )
  }

  const totalActive = kpis?.mrr_by_plan?.reduce((acc, p) => acc + p.count, 0) ?? 0

  return (
    <div className="p-8 space-y-8 w-full">

      {/* Header */}
      <div>
        <h1 className="font-light text-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Dashboard
        </h1>
        <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Visão geral da plataforma em tempo real
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KPICard label="MRR"          value={fmt(kpis?.mrr_cents ?? 0)}         icon={TrendingUp}    color={ACCENT}    index={0} sub="receita recorrente" />
        <KPICard label="ARR"          value={fmt((kpis?.mrr_cents ?? 0) * 12)}   icon={TrendingUp}    color="#818CF8"   index={1} sub="anualizado" />
        <KPICard label="Empresas"     value={kpis?.total_companies ?? 0}          icon={Building2}     color={ACCENT}    index={2} sub="total cadastradas" />
        <KPICard label="Usuários"     value={kpis?.total_users ?? 0}              icon={Users}         color="#34D399"   index={3} sub="ativos" />
        <KPICard label="Ativos"       value={kpis?.active ?? 0}                   icon={Users}         color="#34D399"   index={4} sub="pagantes" />
        <KPICard label="Trial"        value={kpis?.trialing ?? 0}                 icon={UserPlus}      color="#FBBF24"   index={5} sub="em avaliação" />
        <KPICard label="Inadimpl."    value={kpis?.past_due ?? 0}                 icon={AlertTriangle} color="#F87171"   index={6} sub="past due" />
      </div>

      {/* Linha 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* MRR por plano */}
        <div className="md:col-span-2 rounded-xl p-6 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
            MRR por plano
          </p>
          {kpis?.mrr_by_plan?.length ? (
            <div className="space-y-4">
              {kpis.mrr_by_plan.map(p => (
                <PlanBar key={p.plan} plan={p.plan} count={p.count} mrr_cents={p.mrr_cents} total={totalActive} />
              ))}
            </div>
          ) : (
            <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Sem dados</p>
          )}
        </div>

        {/* Status rápido */}
        <div className="rounded-xl p-6 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Status
          </p>
          <div className="space-y-3">
            {[
              { label: 'Novos (30d)',  value: kpis?.new_last_30d ?? 0,  color: '#34D399' },
              { label: 'Cancelados',  value: kpis?.canceled ?? 0,       color: '#F87171' },
              { label: 'Past due',    value: kpis?.past_due ?? 0,       color: '#FBBF24' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                </div>
                <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>{value}</span>
              </div>
            ))}
          </div>

          {kpis?.past_due && kpis.past_due > 0 ? (
            <div className="rounded-lg p-3 flex items-start gap-2"
              style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)' }}>
              <AlertTriangle size={12} style={{ color: '#FB923C', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs font-light" style={{ color: '#FB923C' }}>
                {kpis.past_due} empresa{kpis.past_due > 1 ? 's' : ''} com pagamento pendente
              </p>
            </div>
          ) : (
            <div className="rounded-lg p-3 flex items-center gap-2"
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
              <XCircle size={12} style={{ color: '#34D399' }} />
              <p className="text-xs font-light" style={{ color: '#34D399' }}>Sem inadimplências</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
