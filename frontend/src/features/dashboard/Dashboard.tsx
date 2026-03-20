
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
    selectedBoardId: 'all' | string;
    selectedPeriod: string;
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

const Dashboard: React.FC<DashboardProps> = ({ leads, columns, activities, tasks, users, boards, onNavigate, onAnalyzePortfolio, showNotification, onExportReport, selectedBoardId, selectedPeriod }) => {
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

        const dataKey = data.labels.join(',');
        const svgW = 1000, svgH = 197;
        const pad = { top: 16, right: 48, bottom: 32, left: 72 };
        const cW = svgW - pad.left - pad.right;
        const cH = svgH - pad.top - pad.bottom;

        const maxRev   = Math.max(...data.datasets[0].data, 1);
        const maxCount = Math.max(...data.datasets[1].data, ...data.datasets[2].data, 5);
        const isEmpty  = data.datasets.every(ds => ds.data.every(v => v === 0));

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
                const cp1 = { x: p1.x + (p2.x - p0.x) / 4, y: p1.y + (p2.y - p0.y) / 4 };
                const cp2 = { x: p2.x - (p3.x - p1.x) / 4, y: p2.y - (p3.y - p1.y) / 4 };
                return `${acc} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
            }, '');

        const revPath = makePath(pts.map(p => ({ x: p.x, y: p.revenue  })));
        const nlPath  = makePath(pts.map(p => ({ x: p.x, y: p.newLeads })));
        const chPath  = makePath(pts.map(p => ({ x: p.x, y: p.churn    })));

        const brlCompact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
        const brlFull    = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

        const totals = data.datasets.map(ds => ds.data.reduce((a, b) => a + b, 0));

        const SERIES = [
            { key: 'revenue',  color: '#22c55e', label: 'Receita',     gradId: 'td-rev', value: (i: number) => brlFull.format(data.datasets[0].data[i]) },
            { key: 'newLeads', color: '#3b82f6', label: 'Novos Leads', gradId: 'td-nl',  value: (i: number) => String(data.datasets[1].data[i]) },
            { key: 'churn',    color: '#f43f5e', label: 'Churn',       gradId: 'td-ch',  value: (i: number) => String(data.datasets[2].data[i]) },
        ] as const;

        const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
            if (!svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const scaleX = svgW / rect.width;
            const mx = (e.clientX - rect.left) * scaleX - pad.left;
            const idx = Math.round(mx / (cW / (data.labels.length - 1 || 1)));
            if (idx >= 0 && idx < data.labels.length) {
                setHoveredIndex(idx);
                setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
        };

        return (
            <div className="flex flex-col w-full gap-4">
                {/* Legend / totals */}
                <div className="flex items-center gap-5 flex-wrap px-1">
                    {SERIES.map((s, i) => (
                        <div key={s.key} className="flex items-center gap-2.5">
                            <div className="relative flex items-center justify-center w-5 h-5">
                                <div className="absolute w-5 h-5 rounded-full opacity-15" style={{ backgroundColor: s.color }} />
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            </div>
                            <div className="flex flex-col leading-none gap-0.5">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">{s.label}</span>
                                <span className="text-xs font-bold text-slate-200 tabular-nums">
                                    {s.key === 'revenue' ? brlCompact.format(totals[i]) : totals[i]}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chart */}
                <div className="relative w-full">
                    <svg
                        ref={svgRef}
                        width="100%"
                        viewBox={`0 0 ${svgW} ${svgH}`}
                        onMouseMove={onMove}
                        onMouseLeave={() => { setHoveredIndex(null); setTooltipPos(null); }}
                        className="cursor-crosshair"
                    >
                        <defs>
                            <linearGradient id="td-rev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.28} />
                                <stop offset="70%"  stopColor="#22c55e" stopOpacity={0.05} />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="td-nl" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.22} />
                                <stop offset="70%"  stopColor="#3b82f6" stopOpacity={0.04} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="td-ch" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#f43f5e" stopOpacity={0.18} />
                                <stop offset="70%"  stopColor="#f43f5e" stopOpacity={0.03} />
                                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="td-hline" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="white" stopOpacity={0} />
                                <stop offset="25%"  stopColor="white" stopOpacity={0.12} />
                                <stop offset="75%"  stopColor="white" stopOpacity={0.12} />
                                <stop offset="100%" stopColor="white" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <g transform={`translate(${pad.left},${pad.top})`}>
                            {/* Grid lines + left axis (BRL) */}
                            {[...Array(5)].map((_, i) => (
                                <g key={i}>
                                    <line
                                        x1={0} y1={i * cH / 4} x2={cW} y2={i * cH / 4}
                                        stroke="rgba(255,255,255,0.04)" strokeWidth="1"
                                    />
                                    <text
                                        x={-10} y={i * cH / 4 + 4}
                                        fill="#475569" textAnchor="end" fontSize="10"
                                    >
                                        {brlCompact.format(maxRev * (1 - i / 4))}
                                    </text>
                                </g>
                            ))}
                            {/* Right axis (counts) */}
                            {[0, 1, 2, 3, 4].map(i => (
                                <text key={i}
                                    x={cW + 10} y={i * cH / 4 + 4}
                                    fill="#475569" textAnchor="start" fontSize="10"
                                >
                                    {Math.round(maxCount * (1 - i / 4))}
                                </text>
                            ))}

                            <AnimatePresence mode="wait">
                                <motion.g
                                    key={dataKey}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* X labels */}
                                    {data.labels.map((label, i) => (
                                        <text key={label} x={pts[i].x} y={cH + 24}
                                            fill="#475569" textAnchor="middle" fontSize="10">
                                            {label}
                                        </text>
                                    ))}

                                    {/* Area fills */}
                                    <path d={`${revPath} L ${pts[pts.length-1].x},${cH} L ${pts[0].x},${cH} Z`} fill="url(#td-rev)" />
                                    <path d={`${nlPath}  L ${pts[pts.length-1].x},${cH} L ${pts[0].x},${cH} Z`} fill="url(#td-nl)" />
                                    <path d={`${chPath}  L ${pts[pts.length-1].x},${cH} L ${pts[0].x},${cH} Z`} fill="url(#td-ch)" />

                                    {/* Spline lines */}
                                    <path d={revPath} fill="none" stroke="#22c55e" strokeWidth="2"   strokeLinecap="round" />
                                    <path d={nlPath}  fill="none" stroke="#3b82f6" strokeWidth="2"   strokeLinecap="round" />
                                    <path d={chPath}  fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
                                </motion.g>
                            </AnimatePresence>

                            {/* Hover layer */}
                            <AnimatePresence>
                                {hoveredIndex !== null && (
                                    <motion.g
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 0.08 }}
                                    >
                                        {/* Hairline */}
                                        <line
                                            x1={pts[hoveredIndex].x} y1={0}
                                            x2={pts[hoveredIndex].x} y2={cH}
                                            stroke="url(#td-hline)" strokeWidth="1.5"
                                        />
                                        {/* Dots: outer glow ring + inner solid */}
                                        {([
                                            { y: pts[hoveredIndex].revenue,  color: '#22c55e' },
                                            { y: pts[hoveredIndex].newLeads, color: '#3b82f6' },
                                            { y: pts[hoveredIndex].churn,    color: '#f43f5e' },
                                        ] as const).map(({ y, color }) => (
                                            <g key={color}>
                                                <circle cx={pts[hoveredIndex].x} cy={y} r="10" fill={color} fillOpacity={0.1} />
                                                <circle cx={pts[hoveredIndex].x} cy={y} r="5"  fill={color} stroke="#0b1220" strokeWidth="1.5" />
                                            </g>
                                        ))}
                                    </motion.g>
                                )}
                            </AnimatePresence>

                            {/* Empty state */}
                            {isEmpty && (
                                <g>
                                    <text x={cW / 2} y={cH / 2 - 8}
                                        fill="#334155" textAnchor="middle" fontSize="13" fontWeight="600">
                                        Sem dados no período selecionado
                                    </text>
                                    <text x={cW / 2} y={cH / 2 + 12}
                                        fill="#1e293b" textAnchor="middle" fontSize="11">
                                        Mova negócios no pipeline para ver a tendência
                                    </text>
                                </g>
                            )}
                        </g>
                    </svg>

                    {/* Tooltip */}
                    <AnimatePresence>
                        {hoveredIndex !== null && tooltipPos && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                transition={{ duration: 0.1 }}
                                style={{
                                    left: tooltipPos.x,
                                    top: tooltipPos.y,
                                    transform: 'translate(-50%, calc(-100% - 14px))',
                                }}
                                className="absolute pointer-events-none z-20 min-w-[158px]"
                            >
                                <div className="bg-[#0b1220]/95 backdrop-blur-xl border border-white/8 rounded-xl shadow-2xl overflow-hidden">
                                    <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02]">
                                        <p className="text-[11px] font-semibold text-slate-300 text-center tracking-wide">
                                            {data.labels[hoveredIndex]}
                                        </p>
                                    </div>
                                    <div className="px-3 py-2.5 space-y-1.5">
                                        {SERIES.map(s => (
                                            <div key={s.key} className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                                    <span className="text-[10px] text-slate-500">{s.label}</span>
                                                </div>
                                                <span className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>
                                                    {s.value(hoveredIndex)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 pb-10">
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
                    <div className="relative flex items-center gap-0 bg-slate-900/60 border border-blue-500/10 rounded-xl p-1">
                        {/* sliding pill */}
                        <div
                            className="absolute top-1 bottom-1 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all duration-300 ease-in-out"
                            style={{
                                width: 'calc(33.333% - 2px)',
                                left: `calc(${['day','week','month'].indexOf(chartViewMode)} * 33.333% + 4px)`,
                            }}
                        />
                        {(['day', 'week', 'month'] as const).map(view => (
                            <button
                                key={view}
                                onClick={() => setChartViewMode(view)}
                                className={`relative z-10 px-4 py-1.5 text-sm rounded-lg transition-colors duration-200 w-20 text-center ${
                                    chartViewMode === view ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
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
