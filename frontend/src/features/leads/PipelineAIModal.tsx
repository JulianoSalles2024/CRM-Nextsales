import React, { useState, useEffect, useRef } from 'react';
import { X, Bot, Zap, LayoutGrid, BookOpen, Code2, Layers, CheckCircle, Loader2, GitMerge, Plus, Trash2, Lock, BookOpenCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Tab = 'auto' | 'templates' | 'stages' | 'cadencia' | 'learn' | 'advanced';

interface TemplateOption {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

interface StageConfig {
  id: string;
  name: string;
  color: string;
  ai_prompt: string;
  // Cadência inteligente (migration 071)
  auto_triggers: string[];
  auto_playbook_id: string | null;
  requires_approval: boolean;
}

interface PlaybookOption {
  id: string;
  name: string;
}

// ── Templates de metodologia ──────────────────────────────────────────────────

const TEMPLATES: TemplateOption[] = [
  {
    id: 'bant',
    label: 'BANT',
    description: 'Budget, Authority, Need, Timeline',
    prompt:
      'Você é um agente de vendas especialista na metodologia BANT. Ao interagir com leads, qualifique-os identificando: Budget (orçamento disponível), Authority (quem decide a compra), Need (necessidade real do produto) e Timeline (prazo para decisão). Seja objetivo, profissional e consultivo. Faça perguntas diretas para entender cada critério e registre as informações relevantes para o time de vendas.',
  },
  {
    id: 'spin',
    label: 'SPIN Selling',
    description: 'Situação, Problema, Implicação, Necessidade',
    prompt:
      'Você é um agente de vendas treinado na metodologia SPIN Selling. Conduza as conversas explorando: Situação (contexto atual do cliente), Problema (dificuldades que enfrenta), Implicação (consequências do problema não resolvido) e Necessidade de Solução (benefícios da solução). Use perguntas abertas para aprofundar o entendimento e gerar valor antes de apresentar a solução.',
  },
  {
    id: 'meddic',
    label: 'MEDDIC',
    description: 'Métricas, Comprador, Critérios, Processo, Dor, Defensor',
    prompt:
      'Você é um agente especializado na metodologia MEDDIC para vendas complexas. Qualifique cada oportunidade levantando: Metrics (métricas de sucesso do cliente), Economic Buyer (quem tem poder de compra), Decision Criteria (critérios de decisão), Decision Process (processo de decisão), Identify Pain (dores identificadas) e Champion (defensor interno). Seja consultivo e estratégico em cada interação.',
  },
  {
    id: 'gpct',
    label: 'GPCT',
    description: 'Goals, Plans, Challenges, Timeline',
    prompt:
      'Você é um agente de vendas que utiliza a metodologia GPCT. Nas interações, explore: Goals (metas e objetivos do cliente), Plans (planos atuais para atingi-los), Challenges (desafios que impedem o progresso) e Timeline (urgência e prazo para decisão). Alinhe a proposta de valor da solução diretamente aos objetivos declarados pelo cliente.',
  },
  {
    id: 'simple',
    label: 'Simples',
    description: 'Abordagem direta e amigável',
    prompt:
      'Você é um assistente de vendas amigável e direto. Responda às dúvidas do cliente sobre o produto, colete informações de contato e interesse, e encaminhe leads qualificados para o time de vendas humano. Seja cordial, claro e objetivo em todas as interações.',
  },
];

// ── Estilos compartilhados ────────────────────────────────────────────────────

const inputCls =
  'w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all';

// ── Componente Toggle ─────────────────────────────────────────────────────────

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      checked ? 'bg-blue-600' : 'bg-slate-700'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface PipelineAIModalProps {
  boardId: string;
  boardName: string;
  companyId: string;
  onClose: () => void;
  onSaved?: () => void;
}

// ── Componente principal ──────────────────────────────────────────────────────

const PipelineAIModal: React.FC<PipelineAIModalProps> = ({
  boardId,
  boardName,
  companyId,
  onClose,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('auto');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [stages, setStages] = useState<StageConfig[]>([]);
  const [playbooks, setPlaybooks] = useState<PlaybookOption[]>([]);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado local para o input de gatilho por estágio
  const [triggerInputs, setTriggerInputs] = useState<Record<string, string>>({});
  const triggerRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Carrega configuração atual do board + stages + playbooks
  useEffect(() => {
    const load = async () => {
      const [boardRes, stagesRes, playbooksRes] = await Promise.all([
        supabase
          .from('boards')
          .select('ai_enabled, ai_prompt, ai_methodology')
          .eq('id', boardId)
          .eq('company_id', companyId)
          .maybeSingle(),
        supabase
          .from('board_stages')
          .select('id, name, color, ai_prompt, auto_triggers, auto_playbook_id, requires_approval')
          .eq('board_id', boardId)
          .eq('company_id', companyId)
          .order('order', { ascending: true }),
        supabase
          .from('playbooks')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name', { ascending: true }),
      ]);

      if (boardRes.data) {
        setAiEnabled(boardRes.data.ai_enabled ?? false);
        setPrompt(boardRes.data.ai_prompt ?? '');
        setSelectedTemplate(boardRes.data.ai_methodology ?? null);
        if (boardRes.data.ai_methodology) setActiveTab('templates');
        else if (boardRes.data.ai_prompt) setActiveTab('advanced');
      }

      if (stagesRes.data) {
        setStages(
          stagesRes.data.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color ?? '#6b7280',
            ai_prompt: s.ai_prompt ?? '',
            auto_triggers: Array.isArray(s.auto_triggers)
                ? (s.auto_triggers as unknown[]).map((t) =>
                    typeof t === 'string' ? t : (t as Record<string, string>)?.keyword ?? ''
                  ).filter(Boolean)
                : [],
            auto_playbook_id: s.auto_playbook_id ?? null,
            requires_approval: s.requires_approval ?? false,
          })),
        );
        // Inicializa inputs de gatilho vazios
        const inputs: Record<string, string> = {};
        stagesRes.data.forEach((s) => { inputs[s.id] = ''; });
        setTriggerInputs(inputs);
      }

      if (playbooksRes.data) {
        setPlaybooks(playbooksRes.data.map((p) => ({ id: p.id, name: p.name })));
      }

      setIsLoading(false);
    };
    load();
  }, [boardId, companyId]);

  // ── Handlers existentes ───────────────────────────────────────────────────

  const handleSelectTemplate = (t: TemplateOption) => {
    setSelectedTemplate(t.id);
    setPrompt(t.prompt);
    setActiveTab('templates');
  };

  const handleStagePromptChange = (stageId: string, value: string) => {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, ai_prompt: value } : s)));
  };

  // ── Handlers de cadência ──────────────────────────────────────────────────

  const handleAddTrigger = (stageId: string) => {
    const raw = (triggerInputs[stageId] ?? '').trim().toLowerCase();
    if (!raw) return;
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId && !s.auto_triggers.includes(raw)
          ? { ...s, auto_triggers: [...s.auto_triggers, raw] }
          : s,
      ),
    );
    setTriggerInputs((prev) => ({ ...prev, [stageId]: '' }));
    triggerRefs.current[stageId]?.focus();
  };

  const handleRemoveTrigger = (stageId: string, keyword: string) => {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? { ...s, auto_triggers: s.auto_triggers.filter((t) => t !== keyword) }
          : s,
      ),
    );
  };

  const handleCadenceChange = (
    stageId: string,
    field: 'auto_playbook_id' | 'requires_approval',
    value: string | boolean | null,
  ) => {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, [field]: value } : s)));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const { error: boardErr } = await supabase
      .from('boards')
      .update({
        ai_enabled: aiEnabled,
        ai_prompt: prompt || null,
        ai_methodology: selectedTemplate,
      })
      .eq('id', boardId)
      .eq('company_id', companyId);

    if (boardErr) {
      setError('Não foi possível salvar. Tente novamente.');
      setIsSaving(false);
      return;
    }

    if (stages.length > 0) {
      await Promise.all(
        stages.map((s) =>
          supabase
            .from('board_stages')
            .update({
              ai_prompt:        s.ai_prompt || null,
              auto_triggers:    s.auto_triggers,
              auto_playbook_id: s.auto_playbook_id || null,
              requires_approval: s.requires_approval,
            })
            .eq('id', s.id)
            .eq('company_id', companyId),
        ),
      );
    }

    setSaved(true);
    onSaved?.();
    setTimeout(() => setSaved(false), 3000);
    setIsSaving(false);
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'auto',      label: 'Automático',  icon: <Zap         className="w-3.5 h-3.5" /> },
    { id: 'templates', label: 'Templates',   icon: <LayoutGrid  className="w-3.5 h-3.5" /> },
    { id: 'stages',    label: 'Por Estágio', icon: <Layers      className="w-3.5 h-3.5" /> },
    { id: 'cadencia',  label: 'Cadência',    icon: <GitMerge    className="w-3.5 h-3.5" /> },
    { id: 'learn',     label: 'Aprender',    icon: <BookOpen    className="w-3.5 h-3.5" /> },
    { id: 'advanced',  label: 'Avançado',    icon: <Code2       className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0B1220] border border-slate-800 rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Agente de IA</h3>
              <p className="text-xs text-slate-500">{boardName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {aiEnabled ? 'Ativo' : 'Inativo'}
              </span>
              <Toggle checked={aiEnabled} onChange={setAiEnabled} />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-white/5 px-6 pt-4 gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap ${
                    activeTab === tab.id
                      ? tab.id === 'cadencia'
                        ? 'text-violet-400 border-violet-500 bg-violet-500/5'
                        : 'text-blue-400 border-blue-500 bg-blue-500/5'
                      : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* ── Automático ─────────────────────────────────────── */}
              {activeTab === 'auto' && (
                <div className="space-y-4">
                  <div className="bg-[#0F172A] border border-white/5 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white mb-1">Comportamento padrão</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          O agente utilizará as instruções globais configuradas para a sua empresa.
                          Ideal para começar rapidamente sem precisar personalizar o prompt.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#0F172A] border border-white/5 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">O agente irá</p>
                    {[
                      'Responder dúvidas sobre o produto automaticamente',
                      'Qualificar leads com perguntas de triagem',
                      'Escalar para humano quando necessário',
                      'Registrar informações coletadas no CRM',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        </div>
                        <span className="text-xs text-slate-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Templates ──────────────────────────────────────── */}
              {activeTab === 'templates' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Selecione uma metodologia. O prompt será pré-preenchido automaticamente e pode ser editado na aba <span className="text-blue-400">Avançado</span>.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {TEMPLATES.map((t) => {
                      const isSelected = selectedTemplate === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleSelectTemplate(t)}
                          className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-blue-500/10 border-blue-500/40 text-white'
                              : 'bg-[#0F172A] border-white/5 text-slate-300 hover:border-white/10 hover:bg-white/5'
                          }`}
                        >
                          <div>
                            <p className={`text-sm font-semibold ${isSelected ? 'text-blue-300' : ''}`}>
                              {t.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Por Estágio ─────────────────────────────────────── */}
              {activeTab === 'stages' && (
                <div className="space-y-3">
                  <div className="bg-[#0F172A] border border-white/5 rounded-xl p-3">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Configure uma instrução específica para cada etapa do funil.{' '}
                      <span className="text-slate-300">Deixe em branco</span> para usar o prompt global do pipeline como fallback.
                    </p>
                  </div>

                  {stages.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">
                      Nenhum estágio encontrado neste pipeline.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stages.map((stage, idx) => {
                        const isOpen = expandedStage === stage.id;
                        const hasPrompt = stage.ai_prompt.trim().length > 0;
                        return (
                          <div
                            key={stage.id}
                            className="bg-[#0F172A] border border-white/5 rounded-xl overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedStage(isOpen ? null : stage.id)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: stage.color }}
                                />
                                <span className="text-sm font-medium text-white">{stage.name}</span>
                                <span className="text-xs text-slate-600">#{idx + 1}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasPrompt && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                    Configurado
                                  </span>
                                )}
                                <span className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                                  ▾
                                </span>
                              </div>
                            </button>

                            {isOpen && (
                              <div className="px-4 pb-4 space-y-2 border-t border-white/5">
                                <label className="block text-xs font-medium text-slate-400 mt-3 mb-1.5">
                                  Instrução para este estágio
                                </label>
                                <textarea
                                  value={stage.ai_prompt}
                                  onChange={(e) => handleStagePromptChange(stage.id, e.target.value)}
                                  rows={5}
                                  placeholder={`Ex: O lead chegou em "${stage.name}". Sua missão agora é...`}
                                  className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
                                />
                                <p className="text-xs text-slate-600">{stage.ai_prompt.length} caracteres</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Cadência ────────────────────────────────────────── */}
              {activeTab === 'cadencia' && (
                <div className="space-y-3">
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Configure gatilhos para que a IA mova leads automaticamente ao detectar palavras-chave na conversa WhatsApp.
                      Defina também qual playbook é ativado ao entrar em cada estágio.
                    </p>
                  </div>

                  {stages.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">
                      Nenhum estágio encontrado neste pipeline.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stages.map((stage, idx) => {
                        const isOpen = expandedStage === `cadencia-${stage.id}`;
                        const hasTriggers = stage.auto_triggers.length > 0;
                        const hasPlaybook = !!stage.auto_playbook_id;
                        const isLastStage = idx === stages.length - 1;
                        const badgeCount = (hasTriggers ? 1 : 0) + (hasPlaybook ? 1 : 0) + (stage.requires_approval ? 1 : 0);

                        return (
                          <div
                            key={stage.id}
                            className="bg-[#0F172A] border border-white/5 rounded-xl overflow-hidden"
                          >
                            {/* Accordion header */}
                            <button
                              type="button"
                              onClick={() => setExpandedStage(isOpen ? null : `cadencia-${stage.id}`)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: stage.color }}
                                />
                                <span className="text-sm font-medium text-white">{stage.name}</span>
                                {isLastStage && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> Fechamento
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {badgeCount > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
                                    {badgeCount} {badgeCount === 1 ? 'regra' : 'regras'}
                                  </span>
                                )}
                                <span className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                                  ▾
                                </span>
                              </div>
                            </button>

                            {/* Accordion body */}
                            {isOpen && (
                              <div className="px-4 pb-5 space-y-5 border-t border-white/5 pt-4">

                                {/* Playbook automático */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <BookOpenCheck className="w-3.5 h-3.5 text-violet-400" />
                                    <label className="text-xs font-medium text-slate-300">
                                      Playbook ao entrar neste estágio
                                    </label>
                                  </div>
                                  <select
                                    value={stage.auto_playbook_id ?? ''}
                                    onChange={(e) =>
                                      handleCadenceChange(stage.id, 'auto_playbook_id', e.target.value || null)
                                    }
                                    className={`${inputCls} text-sm`}
                                  >
                                    <option value="">Nenhum</option>
                                    {playbooks.map((p) => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                  <p className="text-[11px] text-slate-600 mt-1">
                                    Ativado automaticamente quando um lead entra neste estágio.
                                  </p>
                                </div>

                                {/* Gatilhos de avanço */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <GitMerge className="w-3.5 h-3.5 text-violet-400" />
                                    <label className="text-xs font-medium text-slate-300">
                                      Gatilhos para avançar ao próximo estágio
                                    </label>
                                  </div>

                                  {/* Tags existentes */}
                                  {stage.auto_triggers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {stage.auto_triggers.map((kw) => (
                                        <span
                                          key={kw}
                                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300"
                                        >
                                          {kw}
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveTrigger(stage.id, kw)}
                                            className="text-violet-500 hover:text-red-400 transition-colors ml-0.5"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Input de novo gatilho */}
                                  {!isLastStage ? (
                                    <div className="flex gap-2">
                                      <input
                                        ref={(el) => { triggerRefs.current[stage.id] = el; }}
                                        type="text"
                                        value={triggerInputs[stage.id] ?? ''}
                                        onChange={(e) =>
                                          setTriggerInputs((prev) => ({ ...prev, [stage.id]: e.target.value }))
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            handleAddTrigger(stage.id);
                                          }
                                        }}
                                        placeholder='Ex: "quanto custa", "tenho interesse"'
                                        className={`${inputCls} text-xs flex-1`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAddTrigger(stage.id)}
                                        className="px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-lg text-violet-300 transition-colors"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-amber-400/70 italic">
                                      Estágio final — sem próximo estágio para avançar.
                                    </p>
                                  )}

                                  {!isLastStage && (
                                    <p className="text-[11px] text-slate-600 mt-1">
                                      Pressione Enter ou vírgula para adicionar. A IA detecta qualquer uma das palavras na conversa.
                                    </p>
                                  )}
                                </div>

                                {/* Modo de movimentação */}
                                <div>
                                  <label className="text-xs font-medium text-slate-300 mb-3 block">
                                    Modo de movimentação
                                  </label>
                                  <div className="space-y-2">
                                    <button
                                      type="button"
                                      onClick={() => !isLastStage && handleCadenceChange(stage.id, 'requires_approval', false)}
                                      disabled={isLastStage}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                                        !stage.requires_approval && !isLastStage
                                          ? 'border-violet-500/40 bg-violet-500/10'
                                          : 'border-white/5 bg-transparent opacity-50'
                                      } ${isLastStage ? 'cursor-not-allowed' : 'hover:border-white/10'}`}
                                    >
                                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        !stage.requires_approval && !isLastStage ? 'border-violet-400' : 'border-slate-600'
                                      }`}>
                                        {!stage.requires_approval && !isLastStage && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-white">Mover automaticamente</p>
                                        <p className="text-[11px] text-slate-500">A IA move o lead sem precisar de aprovação</p>
                                      </div>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCadenceChange(stage.id, 'requires_approval', true)}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                                        stage.requires_approval || isLastStage
                                          ? 'border-amber-500/40 bg-amber-500/10'
                                          : 'border-white/5 bg-transparent hover:border-white/10'
                                      }`}
                                    >
                                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        stage.requires_approval || isLastStage ? 'border-amber-400' : 'border-slate-600'
                                      }`}>
                                        {(stage.requires_approval || isLastStage) && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-medium text-white">Notificar vendedor para aprovar</p>
                                          {isLastStage && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                              Recomendado
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-500">A IA sugere a movimentação, humano confirma</p>
                                      </div>
                                    </button>
                                  </div>
                                </div>

                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {playbooks.length === 0 && (
                    <div className="bg-[#0F172A] border border-white/5 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500">
                        Nenhum playbook cadastrado ainda.{' '}
                        <span className="text-violet-400">Crie playbooks em Configurações → Playbooks</span>{' '}
                        para associá-los aos estágios.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Aprender ───────────────────────────────────────── */}
              {activeTab === 'learn' && (
                <div className="space-y-4">
                  <div className="bg-[#0F172A] border border-white/5 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white mb-1">Base de conhecimento (RAG)</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Treine o agente com documentos, FAQs, scripts de vendas e materiais internos.
                          O agente consultará essa base para responder com precisão sobre o seu produto.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#0F172A] border border-white/5 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Você poderá adicionar</p>
                    {[
                      'PDFs e documentos de produto',
                      'Perguntas frequentes (FAQ)',
                      'Scripts de abordagem de vendas',
                      'Políticas de preço e condições comerciais',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        </div>
                        <span className="text-xs text-slate-300">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between w-full px-4 py-3 bg-[#0F172A] border border-white/5 rounded-xl opacity-50 cursor-not-allowed">
                    <span className="text-sm font-medium text-slate-400">Treinamento de documentos</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-white/10">
                      Em breve
                    </span>
                  </div>
                </div>
              )}

              {/* ── Avançado ───────────────────────────────────────── */}
              {activeTab === 'advanced' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Prompt global para este pipeline. Usado como fallback quando um estágio não tiver instrução própria.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Prompt do agente
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={10}
                      placeholder="Ex: Você é um agente de vendas especializado em SaaS B2B. Seu objetivo é..."
                      className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
                    />
                    <p className="text-xs text-slate-600 mt-1.5">
                      {prompt.length} caracteres
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="flex-1">
                {saved && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Configurações salvas
                  </div>
                )}
                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PipelineAIModal;
