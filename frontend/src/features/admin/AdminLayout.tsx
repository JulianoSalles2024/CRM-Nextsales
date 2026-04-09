import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, CreditCard,
  Activity, ArrowLeft, LogOut, Bot, Layers,
} from 'lucide-react'
import { supabase } from '@/src/lib/supabase'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   path: '/admin/dashboard'  },
  { icon: Users,           label: 'Usuários',    path: '/admin/usuarios'   },
  { icon: Building2,       label: 'Empresas',    path: '/admin/empresas'   },
  { icon: CreditCard,      label: 'Billing',     path: '/admin/billing'    },
  { icon: Layers,          label: 'Planos',      path: '/admin/planos'     },
  { icon: Activity,        label: 'Plataforma',  path: '/admin/health'     },
  { icon: Bot,             label: 'Agentes IA',  path: '/admin/agentes'    },
]

const ACCENT = '#38BDF8'

export function AdminLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080808' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="flex flex-col w-56 flex-shrink-0 h-full"
        style={{
          background:  '#0A0A0A',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo + badge */}
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-sm font-semibold tracking-wide" style={{ color: ACCENT }}>
              NextSales
            </p>
            <span
              className="text-[9px] font-medium tracking-[0.3em] uppercase px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              ADMIN
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-light transition-all duration-150"
              style={({ isActive }) => ({
                background: isActive ? `${ACCENT}12` : 'transparent',
                color:      isActive ? ACCENT : 'rgba(255,255,255,0.45)',
                border:     isActive ? `1px solid ${ACCENT}22` : '1px solid transparent',
              })}
            >
              <Icon size={14} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-light transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            <ArrowLeft size={12} />
            Voltar ao CRM
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-light transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            <LogOut size={12} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Conteúdo ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#080808' }}>
        <Outlet />
      </main>

    </div>
  )
}
