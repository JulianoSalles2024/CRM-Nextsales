import React from 'react';
import { createBrowserRouter, useParams } from 'react-router-dom';
import App from '@/App';
import { AppProviders } from './providers';
import { InstallProvider } from '@/src/features/install/context/InstallContext';
import InstallRouter from '@/src/features/install/InstallRouter';
import InvitePage, { InvalidTokenPage } from '@/src/features/auth/InvitePage';

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
    {
        path: '/*',
        element: (
            <AppProviders>
                <App />
            </AppProviders>
        ),
    },
]);
