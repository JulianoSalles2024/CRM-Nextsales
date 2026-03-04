
import React, { useMemo, useEffect, useState } from 'react';
import { Lead, ColumnData, Activity, Task, User } from '../types';
import type { Board } from '../types';
import { getLeadComputedStatus } from '@/src/lib/leadStatus';
import { Users, Target, TrendingUp, DollarSign, UserCheck, AlertTriangle, Wallet, Layers, CalendarDays } from 'lucide-react';
import KpiCard from './KpiCard';
import TopSellers from './TopSellers';
import RecentActivities from './RecentActivities';
import FlatCard from './ui/FlatCard';

interface DashboardProps {
    leads: Lead[];
    columns: ColumnData[];
    activities: Activity[];
    tasks: Task[];
    users: User[];
    boards: Board[];
    onNavigate: (view: string) => void;
    onAnalyzePortfolio?: () => void;
    showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    onExportReport?: () => void;
}

const PERIOD_OPTIONS = [
    'Todo o Período', 'Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias',
    'Este Mês', 'Mês Passado', 'Este Trimestre', 'Último Trimestre', 'Este Ano', 'Ano Passado',
];

function getDateRange(period: string): { start: Date | null; end: Date | null } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (period) {
        case 'Hoje':
            return { start: today, end: new Date(today.getTime() + 86_400_000 - 1) };
        case 'Ontem': {
            const y = new Date(today); y.setDate(today.getDate() - 1);
            return { start: y, end: new Date(today.getTime() - 1) };
        }
        case 'Últimos 7 dias': {
            const s = new Date(today); s.setDate(today.getDate() - 6);
            return { start: s, end: now };
        }
        case 'Últimos 30 dias': {
            const s = new Date(today); s.setDate(today.getDate() - 29);
            return { start: s, end: now };
        }
        case 'Este Mês':
            return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
        case 'Mês Passado':
            return {
                start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
            };
        case 'Este Trimestre': {
            const q = Math.floor(now.getMonth() / 3);
            return { start: new Date(now.getFullYear(), q * 3, 1), end: now };
        }
        case 'Último Trimestre': {
            const q = Math.floor(now.getMonth() / 3);
            return {
                start: new Date(now.getFullYear(), (q - 1) * 3, 1),
                end: new Date(now.getFullYear(), q * 3, 0, 23, 59, 59, 999),
            };
        }
        case 'Este Ano':
            return { start: new Date(now.getFullYear(), 0, 1), end: now };
        case 'Ano Passado':
            return {
                start: new Date(now.getFullYear() - 1, 0, 1),
                end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
            };
        default: // 'Todo o Período'
            return { start: null, end: null };
    }
}

const Dashboard: React.FC<DashboardProps> = ({ leads, columns, activities, tasks, users, boards, onNavigate, onAnalyzePortfolio, showNotification, onExportReport }) => {
    const [selectedBoardId, setSelectedBoardId] = useState<'all' | string>('all');
    const [selectedPeriod, setSelectedPeriod] = useState('Este Mês');

    const activeColumns = useMemo(() => {
        if (selectedBoardId === 'all') {
            // Flatten all boards' columns so won/lost detection works across all pipelines
            const seen = new Set<string>();
            return boards.flatMap(b => b.columns).filter(c => !seen.has(c.id) && seen.add(c.id));
        }
        const board = boards.find(b => b.id === selectedBoardId);
        return board ? board.columns : columns;
    }, [selectedBoardId, boards, columns]);

    const activeLeadPool = useMemo(() => {
        const base = selectedBoardId === 'all' ? leads : (() => {
            const ids = new Set(activeColumns.map(c => c.id));
            return leads.filter(l => ids.has(l.columnId));
        })();
        // Defensive: server already filters is_archived=false, but guard client-side too
        return base.filter(l => !l.isArchived);
    }, [leads, activeColumns, selectedBoardId]);

    const periodFilteredLeads = useMemo(() => {
        const { start, end } = getDateRange(selectedPeriod);
        if (!start && !end) return activeLeadPool;
        return activeLeadPool.filter(l => {
            if (!l.createdAt) return true;
            const d = new Date(l.createdAt);
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
        });
    }, [activeLeadPool, selectedPeriod]);

    const kpiData = useMemo(() => {
        const wonColumnIds = activeColumns.filter(c => c.type === 'won').map(c => c.id);
        const lostColumnIds = activeColumns.filter(c => c.type === 'lost').map(c => c.id);

        const totalDeals = periodFilteredLeads.length;
        const totalWon = periodFilteredLeads.filter(l => wonColumnIds.includes(l.columnId)).length;
        const activeLeads = periodFilteredLeads.filter(l => !wonColumnIds.includes(l.columnId) && !lostColumnIds.includes(l.columnId));

        const totalValue = activeLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
        const wonValue = periodFilteredLeads.filter(l => wonColumnIds.includes(l.columnId)).reduce((sum, lead) => sum + Number(lead.value || 0), 0);

        const conversionRate = totalDeals > 0 ? ((totalWon / totalDeals) * 100).toFixed(1) : '0.0';

        return {
            pipelineValue: totalValue,
            activeCount: activeLeads.length,
            conversionRate,
            revenue: wonValue,
        };
    }, [periodFilteredLeads, activeColumns]);

    const walletHealth = useMemo(() => {
        // Status derived from board_stages.linked_lifecycle_stage (via column.type)
        const activeCount = periodFilteredLeads.filter(l => getLeadComputedStatus(l, activeColumns.find(c => c.id === l.columnId)?.type) === 'ativo').length;
        const inactiveCount = periodFilteredLeads.filter(l => getLeadComputedStatus(l, activeColumns.find(c => c.id === l.columnId)?.type) === 'inativo').length;
        const lostCount = periodFilteredLeads.filter(l => getLeadComputedStatus(l, activeColumns.find(c => c.id === l.columnId)?.type) === 'perdido').length;
        const total = activeCount + inactiveCount + lostCount || 1;

        const activePct = Math.round((activeCount / total) * 100);
        const inactivePct = Math.round((inactiveCount / total) * 100);
        const churnPct = Math.round((lostCount / total) * 100);

        const wonLeads = periodFilteredLeads.filter(l => activeColumns.find(c => c.id === l.columnId)?.type === 'won');
        const ltv = wonLeads.length > 0
            ? wonLeads.reduce((acc, curr) => acc + Number(curr.value || 0), 0) / wonLeads.length
            : 0;

        return {
            activeCount, inactiveCount, lostCount,
            activePct, inactivePct, churnPct,
            ltv
        };
    }, [periodFilteredLeads, activeColumns]);

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }); 

    // Risk Detection Logic
    useEffect(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Filter: Active status AND (lastActivity > 30 days ago OR created > 30 days ago if no activity)
        const riskLeads = leads.filter(l => {
            const lastDate = l.lastActivityTimestamp ? new Date(l.lastActivityTimestamp) : new Date(l.createdAt || Date.now());
            return l.status === 'Ativo' && lastDate < thirtyDaysAgo;
        });

        if (riskLeads.length > 0) {
            showNotification(`${riskLeads.length} alertas de risco gerados na lista de atividades!`, 'warning');
        } else {
            showNotification('Nenhum novo risco detectado. Carteira saudável!', 'success');
        }
    }, [leads, showNotification]);

    return (
        <div className="flex flex-col gap-4 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
                    <p className="text-slate-400 mt-1">O pulso do seu negócio em tempo real.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                        <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <select
                            value={selectedBoardId}
                            onChange={e => setSelectedBoardId(e.target.value)}
                            className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
                        >
                            <option value="all">Geral (todos os pipelines)</option>
                            {boards.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                        <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <select
                            value={selectedPeriod}
                            onChange={e => setSelectedPeriod(e.target.value)}
                            className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
                        >
                            {PERIOD_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Pipeline Total"
                    value={currencyFormatter.format(kpiData.pipelineValue)}
                    icon={DollarSign}
                    iconColor="text-blue-500"
                />
                <KpiCard
                    title="Negócios Ativos"
                    value={kpiData.activeCount.toString()}
                    icon={Users}
                    iconColor="text-purple-500"
                />
                <KpiCard
                    title="Conversão"
                    value={`${kpiData.conversionRate}%`}
                    icon={Target}
                    iconColor="text-emerald-500"
                    onClick={() => onNavigate('Relatórios')}
                />
                <KpiCard
                    title="Receita (Ganha)"
                    value={currencyFormatter.format(kpiData.revenue)}
                    icon={TrendingUp}
                    iconColor="text-orange-500"
                    onClick={() => onNavigate('Relatórios')}
                />
            </div>

            {/* Wallet Health Section */}
            <div>
                <div className="flex items-center gap-2 mb-4 pl-1">
                    <UserCheck className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-bold text-white">Saúde da Carteira</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Distribution Card */}
                    <FlatCard className="rounded-xl p-6 flex flex-col justify-center h-full">
                        <div className="mb-4">
                            <p className="text-sm font-medium text-slate-400 mb-2">Distribuição da Carteira</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-white">{walletHealth.activePct}%</span>
                                <span className="text-emerald-500 text-sm font-bold uppercase">Ativos</span>
                            </div>
                        </div>
                        
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex mb-5">
                            <div className="h-full bg-emerald-500" style={{ width: `${walletHealth.activePct}%` }}></div>
                            <div className="h-full bg-amber-500" style={{ width: `${walletHealth.inactivePct}%` }}></div>
                            <div className="h-full bg-red-500" style={{ width: `${walletHealth.churnPct}%` }}></div>
                        </div>
                        
                        <div className="flex justify-between text-xs font-medium text-slate-400">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span>Ativos ({walletHealth.activeCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span>Inativos ({walletHealth.inactiveCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span>Perdidos ({walletHealth.lostCount})</span>
                            </div>
                        </div>
                    </FlatCard>

                    {/* Churn Risk Card */}
                    <FlatCard className="rounded-xl p-6 flex flex-col justify-center h-full relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-slate-400 mb-2">Risco de Churn</p>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl font-bold text-white">0 Clientes</span>
                                <span className="text-red-400 text-[10px] font-bold uppercase bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded tracking-wide">Alertas</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-5 leading-relaxed">Clientes ativos sem compra há {'>'} 30 dias.</p>
                            <button 
                                onClick={onAnalyzePortfolio}
                                className="text-sm text-blue-400 font-medium hover:text-blue-300 self-start transition-colors flex items-center gap-1"
                            >
                                Rodar verificação agora
                            </button>
                        </div>
                        <AlertTriangle className="absolute right-4 top-4 w-12 h-12 text-slate-800/50" />
                    </FlatCard>

                    {/* LTV Card */}
                    <FlatCard className="rounded-xl p-6 flex flex-col justify-center h-full relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-slate-400 mb-8">LTV Médio</p>
                            <div className="flex items-center gap-3 mb-5">
                                <span className="text-3xl font-bold text-white">{currencyFormatter.format(walletHealth.ltv / 1000)}k</span>
                                <span className="text-emerald-400 text-[12px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded tracking-wide">Médio</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">Valor médio vitalício por cliente ativo.</p>
                        </div>
                        <Wallet className="absolute right-4 top-4 w-12 h-12 text-slate-800/50" />
                    </FlatCard>
                </div>
            </div>

            {/* Bottom Section: Top Sellers & Activities */}
            {null}
          {/* Bottom Section removida temporariamente */}
        </div>
    );
};

export default Dashboard;
