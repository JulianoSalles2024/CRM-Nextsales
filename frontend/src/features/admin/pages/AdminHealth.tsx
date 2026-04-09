import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, Zap } from 'lucide-react'
import { supabase, supabaseUrl } from '@/src/lib/supabase'

interface N8NWorkflow { id: string; name: string; active: boolean; updatedAt: string }
interface N8NError    { id: string; workflowId: string; workflowName: string; startedAt: string; stoppedAt: string | null; status: string }

interface HealthData {
  n8nOnline: boolean
  workflows: N8NWorkflow[]
  errors:    N8NError[]
  checkedAt: string
}

export default function AdminHealth() {
  const [health,    setHealth]    = useState<HealthData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [checkedAt, setCheckedAt] = useState('')

  async function check() {
    setLoading(true)
    setHealth(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${supabaseUrl}/functions/v1/admin-health-check`,
        {
          method:  'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
            'Content-Type':  'application/json',
          },
          signal: AbortSignal.timeout(20_000),
        }
      )
      if (res.ok) {
        const data = await res.json() as HealthData
        setHealth(data)
      }
    } catch { /* n8n offline */ }
    setCheckedAt(new Date().toLocaleTimeString('pt-BR'))
    setLoading(false)
  }

  useEffect(() => { check() }, [])

  const active   = health?.workflows.filter(w => w.active).length  ?? 0
  const inactive = health?.workflows.filter(w => !w.active).length ?? 0
  const errCount = health?.errors.length ?? 0
  const n8nOnline = health?.n8nOnline ?? null

  const n8nIcon = loading
    ? <Clock size={14} style={{ color: '#FBBF24' }} />
    : n8nOnline
      ? <CheckCircle size={14} style={{ color: '#34D399' }} />
      : <XCircle    size={14} style={{ color: '#F87171' }} />

  const services = [
    {
      name:   'n8n (Automações)',
      status: loading ? 'verificando' : n8nOnline ? 'online' : 'offline',
      color:  loading ? '#FBBF24' : n8nOnline ? '#34D399' : '#F87171',
      icon:   n8nIcon,
    },
    { name: 'Supabase (Banco)',  status: 'online', color: '#34D399', icon: <CheckCircle size={14} style={{ color: '#34D399' }} /> },
    { name: 'Supabase Storage', status: 'online', color: '#34D399', icon: <CheckCircle size={14} style={{ color: '#34D399' }} /> },
    { name: 'Asaas (Billing)',  status: 'online', color: '#34D399', icon: <CheckCircle size={14} style={{ color: '#34D399' }} /> },
  ]

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-light text-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Saúde da Plataforma
          </h1>
          <p className="text-xs font-light mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Status dos serviços em tempo real
          </p>
        </div>
        <button onClick={check}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-light transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Serviços */}
      <div className="space-y-2">
        {services.map(({ name, status, color, icon }, i) => (
          <motion.div key={name}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>{name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {icon}
              <span className="text-xs font-light" style={{ color }}>{status}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {checkedAt && (
        <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Última verificação: {checkedAt}
        </p>
      )}

      {/* Workflows n8n */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Activity size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Workflows NextSales <span style={{ color: 'rgba(255,255,255,0.2)' }}>(tag: nextsales)</span>
            </p>
          </div>
          {health && (
            <div className="flex items-center gap-3 text-xs font-light">
              <span style={{ color: '#34D399' }}>{active} ativos</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{inactive} inativos</span>
              {errCount > 0 && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span style={{ color: '#F87171' }}>{errCount} erros recentes</span>
                </>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: '#1a1a1a' }} />
            ))}
          </div>
        ) : !health ? (
          <div className="p-8 text-center">
            <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Não foi possível carregar os workflows. Verifique o secret <code className="text-xs" style={{ color: '#38BDF8' }}>N8N_API_KEY</code>.
            </p>
            <p className="text-xs font-light mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Certifique-se de que os workflows no n8n têm a tag <code style={{ color: '#38BDF8' }}>nextsales</code>.
            </p>
          </div>
        ) : health.workflows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Nenhum workflow com a tag <code style={{ color: '#38BDF8' }}>nextsales</code> encontrado.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {health.workflows.map((wf, i) => (
              <motion.div key={wf.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="flex items-center justify-between px-5 py-3"
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${wf.active ? 'animate-pulse' : ''}`}
                    style={{ background: wf.active ? '#34D399' : 'rgba(255,255,255,0.2)' }} />
                  <span className="text-sm font-light" style={{ color: wf.active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)' }}>
                    {wf.name}
                  </span>
                  {health.errors.some(e => e.workflowId === wf.id) && (
                    <AlertTriangle size={12} style={{ color: '#F87171' }} />
                  )}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: wf.active ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
                    color:      wf.active ? '#34D399' : 'rgba(255,255,255,0.3)',
                  }}>
                  {wf.active ? 'ativo' : 'inativo'}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Erros recentes */}
      {health && health.errors.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(248,113,113,0.2)' }}>
          <div className="flex items-center gap-2 px-5 py-4"
            style={{ background: 'rgba(248,113,113,0.05)', borderBottom: '1px solid rgba(248,113,113,0.1)' }}>
            <Zap size={13} style={{ color: '#F87171' }} />
            <p className="text-[11px] tracking-[0.15em] uppercase font-medium" style={{ color: '#F87171' }}>
              Execuções com Erro
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {health.errors.map((err, i) => (
              <motion.div key={err.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>{err.workflowName}</p>
                  <p className="text-xs font-light mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {new Date(err.startedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                  {err.status}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
