import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import App from '@/App';
import { AppProviders } from './providers';
import { InstallProvider } from '@/src/features/install/context/InstallContext';
import InstallRouter from '@/src/features/install/InstallRouter';
import InvitePage, { InvalidTokenPage } from '@/src/features/auth/InvitePage';
import { AdminGuard } from '@/src/features/admin/AdminGuard';
import { AdminLayout } from '@/src/features/admin/AdminLayout';

// ── Lazy imports — backoffice admin ─────────────────────────
const AdminLogin         = lazy(() => import('@/src/features/admin/pages/AdminLogin'));
const AdminDashboard     = lazy(() => import('@/src/features/admin/pages/AdminDashboard'));
const AdminUsers         = lazy(() => import('@/src/features/admin/pages/AdminUsers'));
const AdminCompanies     = lazy(() => import('@/src/features/admin/pages/AdminCompanies'));
const AdminCompanyDetail = lazy(() => import('@/src/features/admin/pages/AdminCompanyDetail'));
const AdminBilling       = lazy(() => import('@/src/features/admin/pages/AdminBilling'));
const AdminHealth        = lazy(() => import('@/src/features/admin/pages/AdminHealth'));

function InviteRoute() {
    const { token } = useParams<{ token: string }>();
    return token?.trim() ? <InvitePage token={token.trim()} /> : <InvalidTokenPage />;
}

export const router = createBrowserRouter([
    {
        path: '/install/*',
        element: (
            <InstallProvider>
                <InstallRouter />
            </InstallProvider>
        ),
    },
    {
        path: '/invite/:token',
        element: <InviteRoute />,
    },
    // ── Backoffice Admin ────────────────────────────────────
    {
        path: '/admin/login',
        element: (
            <Suspense fallback={null}>
                <AdminLogin />
            </Suspense>
        ),
    },
    {
        path: '/admin',
        element: (
            <AdminGuard>
                <AdminLayout />
            </AdminGuard>
        ),
        children: [
            { index: true, element: <Navigate to="/admin/dashboard" replace /> },
            {
                path: 'dashboard',
                element: <Suspense fallback={null}><AdminDashboard /></Suspense>,
            },
            {
                path: 'usuarios',
                element: <Suspense fallback={null}><AdminUsers /></Suspense>,
            },
            {
                path: 'empresas',
                element: <Suspense fallback={null}><AdminCompanies /></Suspense>,
            },
            {
                path: 'empresas/:id',
                element: <Suspense fallback={null}><AdminCompanyDetail /></Suspense>,
            },
            {
                path: 'billing',
                element: <Suspense fallback={null}><AdminBilling /></Suspense>,
            },
            {
                path: 'health',
                element: <Suspense fallback={null}><AdminHealth /></Suspense>,
            },
        ],
    },
    {
        path: '/*',
        element: (
            <AppProviders>
                <App />
            </AppProviders>
        ),
    },
]);
