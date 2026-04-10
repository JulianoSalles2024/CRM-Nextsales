import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowRight, Lock, TrendingUp, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Agentes que o usuário está "perdendo" por ter plano limitado
const LOCKED_AGENTS = [
  { label: 'Hunter',    emoji: '🎯', desc: 'Prospecta leads 24/7'         },
  { label: 'Closer',    emoji: '🤝', desc: 'Fecha deals automaticamente'  },
  { label: 'Follow-up', emoji: '📲', desc: 'Nutre e reativa contatos'     },
  { label: 'Curator',   emoji: '🧠', desc: 'Qualifica e prioriza leads'   },
  { label: 'Supervisor',emoji: '👁️', desc: 'Monitora toda operação'       },
];

interface Props {
  open: boolean;
  onClose: () => void;
  currentCount: number;
  maxCount: number;
}

export function AgentLimitModal({ open, onClose, currentCount, maxCount }: Props) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-lg pointer-events-auto">

              {/* Glow de fundo */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-sky-500/20 via-violet-500/10 to-transparent blur-xl pointer-events-none" />

              {/* Card */}
              <div className="relative rounded-2xl border border-white/10 bg-[#0a1628]/95 backdrop-blur-2xl overflow-hidden shadow-2xl">

                {/* Faixa superior gradiente */}
                <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-violet-500 to-sky-400" />

                {/* Botão fechar */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="p-7">

                  {/* Badge de status */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                      <Lock className="w-3 h-3" />
                      Limite do plano Starter atingido
                    </div>
                  </div>

                  {/* Headline */}
                  <h2 className="text-2xl font-black text-white leading-tight mb-2">
                    Seu exército precisa<br />
                    <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
                      de reforços
                    </span>
                  </h2>

                  {/* Subtext */}
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                    Você está usando <strong className="text-white">{currentCount}/{maxCount} agente</strong> disponível no Starter.
                    Times com múltiplos agentes fecham <strong className="text-emerald-400">3× mais deals</strong> — cada agente trabalha em paralelo, 24/7.
                  </p>

                  {/* Agentes bloqueados */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Agentes que você está perdendo
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {LOCKED_AGENTS.map((agent) => (
                        <div
                          key={agent.label}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.02]"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-base flex-shrink-0 opacity-50">
                            {agent.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-300 opacity-50">{agent.label}</p>
                            <p className="text-xs text-slate-600">{agent.desc}</p>
                          </div>
                          <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats rápidos */}
                  <div className="flex gap-3 mb-6">
                    <div className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-sky-500/15 bg-sky-500/5">
                      <Bot className="w-4 h-4 text-sky-400" />
                      <span className="text-lg font-black text-sky-400">5</span>
                      <span className="text-[10px] text-slate-500">agentes no Growth</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-lg font-black text-emerald-400">3×</span>
                      <span className="text-[10px] text-slate-500">mais conversões</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-violet-500/15 bg-violet-500/5">
                      <Zap className="w-4 h-4 text-violet-400" />
                      <span className="text-lg font-black text-violet-400">24/7</span>
                      <span className="text-[10px] text-slate-500">sem parar</span>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { onClose(); navigate('/upgrade'); }}
                      className="group relative w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white overflow-hidden bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 transition-all duration-200 shadow-lg shadow-sky-900/30 hover:shadow-sky-700/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Zap className="w-4 h-4" />
                      Ver planos e fazer upgrade
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Continuar com o plano atual
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
