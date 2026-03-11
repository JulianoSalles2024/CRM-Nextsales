import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/features/auth/AuthContext';

interface AdminGuardProps {
    children: React.ReactNode;
    fallback?: string;
}

export function AdminGuard({ children, fallback = '/' }: AdminGuardProps) {
    const { currentUserRole, isRoleReady } = useAuth();

    if (!isRoleReady) return null;
    if (currentUserRole !== 'admin') return <Navigate to={fallback} replace />;

    return <>{children}</>;
}
