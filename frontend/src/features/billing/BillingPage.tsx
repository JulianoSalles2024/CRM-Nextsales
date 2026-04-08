import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Check, Zap, Rocket, Crown, CreditCard, Clock,
  Shield, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useBilling } from '@/src/contexts/BillingContext';
import CheckoutModal, { type CheckoutPlan, type BillingInterval } from './CheckoutModal';

// ─── Planos ───────────────────────────────────────────────────────────────────

const PLANS: CheckoutPlan[] = [
  { id: 'starter', name: 'Starter', price: 297,  gradient: 'from-sky-500 to-blue-500' },
  { id: 'growth',  name: 'Growth',  price: 697,  gradient: 'from-sky-500 to-blue-500' },
  { id: 'scale',   name: 'Scale',   price: 1497, gradient: 'from-sky-500 to-blue-500' },
];

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['1 pipeline de vendas', '500 leads ativos', 'Agente IA básico (SDR)', '1 usuário', 'WhatsApp integrado', 'Relatórios essenciais'],
  growth:  ['3 pipelines de vendas', '2.000 leads ativos', 'Agente IA avançado', '5 usuários', 'WhatsApp + automações', 'Relatórios completos', 'Follow-up automático'],
  scale:   ['Pipelines ilimitados', 'Leads ilimitados', 'Agente IA premium (full)', 'Usuários ilimitados', 'Tudo do Growth +', 'Suporte prioritário', 'Onboarding dedicado', 'API de integração'],
};

const PLAN_ICONS: Record<string, React.FC<{ className?: string }>> = {
  starter: Zap,
  growth:  Rocket,
  scale:   Crown,
};

const PLAN_POPULAR: Record<string, boolean> = {
  growth: true,
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function CurrentPlanBadge() {
  const { billing, daysRemaining, isTrial, isActive, isTrialExpired } = useBilling();
  if (!billing) return null;

  if (isTrialExpired) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
      <AlertCircle className="w-3.5 h-3.5" />
      Trial expirado — escolha um plano abaixo
    </div>
  );

  if (isTrial) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium">
      <Clock className="w-3.5 h-3.5" />
      Plano Thrill (Trial) · {daysRemaining} dias restantes
    </div>
  );

  if (isActive) {
    const periodEnd = billing.current_period_end
      ? new Date(billing.current_period_end).toLocaleDateString('pt-BR')
      : null;
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Plano {billing.plan_slug} · Ativo{periodEnd ? ` · até ${periodEnd}` : ''}
      </div>
    );
  }

  return null;
}

// ─── Card de plano ────────────────────────────────────────────────────────────

function PlanCard({
  plan, index, interval, onCheckout,
}: {
  plan: CheckoutPlan;
  index: number;
  interval: BillingInterval;
  onCheckout: (plan: CheckoutPlan) => void;
}) {
  const Icon     = PLAN_ICONS[plan.id];
  const popular  = PLAN_POPULAR[plan.id] ?? false;
  const features = PLAN_FEATURES[plan.id] ?? [];
  const price    = interval === 'yearly' ? Math.round(plan.price * 12 * 0.9) : plan.price;
  const perLabel = interval === 'yearly' ? '/ano' : '/mês';

  return (
    <div className="relative flex flex-col">
      {/* Badge popular */}
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[10px] font-bold px-3 py-1 rounded-full">
            ✦ Mais popular
          </div>
        </div>
      )}

      <div
        className={[
          'relative flex flex-col flex-1 rounded-xl border p-5 bg-[#0B1220] transition-colors duration-150',
          popular
            ? 'border-sky-500/25 ring-1 ring-sky-500/10'
            : 'border-white/5 hover:border-white/10',
        ].join(' ')}
      >
        {/* Ícone + nome */}
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#0B1220] border border-white/10 mb-3">
            <Icon className="w-4 h-4 text-sky-400" />
          </div>
          <h3 className="text-base font-bold text-white">{plan.name}</h3>
        </div>

        {/* Preço */}
        <div className="mb-5">
          <div className="flex items-end gap-1">
            <span className="text-xs text-slate-400 mb-1">R$</span>
            <span className="text-3xl font-black text-white leading-none">
              {price.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-400 mb-1">{perLabel}</span>
          </div>
          {interval === 'yearly' && (
            <p className="text-[10px] text-emerald-400 mt-0.5">10% off no anual</p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 flex-1 mb-5">
          {features.map((feat) => (
            <li key={feat} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 shrink-0 text-sky-400" strokeWidth={3} />
              <span className="text-xs text-slate-300">{feat}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onCheckout(plan)}
          className="group flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all
            border border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/50"
        >
          Assinar {plan.name}
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function BillingPage() {
  const { billing, isTrial, isTrialExpired, isActive, daysRemaining } = useBilling();
  const [interval, setInterval]         = useState<BillingInterval>('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-[#0B1220] border border-white/10">
              <CreditCard className="w-4 h-4 text-sky-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Plano & Assinatura</h1>
          </div>
          <p className="text-sm text-slate-400">
            Gerencie seu plano e faça upgrade para desbloquear mais recursos.
          </p>
        </div>
        <CurrentPlanBadge />
      </div>

      {/* Aviso urgência */}
      {isTrial && !isTrialExpired && daysRemaining <= 3 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/10">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-semibold">Atenção:</span> seu trial expira em {daysRemaining}{' '}
            {daysRemaining === 1 ? 'dia' : 'dias'}. Escolha um plano abaixo para não perder o acesso.
          </p>
        </div>
      )}

      {/* O que está incluído no trial */}
      {isTrial && !isTrialExpired && (
        <div className="p-4 rounded-xl border border-white/5 bg-[#0B1220]">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Seu plano Thrill inclui</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['Acesso completo', 'Agente IA', 'WhatsApp', 'Suporte'].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-slate-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalhes da assinatura ativa */}
      {isActive && billing?.current_period_end && (
        <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Assinatura ativa</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Plano</p>
              <p className="text-sm font-semibold text-white capitalize">{billing.plan_slug}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Período</p>
              <p className="text-sm font-semibold text-white">
                {billing.billing_interval === 'yearly' ? 'Anual' : 'Mensal'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Próxima renovação</p>
              <p className="text-sm font-semibold text-emerald-400">
                {new Date(billing.current_period_end).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Label + toggle mensal/anual */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          Escolha seu plano
        </p>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B1220] border border-white/5">
          {(['monthly', 'yearly'] as BillingInterval[]).map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                interval === iv
                  ? 'bg-sky-500/10 border border-sky-500/20 text-sky-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {iv === 'monthly' ? 'Mensal' : 'Anual (−10%)'}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-3">
        {PLANS.map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            index={i}
            interval={interval}
            onCheckout={setCheckoutPlan}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="text-center pb-4">
        <p className="text-[10px] text-slate-600">
          Sem taxas escondidas · Cancele quando quiser · Suporte em português
        </p>
      </div>

      {/* Modal de checkout */}
      <AnimatePresence>
        {checkoutPlan && (
          <CheckoutModal
            plan={checkoutPlan}
            interval={interval}
            onClose={() => setCheckoutPlan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
