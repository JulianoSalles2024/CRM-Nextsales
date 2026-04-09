import React, { useState } from 'react'
import { Bot, ChevronDown, Search } from 'lucide-react'
import { useAdminCompanies } from '../hooks/useAdminCompanies'
import { AgentAnalytics } from '@/src/features/agents/AgentAnalytics'

const ACCENT = '#38BDF8'

export default function AdminAgentAnalytics() {
  const [search, setSearch]               = useState('')
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [selectedName, setSelectedName]   = useState<string>('')
  const [dropdownOpen, setDropdownOpen]   = useState(false)

  const { companies, loading: loadingCompanies } = useAdminCompanies({ search: search || undefined })

  const selected = companies.find(c => c.company_id === selectedId)

  function pick(company: { company_id: string; company_name: string }) {
    setSelectedId(company.company_id)
    setSelectedName(company.company_name)
    setDropdownOpen(false)
    setSearch('')
  }

  return (
    <div className="p-8 space-y-8 w-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-light text-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Analytics de Agentes IA
          </h1>
          <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Desempenho do Exército Comercial por empresa
          </p>
        </div>

        {/* Company selector */}
        <div className="relative w-72 flex-shrink-0">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-light transition-colors"
            style={{
              background: '#111',
              border: `1px solid ${dropdownOpen ? ACCENT + '40' : 'rgba(255,255,255,0.08)'}`,
              color: selectedId ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
            }}
          >
            <div className="flex items-center gap-2 truncate">
              <Bot size={13} style={{ color: ACCENT, flexShrink: 0 }} />
              <span className="truncate">{selectedName || 'Selecionar empresa…'}</span>
            </div>
            <ChevronDown
              size={13}
              style={{ color: 'rgba(255,255,255,0.3)', transform: dropdownOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s', flexShrink: 0 }}
            />
          </button>

          {dropdownOpen && (
            <div
              className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden shadow-2xl"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Search */}
              <div className="px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <Search size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar empresa…"
                    className="flex-1 bg-transparent text-xs font-light outline-none"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  />
                </div>
              </div>

              {/* List */}
              <div className="max-h-56 overflow-y-auto">
                {loadingCompanies ? (
                  <div className="px-4 py-6 text-center text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Carregando…
                  </div>
                ) : companies.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Nenhuma empresa encontrada
                  </div>
                ) : (
                  companies.map(c => (
                    <button
                      key={c.company_id}
                      onClick={() => pick(c)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: c.company_id === selectedId ? `${ACCENT}10` : 'transparent',
                        color: c.company_id === selectedId ? ACCENT : 'rgba(255,255,255,0.65)',
                      }}
                      onMouseEnter={e => { if (c.company_id !== selectedId) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { if (c.company_id !== selectedId) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span className="text-sm font-light truncate">{c.company_name}</span>
                      <span className="text-[10px] font-light ml-2 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {c.plan_slug}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {!selectedId ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-24"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}22` }}
          >
            <Bot size={24} style={{ color: ACCENT }} />
          </div>
          <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Selecione uma empresa para ver os dados
          </p>
          <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Analytics de execuções, tokens, custo e funil comercial
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl p-6"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Company badge */}
          <div className="flex items-center gap-2 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold"
              style={{ background: `${ACCENT}20`, color: ACCENT }}
            >
              {selectedName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.85)' }}>{selectedName}</p>
              <p className="text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {selected?.plan_slug} · {selected?.sub_status}
              </p>
            </div>
          </div>

          <AgentAnalytics companyId={selectedId} />
        </div>
      )}
    </div>
  )
}
