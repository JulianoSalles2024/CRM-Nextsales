import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Check,
  Target, MessageSquare, DollarSign, RefreshCw,
  Database, Eye, Bot, Zap, FileText, RotateCcw,
  User, Shield,
} from 'lucide-react';
import type { AgentFunctionType, AgentTone, AgentInsert, AIAgent } from './hooks/useAgents';
import { getDefaultPrompt } from './agentPrompts';
import { usePlanLimits } from '@/src/hooks/usePlanLimits';

const FUNCTION_OPTIONS: {
  value: AgentFunctionType; label: string; desc: string; icon: React.ElementType; color: string;
}[] = [
  { value: 'hunter',     label: 'Hunter',     desc: 'Prospecta leads frios e mapeia novos contatos',        icon: Target,        color: '#f97316' },
  { value: 'sdr',        label: 'SDR',        desc: 'Qualifica leads e agenda reuniões com closers',        icon: MessageSquare, color: '#60a5fa' },
  { value: 'closer',     label: 'Closer',     desc: 'Fecha negócios e supera objeções finais',              icon: DollarSign,    color: '#34d399' },
  { value: 'followup',   label: 'Follow-up',  desc: 'Recupera leads e mantém relacionamento ativo',         icon: RefreshCw,     color: '#a78bfa' },
  { value: 'curator',    label: 'Curator',    desc: 'Higieniza base e enriquece dados dos leads',           icon: Database,      color: '#22d3ee' },
  { value: 'supervisor', label: 'Supervisor', desc: 'Monitora agentes e coordena o time comercial',         icon: Eye,           color: '#fbbf24' },
];

const TONE_OPTIONS: { value: AgentTone; label: string; desc: string }[] = [
  { value: 'formal',      label: 'Formal',       desc: 'Linguagem profissional e distante' },
  { value: 'consultivo',  label: 'Consultivo',   desc: 'Foca em entender e resolver problemas' },
  { value: 'descontraido',label: 'Descontraído', desc: 'Leve, próximo e amigável' },
  { value: 'tecnico',     label: 'Técnico',      desc: 'Detalhado e orientado a dados' },
  { value: 'agressivo',   label: 'Agressivo',    desc: 'Orientado a resultado, urgência alta' },
];

const GOAL_METRICS: { value: string; label: string }[] = [
  { value: 'leads', label: 'Leads prospectados' },
  { value: 'meetings', label: 'Reuniões agendadas' },
  { value: 'sales', label: 'Vendas fechadas' },
  { value: 'revenue', label: 'Receita gerada (R$)' },
  { value: 'qualified', label: 'Leads qualificados' },
];
const AVATAR_COLORS = [
  '#60a5fa','#34d399','#f97316','#a78bfa','#22d3ee','#fbbf24','#f87171','#fb7185',
];
const CLIENT_TYPES: { value: 'low' | 'medium' | 'high'; label: string; desc: string }[] = [
  { value: 'low',    label: 'SMB',        desc: 'Pequenas empresas e autônomos' },
  { value: 'medium', label: 'Mid-Market', desc: 'Médias empresas, 50-500 funcionários' },
  { value: 'high',   label: 'Enterprise', desc: 'Grandes corporações, ticket alto' },
];

const STEPS = [
  { label: 'Tipo',          desc: 'Função do agente',        icon: Bot },
  { label: 'Identidade',    desc: 'Nome e personalidade',    icon: User },
  { label: 'Canais',        desc: 'Onde vai atuar',          icon: Zap },
  { label: 'Meta',          desc: 'Objetivo mensal',         icon: Target },
  { label: 'Regras',        desc: 'Escalação e limites',     icon: Shield },
  { label: 'Comportamento', desc: 'Tom, emojis e restrições',icon: MessageSquare },
  { label: 'Prompt',        desc: 'Instruções do agente',    icon: FileText },
];

type FormData = Omit<AgentInsert, 'escalate_rules'> & {
  escalate_rules: {
    max_followups: number;
    min_ticket_to_escalate: number | null;
    keywords: string[];
    escalate_on_high_interest: boolean;
  };
  response_delay_seconds: 0 | 5 | 10 | 30 | 60;
  split_responses: boolean;
  use_emojis: boolean;
  sign_messages: boolean;
  restrict_topics: boolean;
};

const defaultForm = (): FormData => ({
  name: '',
  function_type: 'sdr',
  tone: 'consultivo',
  avatar_icon: '🤖',
  avatar_color: '#60a5fa',
  niche: '',
  client_type: 'medium',
  monthly_goal: null,
  goal_metric: 'meetings',
  channels: ['whatsapp'],
  lead_sources: [],
  work_hours_start: '08:00',
  work_hours_end: '18:00',
  timezone: 'America/Sao_Paulo',
  playbook_id: null,
  opening_script: getDefaultPrompt('sdr', { tone: 'consultivo', client_type: 'medium' }),
  is_active: false,
  response_delay_seconds: 0,
  split_responses: false,
  use_emojis: true,
  sign_messages: false,
  restrict_topics: false,
  escalate_rules: {
    max_followups: 5,
    min_ticket_to_escalate: null,
    keywords: [],
    escalate_on_high_interest: true,
  },
});

interface Props {
  onClose: () => void;
  onSave: (data: AgentInsert) => Promise<void>;
  editingAgent?: AIAgent | null;
}

export const AgentWizard: React.FC<Props> = ({ onClose, onSave, editingAgent }) => {
  const isEditing = !!editingAgent;

  const initialForm = (): FormData => {
    if (!editingAgent) return defaultForm();
    return {
      name:             editingAgent.name,
      function_type:    editingAgent.function_type,
      tone:             editingAgent.tone,
      avatar_icon:      editingAgent.avatar_icon,
      avatar_color:     editingAgent.avatar_color,
      niche:            editingAgent.niche,
      client_type:      editingAgent.client_type,
      monthly_goal:     editingAgent.monthly_goal,
      goal_metric:      editingAgent.goal_metric,
      channels:         editingAgent.channels,
      lead_sources:     editingAgent.lead_sources,
      work_hours_start: editingAgent.work_hours_start,
      work_hours_end:   editingAgent.work_hours_end,
      timezone:         editingAgent.timezone,
      playbook_id:      editingAgent.playbook_id,
      opening_script:   editingAgent.opening_script,
      is_active:        editingAgent.is_active,
      response_delay_seconds: (editingAgent.response_delay_seconds ?? 0) as 0 | 5 | 10 | 30 | 60,
      split_responses:  editingAgent.split_responses ?? false,
      use_emojis:       editingAgent.use_emojis ?? true,
      sign_messages:    editingAgent.sign_messages ?? false,
      restrict_topics:  editingAgent.restrict_topics ?? false,
      escalate_rules:   editingAgent.escalate_rules as FormData['escalate_rules'],
    };
  };

  const [step, setStep] = useState(isEditing ? 1 : 0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const { canUseAgent } = usePlanLimits();

  const update = (patch: Partial<FormData>) => setForm(f => ({ ...f, ...patch }));
  const updateEscalate = (patch: Partial<FormData['escalate_rules']>) =>
    setForm(f => ({ ...f, escalate_rules: { ...f.escalate_rules, ...patch } }));

  const resetPromptToDefault = () => {
    const prompt = getDefaultPrompt(form.function_type, {
      tone: form.tone,
      niche: form.niche ?? undefined,
      client_type: form.client_type,
      max_followups: form.escalate_rules.max_followups,
      min_ticket: form.escalate_rules.min_ticket_to_escalate,
    });
    update({ opening_script: prompt });
  };

  const canNext = () => {
    if (step === 0) return !!form.function_type;
    if (step === 1) return form.name.trim().length >= 2;
    if (step === 2) return form.channels.length > 0;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(form as AgentInsert);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg);
      console.error('[AgentWizard] save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedFn = FUNCTION_OPTIONS.find(f => f.value === form.function_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#0B1220] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500/5 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{isEditing ? 'Editar Agente' : 'Criar Agente'}</h2>
              <p className="text-xs text-slate-500">{STEPS[step].desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/5 overflow-x-auto scrollbar-none">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            const isClickable = isEditing || isDone;
            return (
              <button
                key={s.label}
                onClick={() => isClickable && setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-sky-500/5 text-sky-400 border border-sky-500/20'
                    : isDone
                    ? 'text-slate-300 hover:bg-slate-800/60 cursor-pointer'
                    : isEditing
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 cursor-pointer'
                    : 'text-slate-600 cursor-default'
                }`}
              >
                {isDone && !isActive
                  ? <Check className="w-3 h-3 text-sky-400" />
                  : <Icon className="w-3 h-3" />
                }
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          >

          {/* Step 0: Tipo */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {FUNCTION_OPTIONS.map(fn => {
                const Icon = fn.icon;
                const active = form.function_type === fn.value;
                // Bloqueado: tipos de infra OU tipo não liberado no plano
                const disabledInfra = ['hunter', 'followup', 'curator', 'supervisor'].includes(fn.value);
                const disabledByPlan = !disabledInfra && !canUseAgent(fn.value);
                const disabled = disabledInfra || disabledByPlan;
                return (
                  <button
                    key={fn.value}
                    onClick={() => {
                      if (disabled) return;
                      update({
                        function_type: fn.value,
                        opening_script: getDefaultPrompt(fn.value, {
                          tone: form.tone,
                          niche: form.niche ?? undefined,
                          client_type: form.client_type,
                        }),
                      });
                    }}
                    title={disabledByPlan ? `Agente ${fn.label} não está disponível no seu plano — faça upgrade` : undefined}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      disabled
                        ? 'border-white/5 bg-[#0F172A] opacity-35 cursor-not-allowed'
                        : active
                          ? 'border-blue-500/40 bg-blue-500/5'
                          : 'border-white/5 bg-[#0F172A] hover:border-white/15'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${fn.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: fn.color }} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-300'}`}>{fn.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{fn.desc}</p>
                    </div>
                    {active && !disabled && (
                      <Check className="w-4 h-4 text-sky-400 ml-auto flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 1: Identidade */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome do agente *</label>
                <input
                  type="text"
                  placeholder={`Ex: ${selectedFn?.label ?? 'Agente'} Pro`}
                  value={form.name}
                  onChange={e => update({ name: e.target.value })}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Cor do avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => update({ avatar_color: c })}
                      className={`w-7 h-7 rounded-lg transition-all ${form.avatar_color === c ? 'ring-2 ring-white/40 scale-110' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Tom de voz</label>
                <div className="grid grid-cols-1 gap-2">
                  {TONE_OPTIONS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => update({ tone: t.value })}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                        form.tone === t.value
                          ? 'border-blue-500/40 bg-blue-500/5 text-white'
                          : 'border-white/5 bg-[#0F172A] text-slate-400 hover:border-white/15'
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium">{t.label}</span>
                        <span className="text-xs text-slate-500 ml-2">{t.desc}</span>
                      </div>
                      {form.tone === t.value && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nicho de atuação</label>
                  <input
                    type="text"
                    placeholder="Ex: SaaS, Imóveis..."
                    value={form.niche ?? ''}
                    onChange={e => update({ niche: e.target.value })}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Perfil de cliente</label>
                  <select
                    value={form.client_type}
                    onChange={e => update({ client_type: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  >
                    {CLIENT_TYPES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Canais */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Início do expediente</label>
                  <input
                    type="time"
                    value={form.work_hours_start}
                    onChange={e => update({ work_hours_start: e.target.value })}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Fim do expediente</label>
                  <input
                    type="time"
                    value={form.work_hours_end}
                    onChange={e => update({ work_hours_end: e.target.value })}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Fuso horário</label>
                <select
                  value={form.timezone}
                  onChange={e => update({ timezone: e.target.value })}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                >
                  <option value="America/Sao_Paulo">America/Sao_Paulo (GMT-3)</option>
                  <option value="America/Manaus">America/Manaus (GMT-4)</option>
                  <option value="America/Belem">America/Belem (GMT-3)</option>
                  <option value="America/Fortaleza">America/Fortaleza (GMT-3)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Meta */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Métrica de meta</label>
                <div className="space-y-2">
                  {GOAL_METRICS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => update({ goal_metric: m.value as AgentInsert['goal_metric'] })}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                        form.goal_metric === m.value
                          ? 'border-blue-500/40 bg-blue-500/5 text-white'
                          : 'border-white/5 bg-[#0F172A] text-slate-400 hover:border-white/15'
                      }`}
                    >
                      <span className="text-sm">{m.label}</span>
                      {form.goal_metric === m.value && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Meta mensal ({GOAL_METRICS.find(m => m.value === form.goal_metric)?.label ?? ''})
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="Ex: 50"
                  value={form.monthly_goal ?? ''}
                  onChange={e => update({ monthly_goal: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                />
              </div>
            </div>
          )}

          {/* Step 4: Regras */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Máx. follow-ups antes de escalar
                </label>
                <input
                  type="number"
                  min={1} max={20}
                  value={form.escalate_rules.max_followups}
                  onChange={e => updateEscalate({ max_followups: Number(e.target.value) })}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Ticket mínimo para escalar (R$) — opcional
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="Ex: 5000"
                  value={form.escalate_rules.min_ticket_to_escalate ?? ''}
                  onChange={e => updateEscalate({
                    min_ticket_to_escalate: e.target.value ? Number(e.target.value) : null,
                  })}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Palavras-chave para escalação
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: contrato, urgente..."
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && keywordInput.trim()) {
                        updateEscalate({
                          keywords: [...form.escalate_rules.keywords, keywordInput.trim()],
                        });
                        setKeywordInput('');
                      }
                    }}
                    className="flex-1 bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                  <button
                    onClick={() => {
                      if (keywordInput.trim()) {
                        updateEscalate({ keywords: [...form.escalate_rules.keywords, keywordInput.trim()] });
                        setKeywordInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
                {form.escalate_rules.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.escalate_rules.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded"
                      >
                        {kw}
                        <button
                          onClick={() => updateEscalate({
                            keywords: form.escalate_rules.keywords.filter((_, j) => j !== i),
                          })}
                          className="text-slate-500 hover:text-red-400 ml-0.5"
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    form.escalate_rules.escalate_on_high_interest ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                  onClick={() => updateEscalate({ escalate_on_high_interest: !form.escalate_rules.escalate_on_high_interest })}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form.escalate_rules.escalate_on_high_interest ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-white">Escalar quando interesse muito alto</p>
                  <p className="text-xs text-slate-500">Detectado pelo IA — passa para humano</p>
                </div>
              </label>

              {/* Status inicial */}
              <div className="border-t border-white/5 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      form.is_active ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                    onClick={() => update({ is_active: !form.is_active })}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm text-white">Ativar agente ao criar</p>
                    <p className="text-xs text-slate-500">Se desativado, o agente fica em modo standby</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 5: Comportamento */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Controle o comportamento e tom do agente nas respostas geradas.
              </p>

              {/* Tempo de resposta */}
              <div className="p-3 rounded-xl border border-white/5 bg-[#0F172A]">
                <label className="block text-sm font-medium text-white mb-1">Tempo de resposta</label>
                <p className="text-xs text-slate-500 mb-2.5">Aguardar antes de enviar — simula digitação humana</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {([
                    { value: 0,  label: 'Imediato' },
                    { value: 5,  label: '5s' },
                    { value: 10, label: '10s' },
                    { value: 30, label: '30s' },
                    { value: 60, label: '1min' },
                  ] as { value: 0 | 5 | 10 | 30 | 60; label: string }[]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => update({ response_delay_seconds: opt.value })}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${
                        form.response_delay_seconds === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle helper */}
              {([
                {
                  key: 'split_responses' as const,
                  label: 'Dividir resposta em balões',
                  desc: 'Quebra textos longos em mensagens menores enviadas sequencialmente',
                },
                {
                  key: 'use_emojis' as const,
                  label: 'Usar emojis nas respostas',
                  desc: 'Permite que o agente use emojis de forma moderada',
                },
                {
                  key: 'sign_messages' as const,
                  label: `Assinar nome do agente`,
                  desc: `Adiciona "- ${form.name || 'Agente'}" ao final de cada mensagem`,
                },
                {
                  key: 'restrict_topics' as const,
                  label: 'Restringir temas permitidos',
                  desc: 'Guardrail estrito: recusa assuntos fora do escopo comercial',
                },
              ] as { key: 'split_responses' | 'use_emojis' | 'sign_messages' | 'restrict_topics'; label: string; desc: string }[]).map(item => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/5 bg-[#0F172A] hover:border-white/10 transition-colors">
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                      form[item.key] ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                    onClick={() => update({ [item.key]: !form[item.key] } as Partial<FormData>)}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      form[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Step 6: Prompt */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400" />
                    Prompt do Agente
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Instruções que definem o comportamento. Pré-configurado para <strong className="text-slate-300">{FUNCTION_OPTIONS.find(f => f.value === form.function_type)?.label}</strong> — edite à vontade.
                  </p>
                </div>
                <button
                  onClick={resetPromptToDefault}
                  title="Restaurar prompt padrão"
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0 ml-3"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar padrão
                </button>
              </div>

              <div className="bg-[#0F172A] border border-white/10 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  </div>
                  <span className="text-[11px] text-slate-600 ml-1">system_prompt.txt</span>
                </div>
                <textarea
                  value={form.opening_script ?? ''}
                  onChange={e => update({ opening_script: e.target.value })}
                  rows={14}
                  spellCheck={false}
                  className="w-full bg-transparent px-4 py-3 text-xs text-slate-300 font-mono leading-relaxed focus:outline-none resize-none"
                  placeholder="Digite as instruções do agente..."
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
                <Zap className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                  Variáveis substituídas pelo WF-07:{' '}
                  <span className="font-mono text-slate-500">{`{company_name}`}</span> ·{' '}
                  <span className="font-mono text-slate-500">{'{{tone}}'}</span> ·{' '}
                  <span className="font-mono text-slate-500">{'{{niche}}'}</span> ·{' '}
                  <span className="font-mono text-slate-500">{'{{objection_map}}'}</span>
                </p>
              </div>
            </div>
          )}

          </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        {saveError && (
          <div className="mx-6 mb-0 mt-0 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs text-red-400">Erro ao salvar: {saveError}</p>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-sm rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">{step + 1} / {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => canNext() && setStep(s => s + 1)}
                disabled={!canNext()}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  canNext()
                    ? 'border border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/50 transition-all'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 border border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/50 transition-all text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                ) : (
                  <><Zap className="w-4 h-4" /> {isEditing ? 'Salvar Alterações' : 'Criar Agente'}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
