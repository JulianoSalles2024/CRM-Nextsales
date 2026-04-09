import { Navigate } from 'react-router-dom'
import { useAuth } from '@/src/features/auth/AuthContext'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  const isAdmin = user?.app_metadata?.role === 'platform_admin'

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
