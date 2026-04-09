import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/src/lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Credenciais inválidas.')
      setLoading(false)
      return
    }

    const isAdmin = data.user?.app_metadata?.role === 'platform_admin'
    if (!isAdmin) {
      await supabase.auth.signOut()
      setError('Acesso negado. Conta sem permissão de administrador.')
      setLoading(false)
      return
    }

    navigate('/admin/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#080808' }}
    >
      <div className="w-full max-w-sm space-y-8 px-4">

        {/* Logo */}
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold tracking-wide" style={{ color: '#38BDF8' }}>
            NextSales
          </p>
          <p className="text-xs font-medium tracking-[0.3em] uppercase"
            style={{ color: '#F87171' }}>
            Backoffice
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm font-light outline-none transition-colors"
              style={{
                background: '#111',
                border:     '1px solid rgba(255,255,255,0.08)',
                color:      'rgba(255,255,255,0.8)',
              }}
              onFocus={e  => e.currentTarget.style.border = '1px solid rgba(56,189,248,0.3)'}
              onBlur={e   => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm font-light outline-none transition-colors"
              style={{
                background: '#111',
                border:     '1px solid rgba(255,255,255,0.08)',
                color:      'rgba(255,255,255,0.8)',
              }}
              onFocus={e  => e.currentTarget.style.border = '1px solid rgba(56,189,248,0.3)'}
              onBlur={e   => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'}
            />
          </div>

          {error && (
            <p className="text-xs font-light text-center" style={{ color: '#F87171' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: loading ? 'rgba(56,189,248,0.06)' : 'rgba(56,189,248,0.1)',
              border:     '1px solid rgba(56,189,248,0.2)',
              color:      '#38BDF8',
              opacity:    loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Autenticando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Acesso restrito a administradores da plataforma
        </p>
      </div>
    </div>
  )
}
