import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Task, Lead, Id, User } from '@/types';
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
    ExternalLink,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FlatCard from '@/components/ui/FlatCard';
import { useOpportunityScores } from '@/src/hooks/useOpportunityScores';
import PredictiveOpportunitiesModal from '@/src/components/opportunities/PredictiveOpportunitiesModal';
import { useAuth } from '@/src/features/auth/AuthContext';
import AdminSalesRadar from '@/src/features/inbox/AdminSalesRadar';

interface InboxViewProps {
    tasks: Task[];
    leads: Lead[];
    users?: User[];
    onNavigate: (view: string, itemId?: Id) => void;
    onOpenLead?: (lead: Lead) => void;
    onUpdateTaskStatus?: (taskId: Id, status: 'pending' | 'completed') => void;
    mode?: 'standard' | 'analysis';
    currentUserRole?: 'admin' | 'seller';
    userId?: string;
}

const InboxView: React.FC<InboxViewProps> = ({ tasks, leads, users = [], onNavigate, onOpenLead, onUpdateTaskStatus, mode = 'standard', currentUserRole = 'seller', userId }) => {
    const isAdmin = currentUserRole === 'admin';
    const { session } = useAuth();
    const [viewMode, setViewMode] = useState<'overview' | 'list' | 'focus'>('overview');
    const [showOpportunities, setShowOpportunities] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

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
            if (l.wonAt) return false;
            if (l.status === 'GANHO' || l.status === 'PERDIDO') return false;
            if (l.isArchived) return false;
            if (l.columnId === 'closed') return false;
            const lastDate = l.lastActivityTimestamp
                ? new Date(l.lastActivityTimestamp)
                : new Date(l.createdAt || Date.now());
            return lastDate < thirtyDaysAgo;
        }).slice(0, 2);
    }, [leads]);

    const { opportunities, refresh: refreshOpportunities } = useOpportunityScores();
    const scopedOpportunities = useMemo(
        () => isAdmin ? opportunities : opportunities.filter(o => o.owner_id === userId),
        [opportunities, isAdmin, userId]
    );
    const bandCounts = useMemo(() => ({
        hot:    scopedOpportunities.filter(o => o.priority_band === 'hot').length,
        upsell: scopedOpportunities.filter(o => o.priority_band === 'upsell').length,
        warm:   scopedOpportunities.filter(o => o.priority_band === 'warm').length,
        risk:   scopedOpportunities.filter(o => o.priority_band === 'risk').length,
    }), [scopedOpportunities]);

    const lastAnalyzedAt = useMemo(() => {
        const raw = opportunities[0]?.last_analyzed_at;
        if (!raw) return null;
        return new Date(raw).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }, [opportunities]);

    const handleAnalyzeNow = useCallback(async () => {
        if (!session?.access_token || isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            await fetch('/api/opportunities/analyze', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            refreshOpportunities();
        } catch {
            // silently ignore — sem UI de erro para não bloquear o fluxo
        } finally {
            setIsAnalyzing(false);
        }
    }, [session?.access_token, isAnalyzing, refreshOpportunities]);

    const sellersWithOverdue = useMemo(
        () => new Set(overdueTasks.map(t => t.userId)).size,
        [overdueTasks]
    );

    const hotOpportunities = bandCounts.hot + bandCounts.upsell;

    const stats = isAdmin
        ? [
            { label: 'ATRASADAS (EMPRESA)', value: overdueTasks.length, subtext: overdueTasks.length === 0 ? 'Nenhuma atrasada' : `${overdueTasks.length} tarefas`, color: overdueTasks.length > 0 ? 'text-red-400' : 'text-emerald-500', bgColor: overdueTasks.length > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10', onClick: () => onNavigate('Tarefas') },
            { label: 'VENDEDORES COM ATRASO', value: sellersWithOverdue, subtext: sellersWithOverdue === 0 ? 'Equipe em dia' : `${sellersWithOverdue} vendedor${sellersWithOverdue > 1 ? 'es' : ''} com pendências`, color: sellersWithOverdue > 0 ? 'text-amber-400' : 'text-emerald-500', bgColor: sellersWithOverdue > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10', onClick: undefined },
            { label: 'OPORTUNIDADES QUENTES', value: hotOpportunities, subtext: hotOpportunities === 0 ? 'Nenhuma no momento' : `${hotOpportunities} lead${hotOpportunities > 1 ? 's' : ''} priorizados`, color: hotOpportunities > 0 ? 'text-blue-400' : 'text-slate-500', bgColor: hotOpportunities > 0 ? 'bg-blue-500/10' : 'bg-slate-800/50', onClick: () => setShowOpportunities(true) },
            { label: 'LEADS EM RISCO', value: churnRiskLeads.length, subtext: churnRiskLeads.length === 0 ? 'Nenhum lead em risco' : `${churnRiskLeads.length} sem atividade recente`, color: churnRiskLeads.length > 0 ? 'text-amber-400' : 'text-slate-500', bgColor: churnRiskLeads.length > 0 ? 'bg-amber-500/10' : 'bg-slate-800/50', onClick: undefined },
        ]
        : [
            { label: 'ATRASADOS', value: overdueTasks.length, subtext: overdueTasks.length === 0 ? 'Tudo em dia' : `${overdueTasks.length} pendentes`, color: overdueTasks.length > 0 ? 'text-red-400' : 'text-emerald-500', bgColor: overdueTasks.length > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10', onClick: () => onNavigate('Tarefas') },
            { label: 'HOJE', value: todayTasks.length, subtext: todayTasks.length === 0 ? 'Sem tarefas para hoje' : `${todayTasks.length} tarefas`, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', onClick: () => onNavigate('Tarefas') },
            { label: 'OPORTUNIDADES QUENTES', value: hotOpportunities, subtext: hotOpportunities === 0 ? 'Nenhuma no momento' : `${hotOpportunities} lead${hotOpportunities > 1 ? 's' : ''} priorizados`, color: hotOpportunities > 0 ? 'text-blue-400' : 'text-slate-500', bgColor: hotOpportunities > 0 ? 'bg-blue-500/10' : 'bg-slate-800/50', onClick: () => setShowOpportunities(true) },
            { label: 'EM RISCO', value: churnRiskLeads.length, subtext: churnRiskLeads.length === 0 ? 'Nenhum lead em risco' : `${churnRiskLeads.length} leads sem atividade`, color: churnRiskLeads.length > 0 ? 'text-amber-400' : 'text-slate-500', bgColor: churnRiskLeads.length > 0 ? 'bg-amber-500/10' : 'bg-slate-800/50', onClick: undefined },
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
                    {isAdmin && (
                        <div className="flex items-center gap-3 mt-3">
                            <button
                                onClick={handleAnalyzeNow}
                                disabled={isAnalyzing}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-all"
                            >
                                {isAnalyzing
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <RefreshCw className="w-3.5 h-3.5" />
                                }
                                {isAnalyzing ? 'Analisando...' : 'Analisar agora'}
                            </button>
                            {lastAnalyzedAt && (
                                <span className="text-xs text-slate-500">
                                    Última análise: {lastAnalyzedAt}
                                </span>
                            )}
                        </div>
                    )}
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

                    {/* Radar Comercial — admin only */}
                    {isAdmin && (
                        <AdminSalesRadar
                            users={users}
                            tasks={tasks}
                            leads={leads}
                            overdueTasks={overdueTasks}
                            scopedOpportunities={scopedOpportunities}
                            churnRiskLeads={churnRiskLeads}
                        />
                    )}

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
                                    <TaskRow key={task.id} task={task} badge="atrasada" onComplete={onUpdateTaskStatus ? (id) => onUpdateTaskStatus(id, 'completed') : undefined} />
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
                                    <TaskRow key={task.id} task={task} badge="hoje" onComplete={onUpdateTaskStatus ? (id) => onUpdateTaskStatus(id, 'completed') : undefined} />
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
            opportunities={scopedOpportunities}
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
const TaskRow: React.FC<{ task: Task; badge: 'atrasada' | 'hoje'; onComplete?: (taskId: string) => void }> = ({ task, badge, onComplete }) => {
    const [completed, setCompleted] = React.useState(false);

    const handleComplete = () => {
        if (completed) return;
        setCompleted(true);
        onComplete?.(String(task.id));
    };

    return (
        <div className="flex items-center gap-4 p-4 bg-slate-900/40 border border-slate-800/50 rounded-xl hover:border-slate-700 transition-all">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${badge === 'atrasada' ? 'bg-red-400' : 'bg-sky-400'}`} />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${completed ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</p>
                {task.description && <p className="text-xs text-slate-500 truncate mt-0.5">{task.description}</p>}
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                badge === 'atrasada' ? 'bg-red-500/10 text-red-400' : 'bg-sky-500/10 text-sky-400'
            }`}>
                {badge === 'atrasada' ? 'Atrasada' : 'Hoje'}
            </span>
            {task.status !== 'completed' && (
                <button
                    onClick={handleComplete}
                    disabled={completed}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                    <Check className="w-3 h-3" />
                    Concluir
                </button>
            )}
        </div>
    );
};

export default InboxView;
