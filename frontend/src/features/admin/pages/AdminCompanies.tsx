import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Building2, AlertCircle, RefreshCw, ExternalLink, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminCompanies } from '../hooks/useAdminCompanies'

const STATUS_COLORS: Record<string, string> = {
  active:           '#34D399',
  trialing:         '#FBBF24',
  past_due:         '#FB923C',
  canceled:         '#F87171',
  suspended:        '#F87171',
  no_subscription:  'rgba(255,255,255,0.3)',
}

const STATUS_LABELS: Record<string, string> = {
  active:           'Ativo',
  trialing:         'Trial',
  past_due:         'Past Due',
  canceled:         'Cancelado',
  suspended:        'Suspenso',
  no_subscription:  'Sem plano',
}

export default function AdminCompanies() {
  const navigate            = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter]     = useState('')

  const { companies, loading, error, refresh } = useAdminCompanies({
    status: statusFilter || undefined,
    plan:   planFilter   || undefined,
  })

  const filtered = companies.filter(c =>
    !search || c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.owner_email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6 w-full">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-light text-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Empresas
          </h1>
          <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {loading ? '—' : `${filtered.length} empresa${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-light transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          <RefreshCw size={11} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-4 flex items-start gap-2"
          style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertCircle size={14} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
          <p className="text-sm font-light" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresa ou email..."
            className="pl-8 pr-3 py-2 rounded-lg text-sm font-light outline-none w-full"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm font-light outline-none"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="trialing">Trial</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Cancelado</option>
        </select>

        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm font-light outline-none"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
        >
          <option value="">Todos os planos</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="scale">Scale</option>
          <option value="trial">Trial</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Empresa', 'Plano', 'Status', 'Membros', 'Leads', 'Cadastro', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-[10px] tracking-[0.15em] uppercase font-medium"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse w-20" style={{ background: '#1a1a1a' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm font-light"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {search || statusFilter || planFilter ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada.'}
                </td>
              </tr>
            ) : filtered.map((c, i) => (
              <motion.tr
                key={c.company_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.015 }}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Empresa */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}>
                      <Building2 size={11} style={{ color: '#38BDF8' }} />
                    </div>
                    <div>
                      <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {c.company_name}
                      </p>
                      {c.owner_email && (
                        <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.owner_email}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Plano */}
                <td className="px-4 py-3 text-xs font-light capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {c.plan_slug ?? '—'}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      color:       STATUS_COLORS[c.sub_status] ?? 'rgba(255,255,255,0.4)',
                      background:  `${STATUS_COLORS[c.sub_status] ?? 'rgba(255,255,255,0.1)'}15`,
                      border:      `1px solid ${STATUS_COLORS[c.sub_status] ?? 'rgba(255,255,255,0.1)'}30`,
                    }}>
                    {STATUS_LABELS[c.sub_status] ?? c.sub_status}
                  </span>
                </td>

                {/* Membros */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <Users size={11} />
                    {c.member_count}
                  </div>
                </td>

                {/* Leads */}
                <td className="px-4 py-3 text-sm font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {c.lead_count}
                </td>

                {/* Cadastro */}
                <td className="px-4 py-3 text-xs font-light" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {new Date(c.created_at).toLocaleDateString('pt-BR')}
                </td>

                {/* Ação */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/admin/empresas/${c.company_id}`)}
                    className="flex items-center gap-1 text-xs font-light transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#38BDF8'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                  >
                    <ExternalLink size={11} />
                    Detalhe
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
