import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Heart, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useBilling } from '@/src/contexts/BillingContext';
import { useAuth } from '@/src/features/auth/AuthContext';

// ─── Motivos de cancelamento ──────────────────────────────────────────────────

const REASONS = [
  { id: 'price',       label: 'Está caro demais',              offer: 'Podemos pausar sua assinatura por 30 dias sem cobrar nada.' },
  { id: 'no_use',      label: 'Não estou usando a plataforma', offer: 'Que tal uma sessão de onboarding gratuita para aproveitar melhor?' },
  { id: 'competitor',  label: 'Fui para outro sistema',        offer: 'Entendemos. Quer um desconto de 20% para reconsiderar?' },
  { id: 'missing',     label: 'Falta uma funcionalidade',      offer: 'Conta pra gente o que falta — priorizamos no roadmap.' },
  { id: 'other',       label: 'Outro motivo',                  offer: null },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function CancelSubscriptionModal({ onClose }: Props) {
  const { billing, refetch }  = useBilling();
  const { companyId }         = useAuth();
  const [step, setStep]       = useState<'reason' | 'offer' | 'confirm' | 'done'>('reason');
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const reason    = REASONS.find(r => r.id === selected);
  const accessEnd = billing?.current_period_end
    ? new Date(billing.current_period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  async function handleCancel() {
    if (!companyId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/billing-cancel`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ company_id: companyId, reason: selected }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao cancelar');

      await refetch();
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-md bg-[#0B1220] border border-white/10 rounded-2xl overflow-hidden"
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Cancelar assinatura</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">

            {/* Step 1: Motivo */}
            {step === 'reason' && (
              <motion.div key="reason" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-sm text-slate-400 mb-4">Antes de ir, nos conta o motivo. Isso nos ajuda a melhorar.</p>
                <div className="space-y-2">
                  {REASONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                        selected === r.id
                          ? 'border-amber-500/40 bg-amber-500/5 text-white'
                          : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/10'
                      }`}
                    >
                      {r.label}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all">
                    Voltar
                  </button>
                  <button
                    onClick={() => reason?.offer ? setStep('offer') : setStep('confirm')}
                    disabled={!selected}
                    className="flex-1 py-2.5 rounded-xl border border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Continuar
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Oferta de retenção */}
            {step === 'offer' && reason?.offer && (
              <motion.div key="offer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col items-center text-center gap-3 py-2 mb-5">
                  <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-sky-400" />
                  </div>
                  <p className="text-sm font-semibold text-white">Uma última coisa antes de você ir</p>
                  <p className="text-sm text-slate-400">{reason.offer}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('confirm')}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all"
                  >
                    Cancelar mesmo assim
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 text-sm font-semibold transition-all"
                  >
                    Quero ficar
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmação final */}
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 mb-5">
                  <p className="text-sm text-amber-300 font-semibold mb-1">O que acontece ao cancelar:</p>
                  <ul className="text-xs text-slate-400 space-y-1 mt-2">
                    <li>• Você mantém acesso completo até <span className="text-white font-medium">{accessEnd ?? 'o fim do período'}</span></li>
                    <li>• Após essa data, a conta será suspensa</li>
                    <li>• Seus dados ficam guardados por 30 dias</li>
                    <li>• Pode reativar a qualquer momento</li>
                  </ul>
                </div>
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setStep('reason')} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all">
                    Voltar
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 text-sm font-semibold disabled:opacity-50 transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar cancelamento'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirmado */}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">Cancelamento registrado</p>
                <p className="text-xs text-slate-400 mb-5">
                  Seu acesso continua até <span className="text-white">{accessEnd}</span>. Sentiremos sua falta.
                </p>
                <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-all">
                  Fechar
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
