
import React, { useState, useMemo, useRef } from 'react';
import { Lead, ColumnData, Task, Activity, User } from '@/types';
import type { Board } from '@/types';
import { RefreshCw, Download, Users, Target, DollarSign, AlertTriangle, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import FlatCard from '@/components/ui/FlatCard';


interface ReportsPageProps {
    leads: Lead[];
    columns: ColumnData[];
    tasks: Task[];
    activities: Activity[];
    boards: Board[];
    users: User[];
}

interface ReportKpiCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
}

const ReportKpiCard: React.FC<ReportKpiCardProps> = ({ title, value, icon: Icon, color }) => (
    <FlatCard className="p-5 flex justify-between items-center transition-all duration-200 ease-in-out hover:bg-slate-800/50 hover:-translate-y-1 hover:shadow-lg">
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-6 h-6" style={{ color }} />
        </div>
    </FlatCard>
);


const ReportsPage: React.FC<ReportsPageProps> = ({ leads, columns, tasks, activities, boards, users }) => {
    const [timeRange, setTimeRange] = useState<'30d' | '365d'>('30d');
    const [chartViewMode, setChartViewMode] = useState<'day' | 'week' | 'month'>('week');
    const [selectedBoardId, setSelectedBoardId] = useState<'all' | string>('all');
    const [topLeadsPage, setTopLeadsPage] = useState(1);
    const TOP_LEADS_PAGE_SIZE = 2;

    // Derive columns and leads for the selected pipeline
    const activeColumns = useMemo(() => {
        if (selectedBoardId === 'all') return boards.flatMap(b => b.columns);
        const board = boards.find(b => b.id === selectedBoardId);
        return board ? board.columns : columns;
    }, [selectedBoardId, boards, columns]);

    const activeColumnIds = useMemo(
        () => new Set(activeColumns.map(c => c.id)),
        [activeColumns]
    );

    const boardFilteredLeads = useMemo(
        () => leads.filter(l => activeColumnIds.has(l.columnId)),
        [leads, activeColumnIds]
    );

    
    const currencyFormatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    const { filteredLeads, filteredTasks } = useMemo(() => {
        const now = new Date();
        let startDate = new Date();

        switch (timeRange) {
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '365d':
                startDate.setDate(now.getDate() - 365);
                break;
        }

        startDate.setHours(0, 0, 0, 0);

        const newFilteredLeads = boardFilteredLeads.filter(l => l.createdAt && new Date(l.createdAt) >= startDate);
        const newFilteredTasks = tasks.filter(t => new Date(t.dueDate) >= startDate);

        return { filteredLeads: newFilteredLeads, filteredTasks: newFilteredTasks };
    }, [boardFilteredLeads, tasks, timeRange]);


    const reportData = useMemo(() => {
        const wonLeads = filteredLeads.filter(l => activeColumns.find(c => c.id === l.columnId)?.type === 'won');
        const totalLeads = filteredLeads.length;
        const wonLeadsCount = wonLeads.length;
        const conversionRate = totalLeads > 0 ? ((wonLeadsCount / totalLeads) * 100).toFixed(1) : '0.0';

        const averageValue = wonLeads.length > 0
            ? wonLeads.reduce((sum, lead) => sum + lead.value, 0) / wonLeads.length
            : 0;

        const encerradoCount = boardFilteredLeads.filter(l => l.status === 'ENCERRADO').length;

        const funnelData = activeColumns.map(col => {
            const leadsInCol = filteredLeads.filter(l => l.columnId === col.id);
            return {
                ...col,
                count: leadsInCol.length,
            };
        });

        const topLeads = [...filteredLeads]
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
            
        return {
            totalLeads,
            conversionRate,
            averageValue,
            encerradoCount,
            funnelData,
            topLeads,
        };
    }, [filteredLeads, filteredTasks, activeColumns]);

    const timeSeriesData = useMemo(() => {
        const now = new Date();
        const buckets: { label: string; startDate: Date; endDate: Date; revenue: number; newLeads: number; churn: number }[] = [];
        
        if (chartViewMode === 'day') {
            const todayStart = new Date(now);
            todayStart.setHours(0,0,0,0);
            for (let i = 0; i < 24; i++) {
                const hourStart = new Date(todayStart);
                hourStart.setHours(i);
                const hourEnd = new Date(hourStart);
                hourEnd.setHours(i, 59, 59, 999);
                buckets.push({
                    label: `${String(i).padStart(2, '0')}:00`,
                    startDate: hourStart,
                    endDate: hourEnd,
                    revenue: 0, newLeads: 0, churn: 0
                });
            }
        } else if (chartViewMode === 'week') {
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(now.getDate() - i);
                buckets.push({
                    label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    startDate: new Date(new Date(date).setHours(0, 0, 0, 0)),
                    endDate: new Date(new Date(date).setHours(23, 59, 59, 999)),
                    revenue: 0, newLeads: 0, churn: 0
                });
            }
        } else if (chartViewMode === 'month') {
             for (let i = 3; i >= 0; i--) {
                const weekEnd = new Date();
                weekEnd.setDate(now.getDate() - (i * 7));
                const weekStart = new Date(weekEnd);
                weekStart.setDate(weekEnd.getDate() - 6);
                
                buckets.push({
                    label: `Semana ${4 - i}`,
                    startDate: new Date(new Date(weekStart).setHours(0,0,0,0)),
                    endDate: new Date(new Date(weekEnd).setHours(23,59,59,999)),
                    revenue: 0, newLeads: 0, churn: 0
                });
             }
        }
    
        const wonColumnIds = activeColumns.filter(c => c.type === 'won').map(c => c.id);
        const lostColumnIds = activeColumns.filter(c => c.type === 'lost').map(c => c.id);
        
        boardFilteredLeads.forEach(lead => {
            const creationDate = lead.createdAt ? new Date(lead.createdAt) : null;
            const wonDate = (lead.lastActivityTimestamp && wonColumnIds.includes(lead.columnId)) ? new Date(lead.lastActivityTimestamp) : null;
            const churnDate = (lead.lastActivityTimestamp && lostColumnIds.includes(lead.columnId)) ? new Date(lead.lastActivityTimestamp) : null;
    
            for (const bucket of buckets) {
                if (creationDate && creationDate >= bucket.startDate && creationDate <= bucket.endDate) {
                    bucket.newLeads++;
                }
                if (wonDate && wonDate >= bucket.startDate && wonDate <= bucket.endDate) {
                    bucket.revenue += lead.value;
                }
                 if (churnDate && churnDate >= bucket.startDate && churnDate <= bucket.endDate) {
                    bucket.churn++;
                }
            }
        });
    
        return {
            labels: buckets.map(b => b.label),
            datasets: [
                { label: 'Receita', data: buckets.map(b => b.revenue), color: '#8b5cf6' },
                { label: 'Novos Leads', data: buckets.map(b => b.newLeads), color: '#3b82f6' },
                { label: 'Churn', data: buckets.map(b => b.churn), color: '#ef4444' },
            ],
        };
    }, [boardFilteredLeads, activeColumns, chartViewMode]);

     const columnMap = useMemo(() => {
        return activeColumns.reduce((acc, col) => {
            acc[col.id] = {title: col.title, color: col.color};
            return acc;
        }, {} as Record<string, {title: string, color: string}>);
    }, [activeColumns]);
    
    const PerformanceChart = ({ data }: { data: typeof timeSeriesData }) => {
        const svgRef = useRef<SVGSVGElement>(null);
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null);
    
        const svgWidth = 800;
        const svgHeight = 300;
        const padding = { top: 20, right: 50, bottom: 40, left: 60 };
        const chartWidth = svgWidth - padding.left - padding.right;
        const chartHeight = svgHeight - padding.top - padding.bottom;
    
        const maxRevenue = Math.max(...data.datasets[0].data, 1);
        const maxCount = Math.max(...data.datasets[1].data, ...data.datasets[2].data, 5);
    
        const getCoords = (value: number, type: 'revenue' | 'count') => {
            const max = type === 'revenue' ? maxRevenue : maxCount;
            return chartHeight - (value / max) * chartHeight;
        };
    
        const points = data.labels.map((_, i) => {
            const x = i * (chartWidth / (data.labels.length - 1 || 1));
            return {
                x,
                revenue: getCoords(data.datasets[0].data[i], 'revenue'),
                newLeads: getCoords(data.datasets[1].data[i], 'count'),
                churn: getCoords(data.datasets[2].data[i], 'count'),
            };
        });
    
        const line = (points: { x: number, y: number }[]) => {
            return points.reduce((acc, point, i) => {
                if (i === 0) return `M ${points[0].x},${points[0].y}`;
                const [p0, p1, p2, p3] = [points[i-2], points[i-1], points[i], points[i+1]].map((p, j) => p || points[j === 0 ? 0 : points.length - 1]);
                const cp1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
                const cp2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
                return `${acc} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
            }, "");
        };
        
        const revenuePath = line(points.map(p => ({ x: p.x, y: p.revenue })));
        const newLeadsPath = line(points.map(p => ({ x: p.x, y: p.newLeads })));
        const churnPath = line(points.map(p => ({ x: p.x, y: p.churn })));
    
        const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
            if (!svgRef.current) return;
            const svgRect = svgRef.current.getBoundingClientRect();
            const mouseX = e.clientX - svgRect.left - padding.left;
            const index = Math.round(mouseX / (chartWidth / (data.labels.length - 1 || 1)));
            if(index >= 0 && index < data.labels.length) {
                setHoveredIndex(index);
                setTooltipPos({ x: e.clientX - svgRect.left, y: e.clientY - svgRect.top });
            }
        };
    
        const handleMouseLeave = () => {
            setHoveredIndex(null);
            setTooltipPos(null);
        };
    
        return (
            <div className="relative flex flex-col h-full">
                <div className="flex-1">
                     <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                        <defs>
                            {data.datasets.map(ds => (
                                <linearGradient key={ds.label} id={`gradient-${ds.label}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={ds.color} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={ds.color} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <g transform={`translate(${padding.left}, ${padding.top})`}>
                            {[...Array(5)].map((_, i) => (
                                <g key={i}>
                                    <line x1={0} y1={i * chartHeight / 4} x2={chartWidth} y2={i * chartHeight / 4} stroke="#334155" strokeWidth="1" strokeDasharray="3 3"/>
                                    <text x={-10} y={i * chartHeight / 4 + 5} fill="#94a3b8" textAnchor="end" fontSize="12">{currencyFormatter.format(maxRevenue * (1-i/4)).replace(/\,00$/, '')}</text>
                                </g>
                            ))}
                            {[...Array(6)].map((_, i) => (
                                <text key={i} x={chartWidth + 10} y={i * chartHeight / 5 + 5} fill="#94a3b8" textAnchor="start" fontSize="12">{Math.round(maxCount * (1-i/5))}</text>
                            ))}
                            {data.labels.map((label, i) => (
                                <text key={label} x={points[i].x} y={chartHeight + 20} fill="#94a3b8" textAnchor="middle" fontSize="12">{label}</text>
                            ))}
    
                            <path d={`${revenuePath} L ${points[points.length-1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`} fill={`url(#gradient-${data.datasets[0].label})`} />
                            <path d={`${newLeadsPath} L ${points[points.length-1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`} fill={`url(#gradient-${data.datasets[1].label})`} />
                            <path d={`${churnPath} L ${points[points.length-1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`} fill={`url(#gradient-${data.datasets[2].label})`} />

                            <path d={revenuePath} fill="none" stroke={data.datasets[0].color} strokeWidth="2.5" />
                            <path d={newLeadsPath} fill="none" stroke={data.datasets[1].color} strokeWidth="2.5" />
                            <path d={churnPath} fill="none" stroke={data.datasets[2].color} strokeWidth="2.5" />

                            <AnimatePresence>
                            {hoveredIndex !== null && (
                                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <line x1={points[hoveredIndex].x} y1={0} x2={points[hoveredIndex].x} y2={chartHeight} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                                    <circle cx={points[hoveredIndex].x} cy={points[hoveredIndex].revenue} r="5" fill={data.datasets[0].color} stroke="#1e293b" strokeWidth="2" />
                                    <circle cx={points[hoveredIndex].x} cy={points[hoveredIndex].newLeads} r="5" fill={data.datasets[1].color} stroke="#1e293b" strokeWidth="2" />
                                    <circle cx={points[hoveredIndex].x} cy={points[hoveredIndex].churn} r="5" fill={data.datasets[2].color} stroke="#1e293b" strokeWidth="2" />
                                </motion.g>
                            )}
                            </AnimatePresence>
                        </g>
                    </svg>
                    <AnimatePresence>
                        {hoveredIndex !== null && tooltipPos && (
                             <motion.div
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                style={{
                                    left: tooltipPos.x, top: tooltipPos.y,
                                    transform: `translate(-50%, -110%)`
                                }}
                                className="absolute p-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl pointer-events-none"
                            >
                                <p className="font-bold text-white text-center mb-2">{data.labels[hoveredIndex]}</p>
                                <div className="space-y-1 text-sm">
                                    {data.datasets.map(ds => (
                                        <div key={ds.label} className="flex justify-between items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ds.color }}/>
                                                <span className="text-slate-400">{ds.label}:</span>
                                            </div>
                                            <span className="font-semibold text-white">{ds.label === 'Receita' ? currencyFormatter.format(ds.data[hoveredIndex]) : ds.data[hoveredIndex]}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                 <div className="flex justify-center items-center gap-6 pt-4">
                    {data.datasets.map(ds => (
                        <div key={ds.label} className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ds.color }} />
                            <span className="text-slate-300">{ds.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
             <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-1 mb-2">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-900/20 cursor-default">
                            <Target className="w-4 h-4 flex-shrink-0" />
                            <span>Relatórios</span>
                        </button>
                    </div>
                    <p className="text-slate-400 text-sm">
                        Análise detalhada de desempenho e métricas
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Pipeline filter */}
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                        <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <select
                            value={selectedBoardId}
                            onChange={e => setSelectedBoardId(e.target.value)}
                            className="bg-slate-800 text-sm text-slate-200 focus:outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-slate-800 text-slate-200">Geral (todos os pipelines)</option>
                            {boards.map(b => (
                                <option key={b.id} value={b.id} className="bg-slate-800 text-slate-200">{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <button className="p-2.5 text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700/80 rounded-lg" title="Atualizar dados">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700/80 rounded-lg" title="Baixar relatório">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportKpiCard title="Total de Leads" value={reportData.totalLeads.toString()} icon={Users} color="#8b5cf6" />
                <ReportKpiCard title="Taxa de Conversão" value={`${reportData.conversionRate}%`} icon={Target} color="#ec4899" />
                <ReportKpiCard title="Valor Médio" value={currencyFormatter.format(reportData.averageValue)} icon={DollarSign} color="#3b82f6" />
                <FlatCard className="p-5 flex justify-between items-center transition-all duration-200 ease-in-out hover:bg-slate-800/50 hover:-translate-y-1 hover:shadow-lg">
                    <div>
                        <p className="text-sm text-slate-400">Churn</p>
                        <p className="text-2xl font-bold text-white mt-1">{reportData.encerradoCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ef444420' }}>
                        <AlertTriangle className="w-6 h-6" style={{ color: '#ef4444' }} />
                    </div>
                </FlatCard>
            </div>
            
            <FlatCard className="p-5">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-white">Funil de Conversão</h3>
                    <span className="text-xs text-slate-500 tabular-nums">
                        {reportData.funnelData.reduce((s, d) => s + d.count, 0)} leads total
                    </span>
                </div>
                <div className="space-y-0.5">
                    {reportData.funnelData.map((stage, idx) => {
                        const maxCount = Math.max(...reportData.funnelData.map((s) => s.count), 1);
                        const percentage = (stage.count / maxCount) * 100;
                        const prevStage = idx > 0 ? reportData.funnelData[idx - 1] : null;
                        const retention = prevStage && prevStage.count > 0
                            ? Math.round((stage.count / prevStage.count) * 100)
                            : null;
                        return (
                            <React.Fragment key={stage.id}>
                                {/* Drop-off indicator */}
                                {retention !== null && (
                                    <div className="flex items-center gap-2 py-1 pl-[120px]">
                                        <div className="w-px h-2.5 bg-slate-700/80 ml-0.5" />
                                        <span className={`text-[10px] font-medium tracking-wide ${
                                            retention >= 70 ? 'text-emerald-400/80' :
                                            retention >= 40 ? 'text-amber-400/80' : 'text-red-400/80'
                                        }`}>
                                            ▼ {retention}% avançaram
                                        </span>
                                    </div>
                                )}
                                {/* Stage row */}
                                <div className="flex items-center gap-3 group py-0.5">
                                    {/* Label */}
                                    <div className="flex items-center gap-2 w-28 shrink-0">
                                        <span className="w-2 h-2 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-[#0B1220]"
                                            style={{ backgroundColor: stage.color, ringColor: `${stage.color}40` }} />
                                        <p className="text-xs text-slate-400 truncate group-hover:text-slate-200 transition-colors duration-150"
                                            title={stage.title}>
                                            {stage.title}
                                        </p>
                                    </div>
                                    {/* Bar track */}
                                    <div className="flex-1 h-7 bg-slate-800/70 rounded-lg overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: `${Math.max(percentage, stage.count > 0 ? 2 : 0)}%`, opacity: 1 }}
                                            transition={{ duration: 0.75, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                                            className="h-full rounded-lg relative overflow-hidden"
                                            style={{
                                                background: `linear-gradient(90deg, ${stage.color}DD 0%, ${stage.color}88 100%)`,
                                                boxShadow: `0 0 18px ${stage.color}35`,
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent" />
                                            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/10 to-transparent" />
                                        </motion.div>
                                    </div>
                                    {/* Count badge */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.4, delay: idx * 0.07 + 0.35 }}
                                        className="w-12 shrink-0 flex justify-end"
                                    >
                                        <span className="text-sm font-bold tabular-nums" style={{ color: stage.color }}>
                                            {stage.count}
                                        </span>
                                    </motion.div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </FlatCard>

            <FlatCard className="overflow-hidden">
                <h3 className="font-semibold text-white p-5">Top 10 Leads por Valor</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-800">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Lead</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Valor</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Estágio</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Probabilidade</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Risco de Churn</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Dono</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {reportData.topLeads.slice((topLeadsPage - 1) * TOP_LEADS_PAGE_SIZE, topLeadsPage * TOP_LEADS_PAGE_SIZE).map(lead => (
                                <tr key={lead.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-white">{lead.name}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-300">{currencyFormatter.format(lead.value)}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm">
                                        {columnMap[lead.columnId] ?
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full" style={{ color: columnMap[lead.columnId].color, backgroundColor: `${columnMap[lead.columnId].color}20`}}>
                                                {columnMap[lead.columnId].title}
                                            </span>
                                            : '-'
                                        }
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 bg-slate-700 rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full" style={{ width: `${lead.probability || 0}%`, backgroundColor: '#2563EB' }}></div>
                                            </div>
                                            <span>{lead.probability || 0}%</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {(() => {
                                            const isInactive = lead.status === 'ENCERRADO' || lead.status === 'PERDIDO' || !!lead.wonAt;
                                            if (isInactive) return (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 bg-slate-700 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: '0%', backgroundColor: '#ef4444' }} /></div>
                                                    <span>0%</span>
                                                </div>
                                            );
                                            const lastDate = lead.lastActivityTimestamp ? new Date(lead.lastActivityTimestamp) : new Date(lead.createdAt || Date.now());
                                            const daysSince = (Date.now() - lastDate.getTime()) / 86_400_000;
                                            const risk = Math.round(Math.min(daysSince / 30, 1) * 100);
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 bg-slate-700 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${risk}%`, backgroundColor: '#ef4444' }} /></div>
                                                    <span>{risk}%</span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {users.find(u => u.id === lead.ownerId)?.name ?? '—'}
                                    </td>
                                </tr>
                            ))}
                             {reportData.topLeads.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-slate-500">
                                        Nenhum lead encontrado para este período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
                {reportData.topLeads.length > TOP_LEADS_PAGE_SIZE && (() => {
                    const totalPages = Math.ceil(reportData.topLeads.length / TOP_LEADS_PAGE_SIZE);
                    return (
                        <div className="flex items-center justify-center gap-1 px-5 py-3 border-t border-slate-800">
                            <button
                                onClick={() => setTopLeadsPage(p => Math.max(1, p - 1))}
                                disabled={topLeadsPage === 1}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                &lt;
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setTopLeadsPage(page)}
                                    className={`w-7 h-7 text-xs rounded-md transition-colors ${topLeadsPage === page ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setTopLeadsPage(p => Math.min(totalPages, p + 1))}
                                disabled={topLeadsPage === totalPages}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                &gt;
                            </button>
                        </div>
                    );
                })()}
            </FlatCard>
        </div>
    );
};

export default ReportsPage;
