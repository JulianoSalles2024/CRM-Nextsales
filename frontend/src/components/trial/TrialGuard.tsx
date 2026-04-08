import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBilling } from '@/src/contexts/BillingContext';
import UpgradePage from '@/src/pages/UpgradePage';

/**
 * TrialGuard — envolve o conteúdo interno do CRM.
 * Se o trial expirou, exibe a UpgradePage como overlay bloqueante.
 * O usuário não consegue fechar nem navegar sem assinar.
 */
export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const { isTrialExpired, isLoading } = useBilling();

  // Enquanto carrega os dados de billing, não bloqueia (evita flash)
  if (isLoading) return <>{children}</>;

  return (
    <>
      {children}

      <AnimatePresence>
        {isTrialExpired && (
          <motion.div
            key="trial-guard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] overflow-auto"
            style={{ background: 'rgba(3,7,18,0.97)', backdropFilter: 'blur(12px)' }}
          >
            <UpgradePage />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
