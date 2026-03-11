import React from 'react';
import InstallStartPage from './pages/InstallStartPage';
import InstallVercelPage from './pages/InstallVercelPage';
import InstallSupabasePage from './pages/InstallSupabasePage';
import InstallRunPage from './pages/InstallRunPage';

const PAGES: Record<string, React.ReactElement> = {
  fork:     <InstallRunPage />,      // entry point → shows fork/deploy onboarding
  start:    <InstallStartPage />,
  vercel:   <InstallVercelPage />,
  supabase: <InstallSupabasePage />,
  run:      <InstallRunPage />,
};

export default function InstallRouter() {
  const match = window.location.pathname.match(/^\/install\/(.+)$/);
  const step = match?.[1]?.trim() ?? '';
  const page = PAGES[step];

  if (!page) {
    return (
      <div style={{ color: 'white', padding: '2rem', fontFamily: 'monospace' }}>
        Página de instalação não encontrada: /install/{step}
      </div>
    );
  }

  return page;
}
