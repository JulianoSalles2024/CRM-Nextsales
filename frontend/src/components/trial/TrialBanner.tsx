import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Clock } from 'lucide-react';
import { useBilling } from '@/src/contexts/BillingContext';

interface Props {
  onUpgrade: () => void;
}

export default function TrialBanner({ onUpgrade }: Props) {
  const { isTrial, isTrialExpired, daysRemaining } = useBilling();
  const [dismissed, setDismissed] = React.useState(false);

  // Não mostra se não é trial, já expirou (o TrialGuard cuida disso) ou foi dismissado
  if (!isTrial || isTrialExpired || dismissed) return null;

  const isUrgent  = daysRemaining <= 2;
  const isWarning = daysRemaining <= 4 && daysRemaining > 2;

  const label = daysRemaining === 0
    ? 'Último dia do seu plano Thrill!'
    : daysRemaining === 1
    ? 'Falta 1 dia do seu plano Thrill'
    : `Faltam ${daysRemaining} dias do seu plano Thrill`;

  return (
    <AnimatePresence>
      <motion.div
        key="trial-banner"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div
          className={`relative flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b overflow-hidden
            ${isUrgent
              ? 'bg-red-500/8 border-red-500/20'
              : isWarning
              ? 'bg-orange-500/8 border-orange-500/20'
              : 'bg-sky-500/8 border-sky-500/20'
            }`}
        >
          {/* Glow linha esquerda */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-0.5
              ${isUrgent ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-sky-500'}`}
          />

          {/* Ícone */}
          <div
            className={`shrink-0 p-1.5 rounded-lg
              ${isUrgent
                ? 'bg-red-500/15'
                : isWarning
                ? 'bg-orange-500/15'
                : 'bg-sky-500/15'
              }`}
          >
            {isUrgent
              ? <Clock className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              : <Zap  className={`w-3.5 h-3.5 ${isWarning ? 'text-orange-400' : 'text-sky-400'}`} />
            }
          </div>

          {/* Texto */}
          <p className={`text-xs flex-1 font-medium
            ${isUrgent ? 'text-red-300' : isWarning ? 'text-orange-300' : 'text-sky-300'}`}>
            {label}.{' '}
            <span className="opacity-70 font-normal">
              Faça upgrade e continue usando o NextSales sem interrupção.
            </span>
          </p>

          {/* CTA */}
          <button
            onClick={onUpgrade}
            className={`shrink-0 text-xs font-semibold px-3 py-2 min-h-[36px] rounded-lg border transition-all whitespace-nowrap
              ${isUrgent
                ? 'text-red-300 border-red-500/40 hover:bg-red-500/10 hover:text-red-200'
                : isWarning
                ? 'text-orange-300 border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-200'
                : 'text-sky-400 border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/50'
              }`}
          >
            Fazer upgrade →
          </button>

          {/* Dismiss — só mostra se não for urgente */}
          {!isUrgent && (
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 p-2 text-slate-600 hover:text-slate-400 transition-colors"
              aria-label="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
