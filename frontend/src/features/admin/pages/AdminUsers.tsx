import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, User, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminUsers } from '../hooks/useAdminUsers'

const ROLE_COLORS: Record<string, string> = {
  admin:  '#38BDF8',
  seller: '#34D399',
  user:   'rgba(255,255,255,0.4)',
}

const STATUS_COLORS: Record<string, string> = {
  active:   '#34D399',
  trialing: '#FBBF24',
  past_due: '#FB923C',
  canceled: '#F87171',
}

export default function AdminUsers() {
  const navigate            = useNavigate()
  const [search, setSearch] = useState('')
  const { users, loading, error, refresh } = useAdminUsers()

  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6 w-full">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-light text-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Usuários
          </h1>
          <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {loading ? '—' : `${filtered.length} usuário${filtered.length !== 1 ? 's' : ''}`}
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
          <div>
            <p className="text-sm font-light" style={{ color: '#F87171' }}>Erro ao carregar usuários</p>
            <p className="text-xs font-light mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative w-72">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por email ou nome..."
          className="pl-8 pr-3 py-2 rounded-lg text-sm font-light outline-none w-full"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
        />
      </div>

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Usuário', 'Empresa', 'Role', 'Plano', 'Último acesso'].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-[10px] tracking-[0.15em] uppercase font-medium"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse w-24" style={{ background: '#1a1a1a' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm font-light"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
                </td>
              </tr>
            ) : filtered.map((u, i) => (
              <motion.tr
                key={u.user_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.015 }}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Usuário */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <User size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-light" style={{ color: u.is_disabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)' }}>
                        {u.full_name ?? u.email}
                        {u.is_disabled && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>bloqueado</span>}
                      </p>
                      {u.full_name && (
                        <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>{u.email}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Empresa */}
                <td className="px-4 py-3">
                  {u.company_id ? (
                    <button
                      onClick={() => navigate(`/admin/empresas/${u.company_id}`)}
                      className="flex items-center gap-1 text-sm font-light transition-colors"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#38BDF8'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                    >
                      {u.company_name}
                      <ExternalLink size={10} />
                    </button>
                  ) : (
                    <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                  )}
                </td>

                {/* Role */}
                <td className="px-4 py-3">
                  <span className="text-xs font-medium capitalize"
                    style={{ color: ROLE_COLORS[u.role ?? ''] ?? 'rgba(255,255,255,0.4)' }}>
                    {u.role ?? '—'}
                  </span>
                </td>

                {/* Plano */}
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-light capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {u.plan_slug ?? '—'}
                    </span>
                    {u.sub_status && (
                      <p className="text-[10px] font-light capitalize"
                        style={{ color: STATUS_COLORS[u.sub_status] ?? 'rgba(255,255,255,0.25)' }}>
                        {u.sub_status.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                </td>

                {/* Último acesso */}
                <td className="px-4 py-3 text-xs font-light" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR')
                    : <span style={{ color: 'rgba(255,255,255,0.2)' }}>Nunca</span>
                  }
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
