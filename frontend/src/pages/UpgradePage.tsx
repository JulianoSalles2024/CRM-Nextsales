import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap, Rocket, Crown, ArrowRight, Sparkles, Shield, Users, BarChart3 } from 'lucide-react';

// ─── Planos ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 297,
    period: 'mês',
    description: 'Para times pequenos que querem decolar',
    icon: Zap,
    color: 'blue',
    gradient: 'from-blue-600 to-cyan-500',
    glow: 'shadow-blue-500/25',
    border: 'border-blue-500/30',
    ring: 'ring-blue-500/40',
    badge: null,
    features: [
      '1 pipeline de vendas',
      '500 leads ativos',
      'Agente IA básico (SDR)',
      '1 usuário',
      'WhatsApp integrado',
      'Relatórios essenciais',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 697,
    period: 'mês',
    description: 'Para equipes em expansão acelerada',
    icon: Rocket,
    color: 'violet',
    gradient: 'from-violet-600 to-purple-500',
    glow: 'shadow-violet-500/30',
    border: 'border-violet-500/40',
    ring: 'ring-violet-500/50',
    badge: 'Mais popular',
    popular: true,
    features: [
      '3 pipelines de vendas',
      '2.000 leads ativos',
      'Agente IA avançado',
      '5 usuários',
      'WhatsApp + automações',
      'Relatórios completos',
      'Follow-up automático',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 1497,
    period: 'mês',
    description: 'Para operações que não têm limite',
    icon: Crown,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/25',
    border: 'border-amber-500/30',
    ring: 'ring-amber-500/40',
    badge: null,
    features: [
      'Pipelines ilimitados',
      'Leads ilimitados',
      'Agente IA premium (full)',
      'Usuários ilimitados',
      'Tudo do Growth +',
      'Suporte prioritário',
      'Onboarding dedicado',
      'API de integração',
    ],
  },
] as const;

const WA_LINK = 'https://wa.me/5551985488078';

// ─── Feature highlight cards ──────────────────────────────────────────────────

const HIGHLIGHTS = [
  { icon: Shield,   label: 'Dados seguros',       desc: 'LGPD + criptografia' },
  { icon: Users,    label: 'Multi-usuário',        desc: 'Equipe conectada'    },
  { icon: BarChart3, label: 'IA de vendas',        desc: 'Prospecção 24/7'    },
  { icon: Sparkles, label: 'Automação total',      desc: 'Sem esforço manual' },
];

// ─── CheckMark animado ────────────────────────────────────────────────────────

function AnimatedCheck({ color }: { color: string }) {
  const colorMap: Record<string, string> = {
    blue:   'text-blue-400',
    violet: 'text-violet-400',
    amber:  'text-amber-400',
  };
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`shrink-0 w-4 h-4 ${colorMap[color]}`}
    >
      <Check className="w-4 h-4" strokeWidth={3} />
    </motion.div>
  );
}

// ─── Card de Plano ────────────────────────────────────────────────────────────

function PlanCard({ plan, index }: { plan: typeof PLANS[number]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = plan.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative flex flex-col"
    >
      {/* Popular badge */}
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <div className={`bg-gradient-to-r ${plan.gradient} text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg ${plan.glow} shadow-md`}>
            ✦ {plan.badge}
          </div>
        </div>
      )}

      {/* Card */}
      <motion.div
        animate={{ y: hovered ? -4 : 0 }}
        transition={{ duration: 0.25 }}
        className={`relative flex flex-col flex-1 rounded-2xl border p-6 overflow-hidden
          backdrop-blur-xl bg-white/[0.03]
          ${plan.border}
          ${plan.popular ? `ring-1 ${plan.ring} shadow-xl ${plan.glow}` : 'shadow-lg'}
          transition-shadow duration-300
          ${hovered ? `shadow-2xl ${plan.glow}` : ''}
        `}
      >
        {/* Glow de fundo */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-[0.04] pointer-events-none`}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} mb-3 shadow-lg ${plan.glow}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{plan.description}</p>
          </div>
        </div>

        {/* Preço */}
        <div className="mb-6">
          <div className="flex items-end gap-1">
            <span className="text-xs text-slate-400 mb-1.5">R$</span>
            <motion.span
              key={plan.price}
              initial={{ opacity: 0.5, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-4xl font-black text-white leading-none tracking-tight"
            >
              {plan.price.toLocaleString('pt-BR')}
            </motion.span>
            <span className="text-sm text-slate-400 mb-1">/{plan.period}</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-2.5 flex-1 mb-6">
          {plan.features.map((feat, i) => (
            <motion.li
              key={feat}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.12 + i * 0.04 + 0.3 }}
              className="flex items-center gap-2.5"
            >
              <AnimatedCheck color={plan.color} />
              <span className="text-sm text-slate-300">{feat}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href={`${WA_LINK}?text=${encodeURIComponent(`Olá! Quero assinar o plano ${plan.name} do NextSales (R$${plan.price}/mês).`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`group relative flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200
            bg-gradient-to-r ${plan.gradient} text-white shadow-lg ${plan.glow}
            hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
          `}
        >
          Assinar {plan.name}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </a>
      </motion.div>
    </motion.div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-[#050c18] flex flex-col items-center px-4 py-12 relative overflow-hidden">

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-cyan-600/5 blur-[100px]" />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 w-full max-w-5xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Logo / marca */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-violet-500/20 bg-violet-500/8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-violet-300">NextSales</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
            Seu plano Thrill{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              expirou
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Continue com o Sistema Operacional de Vendas que trabalha por você 24/7.
            Escolha o plano ideal e retome agora.
          </p>
        </motion.div>

        {/* Highlight cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12"
        >
          {HIGHLIGHTS.map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/6 bg-white/[0.02] backdrop-blur-sm text-center"
            >
              <div className="p-2 rounded-lg bg-white/5">
                <Icon className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Planos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center space-y-3"
        >
          <p className="text-xs text-slate-500">
            Dúvidas? Fale com nossa equipe pelo WhatsApp —
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 ml-1 underline underline-offset-2 transition-colors"
            >
              clique aqui
            </a>
          </p>
          <p className="text-[10px] text-slate-600">
            Sem taxas escondidas · Cancele quando quiser · Suporte em português
          </p>
        </motion.div>
      </div>
    </div>
  );
}
