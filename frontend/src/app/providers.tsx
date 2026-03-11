import React from 'react';
import { AuthProvider } from '@/src/features/auth/AuthContext';
import AuthGate from '@/src/features/auth/AuthGate';

const safeError = (...args: unknown[]) => {
    try { console.error(...args); } catch { /* ignore */ }
};

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
> {
    constructor(props: any) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        safeError('🔴 ERROR BOUNDARY CAUGHT:', error.message);
        safeError('🔴 Component stack:', info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{ color: 'red', background: '#1a0000', padding: '2rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    <h2>🔴 Erro capturado pelo Error Boundary:</h2>
                    <p>{this.state.error.message}</p>
                    <p>{this.state.error.stack}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <AuthGate>
                {children}
            </AuthGate>
        </AuthProvider>
    );
}
