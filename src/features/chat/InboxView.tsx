import React, { useMemo, useState, useEffect } from 'react';
import { Task, Notification, Lead, Id } from '@/types';
import {
    CheckCircle2,
    Bell,
    Clock,
    Calendar,
    ArrowRight,
    UserPlus,
    AlertCircle,
    List,
    ScanLine,
    Circle,
    Play,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Target,
    Zap,
    AlertTriangle,
    TrendingUp,
    UserMinus,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FlatCard from '@/components/ui/FlatCard';
import { useOpportunityScores } from '@/src/hooks/useOpportunityScores';
import PredictiveOpportunitiesModal from '@/src/components/opportunities/PredictiveOpportunitiesModal';

interface InboxViewProps {
    tasks: Task[];
    notifications: Notification[];
    leads: Lead[];
    onNavigate: (view: string, itemId?: Id) => void;
    onMarkNotificationRead: (id: Id) => void;
    onOpenLead?: (lead: Lead) => void;
    mode?: 'standard' | 'analysis';
}

const InboxView: React.FC<InboxViewProps> = ({ tasks, notifications, leads, onNavigate, onMarkNotificationRead, onOpenLead, mode = 'standard' }) => {
    const [viewMode, setViewMode] = useState<'overview' | 'list' | 'focus'>('overview');
    const [showOpportunities, setShowOpportunities] = useState(false);

    const today = new Date();
    today.setHours(0,0,0,0);

    const { todayTasks, overdueTasks } = useMemo(() => {
        const pending = tasks.filter(t => t.status === 'pending');
        const overdue: Task[] = [];
        const todayList: Task[] = [];

        pending.forEach(task => {
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0,0,0,0);

            if (dueDate < today) {
                overdue.push(task);
            } else if (dueDate.getTime() === today.getTime()) {
                todayList.push(task);
            }
        });

        return { todayTasks: todayList, overdueTasks: overdue };
    }, [tasks]);

    const churnRiskLeads = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return leads.filter(l => {
            const lastDate = l.lastActivityTimestamp ? new Date(l.lastActivityTimestamp) : new Date(l.createdAt || Date.now());
            return l.status === 'Ativo' && lastDate < thirtyDaysAgo;
        }).slice(0, 2);
    }, [leads]);

    const { opportunities } = useOpportunityScores();
    const bandCounts = useMemo(() => ({
        hot:    opportunities.filter(o => o.priority_band === 'hot').length,
        upsell: opportunities.filter(o => o.priority_band === 'upsell').length,
        warm:   opportunities.filter(o => o.priority_band === 'warm').length,
        risk:   opportunities.filter(o => o.priority_band === 'risk').length,
    }), [opportunities]);

    const stats = [
        { label: 'ATRASADOS', value: overdueTasks.length, subtext: overdueTasks.length === 0 ? 'Tudo em dia' : `${overdueTasks.length} pendentes`, color: overdueTasks.length > 0 ? 'text-red-400' : 'text-emerald-500', bgColor: overdueTasks.length > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10', onClick: () => onNavigate('Tarefas') },
        { label: 'HOJE', value: todayTasks.length, subtext: todayTasks.length === 0 ? 'Sem tarefas para hoje' : `${todayTasks.length} tarefas`, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', onClick: () => onNavigate('Tarefas') },
        { label: 'SUGESTÕES CRÍTICAS', value: 0, subtext: 'Sem urgências', color: 'text-slate-500', bgColor: 'bg-slate-800/50', onClick: undefined },
        { label: 'PENDÊNCIAS', value: tasks.filter(t => t.status === 'pending').length, subtext: tasks.filter(t => t.status === 'pending').length === 0 ? 'Nenhuma pendência' : `${tasks.filter(t => t.status === 'pending').length} tarefas`, color: tasks.filter(t => t.status === 'pending').length > 0 ? 'text-slate-200' : 'text-slate-500', bgColor: 'bg-slate-800/50', onClick: () => onNavigate('Tarefas') },
    ];

    // Priority task for focus mode: first overdue, then first today
    const priorityTask = overdueTasks[0] ?? todayTasks[0] ?? null;
    const allPendingTasks = [...overdueTasks, ...todayTasks];

    // Lead associated with the priority task (for "Ver detalhes")
    const priorityLead = useMemo(() => {
        if (!priorityTask?.leadId) return null;
        return leads.find(l => l.id === priorityTask.leadId) ?? null;
    }, [priorityTask, leads]);

    // Space key shortcut: open lead detail when in focus mode
    useEffect(() => {
        if (viewMode !== 'focus') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
                e.preventDefault();
                if (priorityLead) onOpenLead?.(priorityLead);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, priorityLead, onOpenLead]);

    return (
        <>
        <div className="flex flex-col gap-8 h-full max-w-7xl mx-auto w-full p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">Inbox</h1>
                    <p className="text-slate-400 mt-1 text-lg">Sua mesa de trabalho.</p>
                    <button className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg text-sm border border-slate-700/50 transition-colors">
                        <Zap className="w-4 h-4" />
                        Seed Inbox
                    </button>
                </div>

                <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 shadow-xl">
                    <button
                        onClick={() => setViewMode('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'overview' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Visão Geral
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <List className="w-4 h-4" />
                        Lista
                    </button>
                    <button
                        onClick={() => setViewMode('focus')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'focus' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Target className="w-4 h-4" />
                        Foco
                    </button>
                </div>
            </div>

            {/* ── OVERVIEW ───────────────────────────────────────── */}
            {viewMode === 'overview' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Visão Geral</h2>
                            <p className="text-slate-500 text-sm">Diagnóstico rápido do dia (sem virar outra lista de atividades).</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setViewMode('list')}
                                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm font-medium border border-slate-800 rounded-lg"
                            >
                                Ver lista <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('focus')}
                                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-sky-500/20"
                            >
                                <Circle className="w-4 h-4 fill-white" />
                                Começar foco
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((stat, i) => (
                            <div
                                key={i}
                                onClick={stat.onClick}
                                className={`p-6 rounded-xl border backdrop-blur-sm flex flex-col justify-between h-32 ${stat.onClick ? 'cursor-pointer transition-all' : ''} ${(i === 0 || i === 1) ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.08)] hover:border-emerald-500/40 hover:brightness-110' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-bold text-slate-500 tracking-widest">{stat.label}</span>
                                    <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">{stat.subtext}</span>
                                    {stat.onClick && <ArrowRight className="w-4 h-4 text-slate-600" />}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Lists Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Risco Section */}
                        <FlatCard className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <h3 className="font-bold text-white">Risco (resgate e deals parados)</h3>
                                </div>
                                <button className="text-sky-400 hover:text-sky-300 text-sm font-medium">Ver tudo</button>
                            </div>
                            <div className="space-y-4">
                                {churnRiskLeads.map(lead => (
                                    <div key={lead.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-red-500/10 rounded-lg">
                                                <UserMinus className="w-5 h-5 text-red-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">Risco de Churn</p>
                                                <p className="text-xs text-slate-500">{lead.name} não interage há 40 dias</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold transition-colors">
                                                Aplicar
                                            </button>
                                            <button
                                                onClick={() => onOpenLead?.(lead)}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Abrir
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {churnRiskLeads.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-4">Nenhum lead em risco</p>
                                )}
                            </div>
                        </FlatCard>

                        {/* Oportunidades Inteligentes */}
                        <FlatCard
                            className="p-6 cursor-pointer hover:border-blue-900/40 transition-colors"
                            onClick={() => setShowOpportunities(true)}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-blue-400" />
                                    <h3 className="font-bold text-white">Oportunidades Inteligentes</h3>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowOpportunities(true); }}
                                    className="text-sky-400 hover:text-sky-300 text-sm font-medium"
                                >
                                    Ver tudo
                                </button>
                            </div>
                            {opportunities.length > 0 ? (
                                <div className="flex items-center gap-5 flex-wrap">
                                    {bandCounts.hot > 0 && (
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-xl">🔥</span>
                                            <span className="text-lg font-bold text-orange-400">{bandCounts.hot}</span>
                                            <span className="text-xs text-slate-500">Hot</span>
                                        </span>
                                    )}
                                    {bandCounts.upsell > 0 && (
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-xl">📈</span>
                                            <span className="text-lg font-bold text-emerald-400">{bandCounts.upsell}</span>
                                            <span className="text-xs text-slate-500">Upsell</span>
                                        </span>
                                    )}
                                    {bandCounts.warm > 0 && (
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-xl">🙂</span>
                                            <span className="text-lg font-bold text-blue-400">{bandCounts.warm}</span>
                                            <span className="text-xs text-slate-500">Warm</span>
                                        </span>
                                    )}
                                    {bandCounts.risk > 0 && (
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-xl">⚠️</span>
                                            <span className="text-lg font-bold text-red-400">{bandCounts.risk}</span>
                                            <span className="text-xs text-slate-500">Risco</span>
                                        </span>
                                    )}
                                    <p className="w-full text-xs text-slate-600 mt-1">
                                        {opportunities.length} lead{opportunities.length !== 1 ? 's' : ''} classificado{opportunities.length !== 1 ? 's' : ''} · clique para ver tudo
                                    </p>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm text-center py-4">Nenhuma oportunidade identificada</p>
                            )}
                        </FlatCard>
                    </div>
                </div>
            )}

            {/* ── LIST ───────────────────────────────────────────── */}
            {viewMode === 'list' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Tarefas Pendentes</h2>
                            <p className="text-slate-500 text-sm">{allPendingTasks.length} tarefas para resolver</p>
                        </div>
                        <button
                            onClick={() => onNavigate('Tarefas')}
                            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm font-medium border border-slate-800 hover:border-slate-600 rounded-lg"
                        >
                            Ver todas as tarefas <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>

                    {overdueTasks.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5" /> Atrasadas ({overdueTasks.length})
                            </h3>
                            <div className="space-y-2">
                                {overdueTasks.map(task => (
                                    <TaskRow key={task.id} task={task} badge="atrasada" />
                                ))}
                            </div>
                        </div>
                    )}

                    {todayTasks.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> Para hoje ({todayTasks.length})
                            </h3>
                            <div className="space-y-2">
                                {todayTasks.map(task => (
                                    <TaskRow key={task.id} task={task} badge="hoje" />
                                ))}
                            </div>
                        </div>
                    )}

                    {allPendingTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500/40" />
                            <p className="text-lg font-medium">Tudo em dia!</p>
                            <p className="text-sm">Nenhuma tarefa pendente para hoje.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── FOCUS ──────────────────────────────────────────── */}
            {viewMode === 'focus' && (
                <div className="flex flex-col items-center justify-center py-12 gap-8">
                    <div className="text-center">
                        <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">Modo Foco</p>
                        <h2 className="text-2xl font-bold text-white">Tarefa prioritária</h2>
                        <p className="text-slate-500 text-sm mt-1">Concentre-se em uma coisa de cada vez.</p>
                    </div>

                    {priorityTask ? (
                        <div className="w-full max-w-xl bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm space-y-6">
                            <div className="flex items-start gap-4">
                                <div className={`mt-1 p-2 rounded-lg ${overdueTasks.includes(priorityTask) ? 'bg-red-500/10' : 'bg-sky-500/10'}`}>
                                    {overdueTasks.includes(priorityTask)
                                        ? <AlertCircle className="w-5 h-5 text-red-400" />
                                        : <Calendar className="w-5 h-5 text-sky-400" />
                                    }
                                </div>
                                <div className="flex-1">
                                    <span className={`text-xs font-bold uppercase tracking-widest ${overdueTasks.includes(priorityTask) ? 'text-red-400' : 'text-sky-400'}`}>
                                        {overdueTasks.includes(priorityTask) ? 'Atrasada' : 'Para hoje'}
                                    </span>
                                    <p className="text-xl font-semibold text-white mt-1">{priorityTask.title}</p>
                                    {priorityTask.description && (
                                        <p className="text-sm text-slate-400 mt-2">{priorityTask.description}</p>
                                    )}
                                    <p className="text-xs text-slate-500 mt-3">
                                        Vence em: {new Date(priorityTask.dueDate).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2 border-t border-slate-700/40">
                                <button
                                    onClick={() => onNavigate('Tarefas')}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-lg shadow-sky-500/20 active:scale-[0.98]"
                                >
                                    <Play className="w-4 h-4 fill-white" />
                                    Abrir na aba Tarefas
                                </button>
                                {priorityLead && (
                                    <div className="relative group flex items-center gap-2">
                                        <button
                                            onClick={() => onOpenLead?.(priorityLead)}
                                            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold border border-yellow-400/30 text-yellow-300 bg-yellow-400/5 hover:bg-yellow-400/10 hover:border-yellow-400/50 transition-all duration-200 hover:shadow-[0_0_12px_rgba(255,196,0,0.35)] active:scale-[0.98]"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Ver detalhes
                                        </button>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] px-2 py-1 rounded border border-yellow-400/40 bg-yellow-400/10 text-yellow-300 font-bold tracking-wider pointer-events-none whitespace-nowrap">
                                            SPACE
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                            <CheckCircle2 className="w-16 h-16 text-emerald-500/40" />
                            <p className="text-lg font-medium text-white">Nenhuma tarefa urgente</p>
                            <p className="text-sm">Você está em dia com suas tarefas.</p>
                            <button
                                onClick={() => setViewMode('overview')}
                                className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
                            >
                                Voltar à Visão Geral
                            </button>
                        </div>
                    )}

                    <div className="text-center">
                        <p className="text-xs text-slate-600">
                            {allPendingTasks.length > 1 ? `+${allPendingTasks.length - 1} outras tarefas pendentes` : ''}
                        </p>
                    </div>
                </div>
            )}
        </div>

        <PredictiveOpportunitiesModal
            isOpen={showOpportunities}
            onClose={() => setShowOpportunities(false)}
            onSelectLead={(leadId) => {
                const lead = leads.find(l => String(l.id) === leadId);
                if (lead) onOpenLead?.(lead);
                setShowOpportunities(false);
            }}
        />
        </>
    );
};

// ── Sub-component ──────────────────────────────────────────
const TaskRow: React.FC<{ task: Task; badge: 'atrasada' | 'hoje' }> = ({ task, badge }) => (
    <div className="flex items-center gap-4 p-4 bg-slate-900/40 border border-slate-800/50 rounded-xl hover:border-slate-700 transition-all">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${badge === 'atrasada' ? 'bg-red-400' : 'bg-sky-400'}`} />
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{task.title}</p>
            {task.description && <p className="text-xs text-slate-500 truncate mt-0.5">{task.description}</p>}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
            badge === 'atrasada' ? 'bg-red-500/10 text-red-400' : 'bg-sky-500/10 text-sky-400'
        }`}>
            {badge === 'atrasada' ? 'Atrasada' : 'Hoje'}
        </span>
    </div>
);

export default InboxView;
