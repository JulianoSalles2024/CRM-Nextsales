import React, { useState, useEffect } from 'react';
import {
  Plus, Clock, Trash2, Settings2, AlertTriangle, GripVertical,
  Loader2, AlertCircle, TimerOff, CheckCircle2,
} from 'lucide-react';
import FlatCard from '@/components/ui/FlatCard';
import { AllowedScheduleModal, type ScheduleConfig, type WeekDay } from './AllowedScheduleModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { useFollowupRules, type FollowupRule, type DelayUnit } from './hooks/useFollowupRules';
import { useCompanySettings } from './hooks/useCompanySettings';

// ─── Constants ────────────────────────────────────────────────────────────────

const DELAY_UNIT_LABELS: Record<DelayUnit, string> = {
  minutes: 'Minutos',
  hours:   'Horas',
  days:    'Dias',
};

const DAY_SHORT: Record<WeekDay, string> = {
  monday:    'Seg',
  tuesday:   'Ter',
  wednesday: 'Qua',
  thursday:  'Qui',
  friday:    'Sex',
  saturday:  'Sáb',
  sunday:    'Dom',
};

const buildScheduleSummary = (rule: FollowupRule): string => {
  const days = rule.allowed_days.map(d => DAY_SHORT[d]).join(', ');
  return `${days}  ·  ${rule.allowed_start_time} – ${rule.allowed_end_time}`;
};

// ─── Sub-component: RuleCard ─────────────────────────────────────────────────

interface RuleCardProps {
  rule:           FollowupRule;
  onLocalUpdate:  (updated: FollowupRule) => void;   // atualiza UI imediatamente
  onSave:         (updated: FollowupRule) => void;   // persiste no Supabase
  onDelete:       () => void;
  onOpenSchedule: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule, onLocalUpdate, onSave, onDelete, onOpenSchedule,
}) => {
  // Delay value com estado local para evitar salvar a cada tecla
  const [delayDraft, setDelayDraft] = useState(String(rule.delay_value));

  // Sincroniza se o pai atualizar a regra (ex: após fetch)
  useEffect(() => { setDelayDraft(String(rule.delay_value)); }, [rule.delay_value]);

  const handleDelayBlur = () => {
    const val = Math.max(1, Number(delayDraft) || 1);
    const updated = { ...rule, delay_value: val };
    onLocalUpdate(updated);
    onSave(updated);
  };

  const handleUnitChange = (unit: DelayUnit) => {
    const updated = { ...rule, delay_unit: unit };
    onLocalUpdate(updated);
    onSave(updated);
  };

  const handlePromptBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const updated = { ...rule, prompt: e.target.value };
    onLocalUpdate(updated);
    onSave(updated);
  };

  return (
    <div className="bg-[#0B1220] border border-slate-800 rounded-2xl overflow-hidden">

      {/* Card Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800 bg-[#0B0E14]">
        <GripVertical className="w-4 h-4 text-slate-600 flex-shrink-0 cursor-grab" />
        <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />

        <span className="text-xs text-slate-400 whitespace-nowrap">
          Se não responder em
        </span>

        <input
          type="number"
          min={1}
          value={delayDraft}
          onChange={e => setDelayDraft(e.target.value)}
          onBlur={handleDelayBlur}
          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
        />

        <select
          value={rule.delay_unit}
          onChange={e => handleUnitChange(e.target.value as DelayUnit)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          {(Object.entries(DELAY_UNIT_LABELS) as [DelayUnit, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <span className="ml-auto text-xs font-medium text-slate-600 whitespace-nowrap">
          Passo {rule.sequence_order}
        </span>
      </div>

      {/* Card Body */}
      <div className="px-5 py-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Prompt para a IA gerar a mensagem:
          </label>
          <textarea
            defaultValue={rule.prompt}
            onBlur={handlePromptBlur}
            rows={3}
            placeholder="Ex: O cliente parou de responder. Escreva uma mensagem amigável perguntando se ainda tem interesse, mencionando o produto discutido anteriormente."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 resize-none"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onOpenSchedule}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors flex-shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Configurar Horários
            </button>
            <span className="text-xs text-slate-500 truncate" title={buildScheduleSummary(rule)}>
              {buildScheduleSummary(rule)}
            </span>
          </div>

          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-xs font-medium rounded-lg transition-colors flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const SettingsInactiveActions: React.FC = () => {
  const { rules, isLoading, isSaving, error, addRule, updateRule, deleteRule } = useFollowupRules();

  // Estado local para UI responsiva (espelha o banco)
  const [localRules, setLocalRules] = useState<FollowupRule[]>([]);
  useEffect(() => { setLocalRules(rules); }, [rules]);

  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<string | null>(null);

  // ── Auto-close settings ──────────────────────────────────────────────────
  const {
    settings,
    isLoading: isLoadingSettings,
    isSaving:  isSavingSettings,
    error:     settingsError,
    updateAutoCloseHours,
  } = useCompanySettings();

  const [enabled,     setEnabled]     = useState(false);
  const [hoursDraft,  setHoursDraft]  = useState('48');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sincroniza estado local quando o banco carrega
  useEffect(() => {
    if (settings !== undefined) {
      const active = settings?.auto_close_hours != null;
      setEnabled(active);
      if (active) setHoursDraft(String(settings!.auto_close_hours));
    }
  }, [settings]);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      await updateAutoCloseHours(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleSaveAutoClose = async () => {
    const hours = parseInt(hoursDraft, 10);
    if (!hours || hours < 1) return;
    const ok = await updateAutoCloseHours(hours);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLocalUpdate = (updated: FollowupRule) =>
    setLocalRules(prev => prev.map(r => r.id === updated.id ? updated : r));

  const handleSave = (updated: FollowupRule) => {
    handleLocalUpdate(updated);
    updateRule(updated);
  };

  const handleSaveSchedule = (config: ScheduleConfig) => {
    if (!scheduleTarget) return;
    const target = localRules.find(r => r.id === scheduleTarget);
    if (!target) return;
    const updated = { ...target, ...config };
    handleSave(updated);
    setScheduleTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteRule(deleteTarget);
    setDeleteTarget(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const targetRule = localRules.find(r => r.id === scheduleTarget);

  return (
    <>
      <FlatCard className="p-0">

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white">Follow-up Automático por Inatividade</h2>
              {isSaving && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Configure a sequência de mensagens que a IA enviará automaticamente quando um cliente parar de responder.
            </p>
          </div>
          <button
            onClick={addRule}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Adicionar Regra
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Erro de migration não aplicada */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-red-500/5 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-300">Erro ao carregar regras</p>
                <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && !error && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-36 bg-slate-800/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Lista vazia */}
          {!isLoading && !error && localRules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Clock className="w-10 h-10 text-slate-700" />
              <p className="text-sm text-slate-500">Nenhuma regra configurada.</p>
              <p className="text-xs text-slate-600">Clique em "Adicionar Regra" para criar o primeiro follow-up automático.</p>
            </div>
          )}

          {/* Regras */}
          {!isLoading && localRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onLocalUpdate={handleLocalUpdate}
              onSave={handleSave}
              onDelete={() => setDeleteTarget(rule.id)}
              onOpenSchedule={() => setScheduleTarget(rule.id)}
            />
          ))}

        </div>
      </FlatCard>

      {/* ── Encerramento Automático de Conversas ── */}
      <FlatCard className="p-0">

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white">Encerramento Automático de Conversas</h2>
              {isSavingSettings && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Conversas sem interação pelo período definido serão automaticamente
              resolvidas e o lead marcado como{' '}
              <span className="text-red-400 font-medium">PERDIDO</span>.
            </p>
          </div>

          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={enabled}
            onClick={() => handleToggle(!enabled)}
            disabled={isLoadingSettings || isSavingSettings}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
              transition-colors duration-200 ease-in-out focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              ${enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
              transform transition-transform duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Skeleton */}
          {isLoadingSettings && (
            <div className="h-14 bg-slate-800/40 rounded-xl animate-pulse" />
          )}

          {/* Erro do banco */}
          {settingsError && !isLoadingSettings && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-red-500/5 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400/80">{settingsError}</p>
            </div>
          )}

          {/* Input de horas — visível apenas quando habilitado */}
          {!isLoadingSettings && enabled && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <TimerOff className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <label className="text-sm text-slate-300 whitespace-nowrap">
                  Encerrar após
                </label>
                <input
                  type="number"
                  min={1}
                  value={hoursDraft}
                  onChange={e => setHoursDraft(e.target.value)}
                  className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white text-center focus:outline-none
                    focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                />
                <span className="text-sm text-slate-400">horas de inatividade</span>
              </div>
              <button
                onClick={handleSaveAutoClose}
                disabled={isSavingSettings || !hoursDraft || parseInt(hoursDraft, 10) < 1}
                className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700
                  disabled:opacity-40 disabled:cursor-not-allowed
                  text-white text-sm font-medium rounded-lg transition-colors"
              >
                Salvar
              </button>
            </div>
          )}

          {/* Estado desativado */}
          {!isLoadingSettings && !enabled && (
            <p className="text-xs text-slate-600 italic">
              Ative o toggle para configurar o encerramento automático.
            </p>
          )}

          {/* Feedback de sucesso */}
          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-xs text-green-300">Configuração salva com sucesso.</p>
            </div>
          )}

          {/* Info box permanente */}
          {!isLoadingSettings && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-500/5 border border-amber-500/15 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                <span className="font-semibold text-amber-300">Atenção:</span>{' '}
                O encerramento automático age <strong>após</strong> o último passo de follow-up.
                O lead permanece no sistema com status{' '}
                <span className="font-semibold text-red-400">PERDIDO</span>{' '}
                para recuperação futura.
              </p>
            </div>
          )}
        </div>
      </FlatCard>

      {/* Schedule Modal */}
      {scheduleTarget && targetRule && (
        <AllowedScheduleModal
          initialConfig={{
            allowed_days:       targetRule.allowed_days,
            allowed_start_time: targetRule.allowed_start_time,
            allowed_end_time:   targetRule.allowed_end_time,
          }}
          onSave={handleSaveSchedule}
          onClose={() => setScheduleTarget(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDeleteModal
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          title="Excluir Regra de Follow-up"
          message={
            <>
              <p>Tem certeza que deseja excluir este passo da sequência?</p>
              <p className="mt-2 text-sm text-slate-500">
                Os demais passos serão renumerados automaticamente.
              </p>
            </>
          }
        />
      )}
    </>
  );
};

export default SettingsInactiveActions;
