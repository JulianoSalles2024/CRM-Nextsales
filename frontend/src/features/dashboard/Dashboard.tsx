
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lead, ColumnData, Activity, Task, User } from '@/types';
import type { Board } from '@/types';
import { Users, Target, TrendingUp, DollarSign, Layers, CalendarDays } from 'lucide-react';
import KpiCard from './KpiCard';
import TopSellers from './TopSellers';
import RecentActivities from './RecentActivities';
import FlatCard from '@/components/ui/FlatCard';

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
    const [chartViewMode, setChartViewMode] = useState<'day' | 'week' | 'month'>('week');

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

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    });

    const trendData = useMemo(() => {
        const now = new Date();
        const buckets: { label: string; startDate: Date; endDate: Date; revenue: number; newLeads: number; churn: number }[] = [];

        if (chartViewMode === 'day') {
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            for (let i = 0; i < 24; i++) {
                const hourStart = new Date(todayStart);
                hourStart.setHours(i);
                const hourEnd = new Date(hourStart);
                hourEnd.setHours(i, 59, 59, 999);
                buckets.push({ label: `${String(i).padStart(2, '0')}:00`, startDate: hourStart, endDate: hourEnd, revenue: 0, newLeads: 0, churn: 0 });
            }
        } else if (chartViewMode === 'week') {
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(now.getDate() - i);
                buckets.push({
                    label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    startDate: new Date(new Date(date).setHours(0, 0, 0, 0)),
                    endDate: new Date(new Date(date).setHours(23, 59, 59, 999)),
                    revenue: 0, newLeads: 0, churn: 0,
                });
            }
        } else {
            for (let i = 3; i >= 0; i--) {
                const weekEnd = new Date();
                weekEnd.setDate(now.getDate() - i * 7);
                const weekStart = new Date(weekEnd);
                weekStart.setDate(weekEnd.getDate() - 6);
                buckets.push({
                    label: `Semana ${4 - i}`,
                    startDate: new Date(new Date(weekStart).setHours(0, 0, 0, 0)),
                    endDate: new Date(new Date(weekEnd).setHours(23, 59, 59, 999)),
                    revenue: 0, newLeads: 0, churn: 0,
                });
            }
        }

        const wonColumnIds = activeColumns.filter(c => c.type === 'won').map(c => c.id);

        activeLeadPool.forEach(lead => {
            const creationDate = lead.createdAt ? new Date(lead.createdAt) : null;
            const wonDate = lead.lastActivityTimestamp && wonColumnIds.includes(lead.columnId) ? new Date(lead.lastActivityTimestamp) : null;
            const churnDate = lead.status === 'ENCERRADO' && lead.lastActivityTimestamp ? new Date(lead.lastActivityTimestamp) : null;

            for (const bucket of buckets) {
                if (creationDate && creationDate >= bucket.startDate && creationDate <= bucket.endDate) bucket.newLeads++;
                if (wonDate && wonDate >= bucket.startDate && wonDate <= bucket.endDate) bucket.revenue += Number(lead.value || 0);
                if (churnDate && churnDate >= bucket.startDate && churnDate <= bucket.endDate) bucket.churn++;
            }
        });

        return {
            labels: buckets.map(b => b.label),
            datasets: [
                { label: 'Receita',      data: buckets.map(b => b.revenue),   color: '#22c55e' },
                { label: 'Novos Leads',  data: buckets.map(b => b.newLeads),  color: '#3b82f6' },
                { label: 'Churn',        data: buckets.map(b => b.churn),     color: '#ef4444' },
            ],
        };
    }, [activeLeadPool, activeColumns, chartViewMode]);

    const TrendChart = ({ data }: { data: typeof trendData }) => {
        const svgRef = useRef<SVGSVGElement>(null);
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

        const svgW = 1000, svgH = 190;
        const pad = { top: 10, right: 42, bottom: 28, left: 52 };
        const cW = svgW - pad.left - pad.right;
        const cH = svgH - pad.top - pad.bottom;

        const maxRev   = Math.max(...data.datasets[0].data, 1);
        const maxCount = Math.max(...data.datasets[1].data, ...data.datasets[2].data, 5);

        const yRev   = (v: number) => cH - (v / maxRev)   * cH;
        const yCount = (v: number) => cH - (v / maxCount) * cH;

        const pts = data.labels.map((_, i) => ({
            x:        i * (cW / (data.labels.length - 1 || 1)),
            revenue:  yRev(data.datasets[0].data[i]),
            newLeads: yCount(data.datasets[1].data[i]),
            churn:    yCount(data.datasets[2].data[i]),
        }));

        const makePath = (ys: { x: number; y: number }[]) =>
            ys.reduce((acc, p, i) => {
                if (i === 0) return `M ${p.x},${p.y}`;
                const [p0, p1, p2, p3] = [ys[i-2], ys[i-1], ys[i], ys[i+1]]
                    .map((q, j) => q || ys[j === 0 ? 0 : ys.length - 1]);
                const cp1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
                const cp2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
                return `${acc} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
            }, '');

        const revPath  = makePath(pts.map(p => ({ x: p.x, y: p.revenue  })));
        const nlPath   = makePath(pts.map(p => ({ x: p.x, y: p.newLeads })));
        const chPath   = makePath(pts.map(p => ({ x: p.x, y: p.churn    })));

        const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
            if (!svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const mx = e.clientX - rect.left - pad.left;
            const idx = Math.round(mx / (cW / (data.labels.length - 1 || 1)));
            if (idx >= 0 && idx < data.labels.length) {
                setHoveredIndex(idx);
                setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
        };

        return (
            <div className="relative flex flex-col w-full">
                <div className="w-full">
                    <svg ref={svgRef} width="100%" viewBox={`0 0 ${svgW} ${svgH}`} onMouseMove={onMove} onMouseLeave={() => { setHoveredIndex(null); setTooltipPos(null); }}>
                        <defs>
                            {data.datasets.map(ds => (
                                <linearGradient key={ds.label} id={`td-grad-${ds.label}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%"   stopColor={ds.color} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={ds.color} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <g transform={`translate(${pad.left},${pad.top})`}>
                            {[...Array(5)].map((_, i) => (
                                <g key={i}>
                                    <line x1={0} y1={i * cH / 4} x2={cW} y2={i * cH / 4} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                                    <text x={-10} y={i * cH / 4 + 5} fill="#64748b" textAnchor="end" fontSize="11">{currencyFormatter.format(maxRev * (1 - i / 4)).replace(/\.00$/, '')}</text>
                                </g>
                            ))}
                            {[...Array(6)].map((_, i) => (
                                <text key={i} x={cW + 10} y={i * cH / 5 + 5} fill="#64748b" textAnchor="start" fontSize="11">{Math.round(maxCount * (1 - i / 5))}</text>
                            ))}
                            {data.labels.map((label, i) => (
                                <text key={label} x={pts[i].x} y={cH + 22} fill="#64748b" textAnchor="middle" fontSize="11">{label}</text>
                            ))}

                            <path d={`${revPath}  L ${pts[pts.length-1].x},${cH} L ${pts[0].x},${cH} Z`} fill={`url(#td-grad-Receita)`} />
                            <path d={`${nlPath}   L ${pts[pts.length-1].x},${cH} L ${pts[0].x},${cH} Z`} fill={`url(#td-grad-Novos Leads)`} />
                            <path d={`${chPath}   L ${pts[pts.length-1].x},${cH} L ${pts[0].x},${cH} Z`} fill={`url(#td-grad-Churn)`} />

                            <path d={revPath} fill="none" stroke="#22c55e" strokeWidth="2.5" />
                            <path d={nlPath}  fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                            <path d={chPath}  fill="none" stroke="#ef4444" strokeWidth="2.5" />

                            <AnimatePresence>
                                {hoveredIndex !== null && (
                                    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <line x1={pts[hoveredIndex].x} y1={0} x2={pts[hoveredIndex].x} y2={cH} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                                        <circle cx={pts[hoveredIndex].x} cy={pts[hoveredIndex].revenue}  r="5" fill="#22c55e" stroke="#0f172a" strokeWidth="2" />
                                        <circle cx={pts[hoveredIndex].x} cy={pts[hoveredIndex].newLeads} r="5" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
                                        <circle cx={pts[hoveredIndex].x} cy={pts[hoveredIndex].churn}    r="5" fill="#ef4444" stroke="#0f172a" strokeWidth="2" />
                                    </motion.g>
                                )}
                            </AnimatePresence>
                        </g>
                    </svg>

                    <AnimatePresence>
                        {hoveredIndex !== null && tooltipPos && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -110%)' }}
                                className="absolute p-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl pointer-events-none z-10"
                            >
                                <p className="font-bold text-white text-center mb-2 text-sm">{data.labels[hoveredIndex]}</p>
                                <div className="space-y-1 text-sm">
                                    {data.datasets.map(ds => (
                                        <div key={ds.label} className="flex justify-between items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ds.color }} />
                                                <span className="text-slate-400">{ds.label}:</span>
                                            </div>
                                            <span className="font-semibold text-white">
                                                {ds.label === 'Receita' ? currencyFormatter.format(ds.data[hoveredIndex]) : ds.data[hoveredIndex]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-center items-center gap-6 pt-3">
                    {data.datasets.map(ds => (
                        <div key={ds.label} className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ds.color }} />
                            <span className="text-slate-300">{ds.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

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

            {/* Trend Chart */}
            <FlatCard className="p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Tendência do Negócio</h2>
                    <div className="flex items-center gap-1 p-1 bg-slate-800 border border-slate-700 rounded-lg">
                        {(['day', 'week', 'month'] as const).map(view => (
                            <button
                                key={view}
                                onClick={() => setChartViewMode(view)}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-200 ${chartViewMode === view ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                {view === 'day' ? 'Dia' : view === 'week' ? 'Semana' : 'Mês'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="w-full">
                    <TrendChart data={trendData} />
                </div>
            </FlatCard>
        </div>
    );
};

export default Dashboard;
