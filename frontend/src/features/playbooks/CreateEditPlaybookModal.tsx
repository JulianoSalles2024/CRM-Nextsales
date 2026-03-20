import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Playbook, PlaybookStep, ColumnData, Task, Id } from '@/types';
import { ui } from '@/src/lib/uiStyles';
import { supabase } from '@/src/lib/supabase';

interface CreateEditPlaybookModalProps {
    playbook: Playbook | null;
    pipelineColumns: ColumnData[];
    onClose: () => void;
    onSubmit: (playbook: Playbook) => void;
}

const taskTypes: Task['type'][] = ['task', 'email', 'call', 'meeting', 'note'];

const taskTypeLabels: Record<Task['type'], string> = {
    task:    'Tarefa',
    email:   'Email',
    call:    'Ligação',
    meeting: 'Reunião',
    note:    'Nota',
};

const METHODOLOGIES = ['BANT', 'SPIN', 'MEDDIC', 'GPCT', 'Simple'] as const;
type Methodology = typeof METHODOLOGIES[number];

const OBJECTIVES = [
    { value: 'qualification',  label: 'Qualificação' },
    { value: 'reengagement',   label: 'Reengajamento' },
    { value: 'closing',        label: 'Fechamento' },
    { value: 'followup',       label: 'Follow-up Proposta' },
    { value: 'onboarding',     label: 'Onboarding' },
] as const;

const CreateEditPlaybookModal: React.FC<CreateEditPlaybookModalProps> = ({
    playbook, pipelineColumns, onClose, onSubmit,
}) => {
    const isEditMode = !!playbook;

    // ── Tab principal ─────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'ai' | 'manual'>(isEditMode ? 'manual' : 'ai');

    // ── Campos do playbook ────────────────────────────────────────────────────
    const [name, setName]   = useState('');
    const [stages, setStages] = useState<Id[]>([]);
    const [steps, setSteps]   = useState<PlaybookStep[]>([{ day: 1, type: 'email', instructions: '' }]);

    useEffect(() => {
        if (playbook) {
            setName(playbook.name);
            setStages(playbook.stages);
            setSteps(playbook.steps.length > 0 ? playbook.steps : [{ day: 1, type: 'email', instructions: '' }]);
        }
    }, [playbook]);

    // ── Estado da IA ──────────────────────────────────────────────────────────
    const [aiMode, setAiMode]             = useState<'prompt' | 'methodology'>('prompt');
    const [aiPrompt, setAiPrompt]         = useState('');
    const [methodology, setMethodology]   = useState<Methodology>('BANT');
    const [objective, setObjective]       = useState(OBJECTIVES[0].value);
    const [aiLoading, setAiLoading]       = useState(false);
    const [aiError, setAiError]           = useState('');
    const [aiGenerated, setAiGenerated]   = useState(false);

    // ── Handlers de estágio ───────────────────────────────────────────────────
    const handleStageToggle = (stageId: Id) => {
        setStages(prev =>
            prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId],
        );
    };

    // ── Handlers de passos ────────────────────────────────────────────────────
    const handleStepChange = (index: number, field: keyof PlaybookStep, value: string | number) => {
        const newSteps = [...steps];
        const step = { ...newSteps[index] };
        if (field === 'day')          step.day          = Math.max(1, Number(value));
        else if (field === 'type')    step.type         = value as Task['type'];
        else                          step.instructions = value as string;
        newSteps[index] = step;
        setSteps(newSteps);
    };

    const addStep = () => {
        const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
        setSteps([...steps, { day: lastDay + 2, type: 'task', instructions: '' }]);
    };

    const removeStep = (index: number) => {
        if (steps.length > 1) setSteps(steps.filter((_, i) => i !== index));
    };

    // ── Geração com IA ────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        setAiError('');
        if (aiMode === 'prompt' && !aiPrompt.trim()) {
            setAiError('Descreva o objetivo do playbook antes de gerar.');
            return;
        }
        setAiLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('Usuário não autenticado.');

            const body =
                aiMode === 'prompt'
                    ? { mode: 'prompt', prompt: aiPrompt, stageNames: pipelineColumns.map(c => c.title) }
                    : { mode: 'methodology', methodology, objective, stageNames: pipelineColumns.map(c => c.title) };

            const res = await fetch('/api/ai/generate-playbook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro ao gerar playbook.');

            setName(data.name);
            setSteps(data.steps);
            setAiGenerated(true);
            setActiveTab('manual'); // move para revisão
        } catch (err: any) {
            setAiError(err.message ?? 'Erro inesperado. Tente novamente.');
        } finally {
            setAiLoading(false);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || stages.length === 0) {
            alert('Por favor, preencha o nome e selecione ao menos um estágio.');
            return;
        }
        onSubmit({
            id: playbook?.id || `temp-${Date.now()}`,
            name,
            stages,
            steps,
        });
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`${ui.modalContainer} w-full max-w-2xl`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {isEditMode ? 'Editar Playbook' : 'Novo Playbook'}
                            </h2>
                            {aiGenerated && !isEditMode && (
                                <p className="text-xs text-sky-400 mt-0.5 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Gerado com IA — revise antes de salvar
                                </p>
                            )}
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs — só exibe na criação */}
                    {!isEditMode && (
                        <div className="flex gap-1 mt-4 bg-slate-900/60 rounded-lg p-1 w-fit">
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    activeTab === 'ai'
                                        ? 'bg-sky-600 text-white'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Gerar com IA
                            </button>
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    activeTab === 'manual'
                                        ? 'bg-slate-700 text-white'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Criar Manual
                            </button>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {/* ── Tab: Gerar com IA ─────────────────────────────────────── */}
                    {activeTab === 'ai' && (
                        <motion.div
                            key="ai-tab"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="p-6 space-y-5 overflow-y-auto max-h-[60vh]"
                        >
                            {/* Seletor de modo */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAiMode('prompt')}
                                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                                        aiMode === 'prompt'
                                            ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                                            : 'border-white/10 text-slate-400 hover:border-white/20'
                                    }`}
                                >
                                    Prompt livre
                                </button>
                                <button
                                    onClick={() => setAiMode('methodology')}
                                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                                        aiMode === 'methodology'
                                            ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                                            : 'border-white/10 text-slate-400 hover:border-white/20'
                                    }`}
                                >
                                    Metodologia
                                </button>
                            </div>

                            {/* Prompt livre */}
                            {aiMode === 'prompt' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Descreva o objetivo do playbook
                                    </label>
                                    <textarea
                                        value={aiPrompt}
                                        onChange={e => setAiPrompt(e.target.value)}
                                        rows={4}
                                        placeholder='Ex: "Follow-up para lead que pediu proposta e sumiu por 3 dias"&#10;Ex: "Reengajamento de lead frio que não responde há 2 semanas"'
                                        className={`${ui.input} resize-none w-full`}
                                    />
                                </div>
                            )}

                            {/* Metodologia */}
                            {aiMode === 'methodology' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Metodologia de vendas
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {METHODOLOGIES.map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setMethodology(m)}
                                                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                                        methodology === m
                                                            ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                                                            : 'border-white/10 text-slate-400 hover:border-white/20'
                                                    }`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Objetivo
                                        </label>
                                        <select
                                            value={objective}
                                            onChange={e => setObjective(e.target.value)}
                                            className={`${ui.input} w-full`}
                                        >
                                            {OBJECTIVES.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Erro */}
                            {aiError && (
                                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    {aiError}
                                </div>
                            )}

                            {/* Botão gerar */}
                            <button
                                onClick={handleGenerate}
                                disabled={aiLoading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                            >
                                {aiLoading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Gerando playbook...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" /> Gerar Playbook
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* ── Tab: Manual / Revisão ─────────────────────────────────── */}
                    {activeTab === 'manual' && (
                        <motion.div
                            key="manual-tab"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                        >
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                                    {/* Nome */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Nome do Playbook
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            required
                                            className={`${ui.input} w-full`}
                                            placeholder="Ex: Follow-up Proposta 5 dias"
                                        />
                                    </div>

                                    {/* Estágios */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Estágios do Pipeline
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {pipelineColumns.map(col => (
                                                <button
                                                    type="button"
                                                    key={col.id}
                                                    onClick={() => handleStageToggle(col.id)}
                                                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                                                        stages.includes(col.id)
                                                            ? 'text-white'
                                                            : 'text-slate-300 border-slate-600 hover:border-slate-500'
                                                    }`}
                                                    style={
                                                        stages.includes(col.id)
                                                            ? { backgroundColor: `${col.color}40`, borderColor: col.color }
                                                            : {}
                                                    }
                                                >
                                                    {col.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Passos */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-slate-300">
                                                Etapas da Cadência
                                            </label>
                                            {aiGenerated && !isEditMode && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('ai')}
                                                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                                                >
                                                    <RefreshCw className="w-3 h-3" /> Regenerar com IA
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            {steps.map((step, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-white/10"
                                                >
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-sm text-slate-400">D+</span>
                                                        <input
                                                            type="number"
                                                            value={step.day}
                                                            onChange={e => handleStepChange(index, 'day', e.target.value)}
                                                            className="w-14 bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-center"
                                                            min="1"
                                                        />
                                                    </div>
                                                    <select
                                                        value={step.type}
                                                        onChange={e => handleStepChange(index, 'type', e.target.value)}
                                                        className="bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white shrink-0"
                                                    >
                                                        {taskTypes.map(t => (
                                                            <option key={t} value={t}>{taskTypeLabels[t]}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={step.instructions}
                                                        onChange={e => handleStepChange(index, 'instructions', e.target.value)}
                                                        placeholder="Instrução da etapa..."
                                                        className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white min-w-0"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeStep(index)}
                                                        disabled={steps.length <= 1}
                                                        className="p-2 text-slate-500 hover:text-red-500 disabled:opacity-30 shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addStep}
                                            className="mt-3 flex items-center gap-2 text-sm font-semibold text-sky-400 hover:text-sky-300"
                                        >
                                            <Plus className="w-4 h-4" /> Adicionar Etapa
                                        </button>
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                    >
                                        {isEditMode ? 'Salvar Alterações' : 'Criar Playbook'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default CreateEditPlaybookModal;
