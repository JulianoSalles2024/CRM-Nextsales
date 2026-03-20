import React, { useState } from 'react';
import { Target, Plus, Loader2, TrendingUp, Users, Receipt, BarChart2, UserMinus, X, Zap, Pencil, Trash2 } from 'lucide-react';
import FlatCard from '@/components/ui/FlatCard';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useGoals } from '@/src/hooks/useGoals';
import { useTeamMembers } from '@/src/hooks/useTeamMembers';
import type { Goal, GoalType, GoalFrequency, CreateGoalData } from '@/types';

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
    receita:        'Receita',
    vendas:         'Nº de Vendas',
    ticket_medio:   'Ticket Médio',
    novos_clientes: 'Novos Clientes',
    churn:          'Redução de Churn',
};

const GOAL_TYPE_ICON: Record<GoalType, React.ReactNode> = {
    receita:        <Receipt className="w-4 h-4" />,
    vendas:         <TrendingUp className="w-4 h-4" />,
    ticket_medio:   <BarChart2 className="w-4 h-4" />,
    novos_clientes: <Users className="w-4 h-4" />,
    churn:          <UserMinus className="w-4 h-4" />,
};

const FREQUENCY_LABEL: Record<GoalFrequency, string> = {
    monthly:   'Mensal',
    quarterly: 'Trimestral',
    yearly:    'Anual',
};

const EMPTY_FORM: CreateGoalData = {
    name:        '',
    goalType:    'receita',
    frequency:   'monthly',
    targetValue: 0,
    isActive:    false,
    periodStart: '',
    periodEnd:   '',
};

interface GoalCardProps {
    goal: Goal;
    canManage: boolean;
    isActivating: boolean;
    onActivate: () => void;
    onEdit?: (goal: Goal) => void;
    onDelete?: (goal: Goal) => void;
    sellerName?: string | null;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, canManage, isActivating, onActivate, onEdit, onDelete, sellerName }) => (
    <div className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                {GOAL_TYPE_ICON[goal.goalType]}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{goal.name}</span>
                    {sellerName && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            👤 {sellerName}
                        </span>
                    )}
                    {goal.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 uppercase tracking-wider border border-emerald-500/20">
                            Ativa
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-400 uppercase tracking-wider border border-slate-600">
                            Inativa
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>{GOAL_TYPE_LABEL[goal.goalType]}</span>
                    <span>·</span>
                    <span>{FREQUENCY_LABEL[goal.frequency]}</span>
                    <span>·</span>
                    <span>
                        {goal.goalType === 'receita' || goal.goalType === 'ticket_medio'
                            ? `R$ ${goal.targetValue.toLocaleString('pt-BR')}`
                            : goal.targetValue.toLocaleString('pt-BR')}
                    </span>
                </div>
            </div>
        </div>
        {canManage && (
            <div className="flex items-center gap-2">
                {!goal.isActive && (
                    <button
                        onClick={onActivate}
                        disabled={isActivating}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all disabled:opacity-50"
                    >
                        {isActivating
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Zap className="w-3.5 h-3.5" />
                        }
                        {isActivating ? 'Ativando...' : 'Ativar'}
                    </button>
                )}
                <button
                    onClick={() => onEdit?.(goal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-600/50 rounded-lg hover:bg-slate-700/50 hover:border-slate-500 transition-all"
                >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                </button>
                <button
                    onClick={() => onDelete?.(goal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 hover:border-red-500/50 transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                </button>
            </div>
        )}
    </div>
);

const GoalsTab: React.FC = () => {
    const { companyId, currentPermissions } = useAuth();
    const { goals, loading, activating, createGoal, updateGoal, deleteGoal, activateGoal } = useGoals(companyId);
    const { members } = useTeamMembers(companyId);
    const sellers = members.filter(m => m.role === 'Vendedor');
    const canManage = currentPermissions.canManageTeam;

    const [isModalOpen, setIsModalOpen]       = useState(false);
    const [form, setForm]                     = useState<CreateGoalData>(EMPTY_FORM);
    const [isSaving, setIsSaving]             = useState(false);
    const [formError, setFormError]           = useState<string | null>(null);
    const [activateTarget, setActivateTarget] = useState<Goal | null>(null);
    const [toast, setToast]                   = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [editingGoal, setEditingGoal]       = useState<Goal | null>(null);
    const [isEditMode, setIsEditMode]         = useState(false);
    const [deleteTarget, setDeleteTarget]     = useState<Goal | null>(null);
    const [isDeleting, setIsDeleting]         = useState(false);
    const [scopeTab, setScopeTab]             = useState<'global' | 'seller'>('global');
    const [goalScope, setGoalScope]           = useState<'global' | 'seller'>('global');

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleActivateConfirm = async () => {
        if (!activateTarget) return;
        const error = await activateGoal(activateTarget.id);
        setActivateTarget(null);
        if (error) {
            showToast(`Erro ao ativar meta: ${error}`, 'error');
        } else {
            showToast('Meta ativada com sucesso', 'success');
        }
    };

    const openModal = () => {
        setForm(EMPTY_FORM);
        setFormError(null);
        setEditingGoal(null);
        setIsEditMode(false);
        setGoalScope('global');
        setIsModalOpen(true);
    };

    const openEditModal = (goal: Goal) => {
        setForm({
            name:        goal.name,
            goalType:    goal.goalType,
            frequency:   goal.frequency,
            targetValue: goal.targetValue,
            isActive:    goal.isActive,
            periodStart: goal.startDate,
            periodEnd:   goal.endDate,
        });
        setEditingGoal(goal);
        setIsEditMode(true);
        setFormError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (isSaving) return;
        setIsModalOpen(false);
        setEditingGoal(null);
        setIsEditMode(false);
    };

    const handleSubmit = async () => {
        if (!form.name.trim())                 return setFormError('Informe o nome da meta.');
        if (!form.periodStart)                 return setFormError('Informe a data de início.');
        if (!form.periodEnd)                   return setFormError('Informe a data de fim.');
        if (form.periodEnd < form.periodStart) return setFormError('A data de fim deve ser após a data de início.');
        if (form.targetValue <= 0)             return setFormError('O valor alvo deve ser maior que zero.');
        if (goalScope === 'seller' && !form.userId) return setFormError('Selecione um vendedor.');

        const submitForm = goalScope === 'global' ? { ...form, userId: null } : form;

        setIsSaving(true);
        setFormError(null);
        const error = isEditMode && editingGoal
            ? await updateGoal(editingGoal.id, submitForm)
            : await createGoal(submitForm);
        setIsSaving(false);

        if (error) { setFormError(error); return; }

        setEditingGoal(null);
        setIsEditMode(false);
        setIsModalOpen(false);
    };

    const globalGoals = goals.filter(goal => !goal.userId);
    const sellerGoals = goals.filter(goal => !!goal.userId);
    const sellerMap = Object.fromEntries(members.map(m => [m.id, m.name]));

    return (
        <div className="space-y-6">

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className={`fixed bottom-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-lg border ${
                            toast.type === 'success'
                                ? 'bg-blue-950 border-blue-700 text-blue-300'
                                : 'bg-red-950 border-red-700 text-red-300'
                        }`}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Metas</h2>
                    <p className="text-slate-400 mt-1 text-sm">
                        Defina e gerencie as metas da sua empresa.
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={openModal}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Meta
                    </button>
                )}
            </div>

            {/* Scope Sub-tabs */}
            <div className="flex gap-1">
                {(['global', 'seller'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setScopeTab(tab)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all border ${
                            scopeTab === tab
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                    >
                        {tab === 'global' ? 'Globais' : 'Por Vendedor'}
                    </button>
                ))}
            </div>

            {/* Content */}
            {scopeTab === 'seller' && (
                <FlatCard className="overflow-hidden">
                    {loading && (
                        <div className="p-6 flex justify-center">
                            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                        </div>
                    )}
                    {!loading && sellerGoals.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                       <Target className="w-7 h-7 text-slate-500" />
                         </div>

                    <h3 className="text-white font-semibold text-base mb-1">
                 Nenhuma meta individual criada
                    </h3>

                <p className="text-slate-500 text-sm max-w-xs">
                Crie uma meta para um vendedor específico e acompanhe sua performance individual.
            </p>

            {canManage && (
             <button
            onClick={openModal}
            className="mt-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
         >
            <Plus className="w-4 h-4" />
            Nova Meta
        </button>
    )}
</div>
                    )}
                    {!loading && sellerGoals.length > 0 && (
                        <div className="divide-y divide-slate-800">
                            {sellerGoals.map(goal => (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    canManage={canManage}
                                    isActivating={activating === goal.id}
                                    onActivate={() => setActivateTarget(goal)}
                                    onEdit={openEditModal}
                                    onDelete={goal => setDeleteTarget(goal)}
                                    sellerName={goal.userId ? sellerMap[goal.userId] : null}
                                />
                            ))}
                        </div>
                    )}
                </FlatCard>
            )}

            {scopeTab === 'global' && (
            <FlatCard className="overflow-hidden">

                {/* Loading */}
                {loading && (
                    <div className="p-6 flex justify-center">
                        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && globalGoals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                            <Target className="w-7 h-7 text-slate-500" />
                        </div>
                        <h3 className="text-white font-semibold text-base mb-1">
                            Nenhuma meta cadastrada
                        </h3>
                        <p className="text-slate-500 text-sm max-w-xs">
                            Crie a primeira meta da empresa para começar a acompanhar os resultados.
                        </p>
                        {canManage && (
                            <button
                                onClick={openModal}
                                className="mt-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Nova Meta
                            </button>
                        )}
                    </div>
                )}

                {/* Goals List */}
                {!loading && globalGoals.length > 0 && (
                    <div className="divide-y divide-slate-800">
                        {globalGoals.map(goal => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                canManage={canManage}
                                isActivating={activating === goal.id}
                                onActivate={() => setActivateTarget(goal)}
                                onEdit={openEditModal}
                                onDelete={goal => setDeleteTarget(goal)}
                                sellerName={goal.userId ? sellerMap[goal.userId] : null}
                            />
                        ))}
                    </div>
                )}

            </FlatCard>
            )}

            {/* Modal Confirmação Ativar */}
            <AnimatePresence>
                {activateTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Zap className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Ativar meta?</h3>
                                <p className="text-sm text-slate-400 text-center mt-2">
                                    A meta atual será desativada e{' '}
                                    <span className="text-white font-medium">{activateTarget.name}</span>{' '}
                                    passará a ser a meta ativa da empresa.
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setActivateTarget(null)}
                                    disabled={activating === activateTarget.id}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleActivateConfirm}
                                    disabled={activating === activateTarget.id}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {activating === activateTarget.id
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Ativando...</>
                                        : <><Zap className="w-4 h-4" /> Confirmar</>
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Nova Meta */}
            <AnimatePresence>
                {isModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0B1220] border border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">{isEditMode ? 'Editar Meta' : 'Nova Meta'}</h3>
                                        <p className="text-xs text-slate-400">{isEditMode ? 'Atualize os dados da meta' : 'Defina uma meta global para a empresa'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeModal}
                                    disabled={isSaving}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">

                                {/* Nome */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Ex: Meta de Receita Q1"
                                        disabled={isSaving}
                                        className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors disabled:opacity-50"
                                    />
                                </div>

                                {/* Escopo */}
                                {!isEditMode && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Escopo</label>
                                        <div className="flex gap-1 bg-[#0B1220] border border-white/10 rounded-lg p-1 w-fit">
                                            {(['global', 'seller'] as const).map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => {
                                                        setGoalScope(s);
                                                        setForm(f => ({ ...f, userId: null }));
                                                    }}
                                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                                                        goalScope === s
                                                            ? 'bg-sky-500/20 text-sky-400'
                                                            : 'text-slate-400 hover:bg-white/5'
                                                    }`}
                                                >
                                                    {s === 'global' ? 'Global' : 'Por Vendedor'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Dropdown Vendedor */}
                                {!isEditMode && goalScope === 'seller' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Vendedor</label>
                                        <select
                                            value={form.userId ?? ''}
                                            onChange={e => setForm(f => ({ ...f, userId: e.target.value || null }))}
                                            disabled={isSaving}
                                            className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors disabled:opacity-50"
                                        >
                                            <option value="">Selecione um vendedor</option>
                                            {sellers.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Tipo + Frequência */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo</label>
                                        <select
                                            value={form.goalType}
                                            onChange={e => setForm(f => ({ ...f, goalType: e.target.value as GoalType }))}
                                            disabled={isSaving}
                                            className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors disabled:opacity-50"
                                        >
                                            {(Object.keys(GOAL_TYPE_LABEL) as GoalType[]).map(key => (
                                                <option key={key} value={key}>{GOAL_TYPE_LABEL[key]}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Frequência</label>
                                        <select
                                            value={form.frequency}
                                            onChange={e => setForm(f => ({ ...f, frequency: e.target.value as GoalFrequency }))}
                                            disabled={isSaving}
                                            className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors disabled:opacity-50"
                                        >
                                            {(Object.keys(FREQUENCY_LABEL) as GoalFrequency[]).map(key => (
                                                <option key={key} value={key}>{FREQUENCY_LABEL[key]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Período */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Data início</label>
                                        <input
                                            type="date"
                                            value={form.periodStart}
                                            onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))}
                                            disabled={isSaving}
                                            className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors disabled:opacity-50 [color-scheme:dark]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Data fim</label>
                                        <input
                                            type="date"
                                            value={form.periodEnd}
                                            onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))}
                                            disabled={isSaving}
                                            className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors disabled:opacity-50 [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                {/* Valor Alvo */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Valor alvo</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={form.targetValue === 0 ? '' : form.targetValue}
                                        onChange={e => setForm(f => ({ ...f, targetValue: Number(e.target.value) }))}
                                        placeholder={form.goalType === 'receita' || form.goalType === 'ticket_medio' ? 'Ex: 50000' : 'Ex: 30'}
                                        disabled={isSaving}
                                        className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors disabled:opacity-50"
                                    />
                                </div>

                                {/* Definir como ativa */}
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                                        disabled={isSaving}
                                        className="w-4 h-4 rounded border-white/10 bg-[#0B1220] text-blue-500 focus:ring-sky-500 focus:ring-offset-slate-900 disabled:opacity-50"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                            Definir como meta ativa
                                        </span>
                                        <p className="text-xs text-slate-500">Desativa automaticamente qualquer outra meta ativa</p>
                                    </div>
                                </label>

                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6 flex flex-col gap-3">
                                {formError && (
                                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                        {formError}
                                    </p>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={closeModal}
                                        disabled={isSaving}
                                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSaving}
                                        className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSaving
                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> {isEditMode ? 'Atualizando...' : 'Salvando...'}</>
                                            : isEditMode ? 'Atualizar Meta' : 'Salvar Meta'
                                        }
                                    </button>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Confirmação Excluir */}
            <AnimatePresence>
                {deleteTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-6 h-6 text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Excluir meta?</h3>
                                <p className="text-sm text-slate-400 text-center mt-2">
                                    A meta{' '}
                                    <span className="text-white font-medium">{deleteTarget.name}</span>{' '}
                                    será removida permanentemente. Esta ação não pode ser desfeita.
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        setIsDeleting(true);
                                        const error = await deleteGoal(deleteTarget.id);
                                        setIsDeleting(false);
                                        setDeleteTarget(null);
                                        if (error) {
                                            showToast(`Erro ao excluir meta: ${error}`, 'error');
                                        } else {
                                            showToast('Meta excluída com sucesso', 'success');
                                        }
                                    }}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</>
                                        : <><Trash2 className="w-4 h-4" /> Confirmar Exclusão</>
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default GoalsTab;
