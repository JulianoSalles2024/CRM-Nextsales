
import React, { useState, useMemo, useRef } from 'react';
import { Lead, ColumnData, Task, Activity, User } from '@/types';
import type { Board } from '@/types';
import { RefreshCw, Download, Users, Target, DollarSign, AlertTriangle, Layers, ArrowLeft } from 'lucide-react';
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
    const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

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
        const buckets: { label: string; startDate: Date; endDate: Date; revenue: number; newLeads: number; churn: number; pipelineValue: number }[] = [];
        
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
                    revenue: 0, newLeads: 0, churn: 0, pipelineValue: 0
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
                    revenue: 0, newLeads: 0, churn: 0, pipelineValue: 0
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
                    revenue: 0, newLeads: 0, churn: 0, pipelineValue: 0
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
                    bucket.pipelineValue += lead.value;
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
                { label: 'Pipeline', data: buckets.map(b => b.pipelineValue), color: '#eab308' },
            ],
        };
    }, [boardFilteredLeads, activeColumns, chartViewMode]);

    const columnMap = useMemo(() => {
        return activeColumns.reduce((acc, col) => {
            acc[col.id] = {title: col.title, color: col.color};
            return acc;
        }, {} as Record<string, {title: string, color: string}>);
    }, [activeColumns]);

    // ── Avatar helpers ────────────────────────────────────────────────────────
    const AVATAR_PALETTE = [
        ['#3b82f6', '#8b5cf6'], ['#8b5cf6', '#ec4899'], ['#10b981', '#06b6d4'],
        ['#f59e0b', '#ef4444'], ['#ef4444', '#f97316'], ['#06b6d4', '#3b82f6'],
        ['#6366f1', '#8b5cf6'], ['#ec4899', '#f59e0b'],
    ];
    const getAvatarGradient = (name: string) => {
        const [c1, c2] = AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];
        return `linear-gradient(135deg, ${c1}, ${c2})`;
    };
    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
    };

    // ── Seller stats for cards grid ───────────────────────────────────────────
    const sellerStats = useMemo(() => {
        const wonColIds = new Set(activeColumns.filter(c => c.type === 'won').map(c => c.id));
        const lostColIds = new Set(activeColumns.filter(c => c.type === 'lost').map(c => c.id));
        return users.map(user => {
            const userLeads = filteredLeads.filter(l => l.ownerId === user.id);
            if (userLeads.length === 0) return null;
            const wonLeads = userLeads.filter(l => wonColIds.has(l.columnId));
            const activeLeads = userLeads.filter(l => !wonColIds.has(l.columnId) && !lostColIds.has(l.columnId));
            const totalValue = userLeads.reduce((sum, l) => sum + l.value, 0);
            const conversionRate = userLeads.length > 0 ? Math.round((wonLeads.length / userLeads.length) * 100) : 0;
            const stageCounts = activeColumns
                .filter(c => !wonColIds.has(c.id) && !lostColIds.has(c.id))
                .map(col => ({ id: col.id, title: col.title, color: col.color, count: userLeads.filter(l => l.columnId === col.id).length }))
                .filter(s => s.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);
            const totalStageCount = stageCounts.reduce((sum, s) => sum + s.count, 0);
            return {
                user,
                totalLeads: userLeads.length,
                wonLeads: wonLeads.length,
                activeLeads: activeLeads.length,
                totalValue,
                conversionRate,
                stageDistribution: stageCounts.map(s => ({ ...s, pct: totalStageCount > 0 ? Math.round((s.count / totalStageCount) * 100) : 0 })),
            };
        }).filter(Boolean) as { user: User; totalLeads: number; wonLeads: number; activeLeads: number; totalValue: number; conversionRate: number; stageDistribution: { id: string; title: string; color: string; count: number; pct: number }[] }[];
    }, [filteredLeads, activeColumns, users]);

    // ── Funnel filtered by selected seller ────────────────────────────────────
    const selectedSellerFunnelData = useMemo(() => {
        if (!selectedSellerId) return null;
        const sellerLeads = filteredLeads.filter(l => l.ownerId === selectedSellerId);
        return activeColumns.map(col => ({ ...col, count: sellerLeads.filter(l => l.columnId === col.id).length }));
    }, [selectedSellerId, filteredLeads, activeColumns]);
    
    const PerformanceChart = ({ data }: { data: typeof timeSeriesData }) => {
        const svgRef = useRef<SVGSVGElement>(null);
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null);
    
        const svgWidth = 800;
        const svgHeight = 300;
        const padding = { top: 20, right: 50, bottom: 40, left: 60 };
        const chartWidth = svgWidth - padding.left - padding.right;
        const chartHeight = svgHeight - padding.top - padding.bottom;
    
        const maxRevenue = Math.max(...data.datasets[0].data, ...data.datasets[3].data, 1);
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
                pipeline: getCoords(data.datasets[3].data[i], 'revenue'),
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
        const pipelinePath = line(points.map(p => ({ x: p.x, y: p.pipeline })));
    
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
                            <path d={`${pipelinePath} L ${points[points.length-1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`} fill={`url(#gradient-${data.datasets[3].label})`} />

                            <path d={revenuePath} fill="none" stroke={data.datasets[0].color} strokeWidth="2.5" />
                            <path d={newLeadsPath} fill="none" stroke={data.datasets[1].color} strokeWidth="2.5" />
                            <path d={churnPath} fill="none" stroke={data.datasets[2].color} strokeWidth="2.5" />
                            <path d={pipelinePath} fill="none" stroke={data.datasets[3].color} strokeWidth="2.5" strokeDasharray="5 3" />

                            <AnimatePresence>
                            {hoveredIndex !== null && (
                                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <line x1={points[hoveredIndex].x} y1={0} x2={points[hoveredIndex].x} y2={chartHeight} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                                    <circle cx={points[hoveredIndex].x} cy={points[hoveredIndex].revenue} r="5" fill={data.datasets[0].color} stroke="#1e293b" strokeWidth="2" />
                                    <circle cx={points[hoveredIndex].x} cy={points[hoveredIndex].newLeads} r="5" fill={data.datasets[1].color} stroke="#1e293b" strokeWidth="2" />
                                    <circle cx={points[hoveredIndex].x} cy={points[hoveredIndex].churn} r="5" fill={data.datasets[2].color} stroke="#1e293b" strokeWidth="2" />
                                    <circle cx={points[hoveredIndex].x} cy={points[hoveredIndex].pipeline} r="5" fill={data.datasets[3].color} stroke="#1e293b" strokeWidth="2" />
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
                                            <span className="font-semibold text-white">{(ds.label === 'Receita' || ds.label === 'Pipeline') ? currencyFormatter.format(ds.data[hoveredIndex]) : ds.data[hoveredIndex]}</span>
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
                            onChange={e => { setSelectedBoardId(e.target.value); setSelectedSellerId(null); }}
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
                <AnimatePresence mode="wait">
                {!selectedSellerId ? (
                    /* ── STATE 1: Seller cards grid ─────────────────────────── */
                    <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="font-semibold text-white">Funil de Conversão</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Selecione um vendedor para ver o funil individual</p>
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums">{sellerStats.length} vendedores</span>
                        </div>

                        {sellerStats.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-slate-600">
                                <Users className="w-8 h-8 mb-2" />
                                <p className="text-sm text-slate-500">Nenhum vendedor com leads no período</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {sellerStats.map((stat, i) => (
                                    <motion.div
                                        key={stat.user.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: i * 0.04 }}
                                        onClick={() => setSelectedSellerId(stat.user.id)}
                                        className="bg-[#060d18] border border-white/5 rounded-xl p-4 cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/[0.03] transition-all duration-200 group"
                                        style={{ boxShadow: 'none' }}
                                        whileHover={{ boxShadow: '0 0 20px rgba(59,130,246,0.08)' }}
                                    >
                                        {/* Avatar + name */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                style={{ background: getAvatarGradient(stat.user.name) }}>
                                                {getInitials(stat.user.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white truncate leading-snug">{stat.user.name}</p>
                                                <p className="text-[10px] text-slate-500">Vendedor</p>
                                            </div>
                                        </div>

                                        {/* 3 metrics */}
                                        <div className="grid grid-cols-3 gap-1 mb-3 text-center">
                                            <div>
                                                <p className="text-base font-bold text-white">{stat.activeLeads}</p>
                                                <p className="text-[10px] text-slate-500 leading-tight">Ativos</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-emerald-400 truncate">{currencyFormatter.format(stat.totalValue).replace('R$\u00a0', 'R$')}</p>
                                                <p className="text-[10px] text-slate-500 leading-tight">Valor</p>
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-blue-400">{stat.conversionRate}%</p>
                                                <p className="text-[10px] text-slate-500 leading-tight">Conv.</p>
                                            </div>
                                        </div>

                                        {/* Stage distribution bar */}
                                        {stat.stageDistribution.length > 0 && (
                                            <div>
                                                <div className="flex h-1 rounded-full overflow-hidden gap-px">
                                                    {stat.stageDistribution.map(s => (
                                                        <div key={s.id} className="rounded-full transition-all" style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${s.title}: ${s.count}`} />
                                                    ))}
                                                    <div className="flex-1 bg-slate-800/60 rounded-full" />
                                                </div>
                                                <div className="flex gap-2 mt-1.5 flex-wrap">
                                                    {stat.stageDistribution.slice(0, 2).map(s => (
                                                        <span key={s.id} className="text-[10px] text-slate-600 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                                                            {s.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    /* ── STATE 2: Individual seller funnel ──────────────────── */
                    <motion.div key="funnel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        {(() => {
                            const seller = users.find(u => u.id === selectedSellerId);
                            const funnelData = selectedSellerFunnelData ?? [];
                            const totalCount = funnelData.reduce((s, d) => s + d.count, 0);
                            return (
                                <>
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-5">
                                        <button
                                            onClick={() => setSelectedSellerId(null)}
                                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            Todos os vendedores
                                        </button>
                                        <span className="text-slate-700">·</span>
                                        {seller && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                                    style={{ background: getAvatarGradient(seller.name) }}>
                                                    {getInitials(seller.name)}
                                                </div>
                                                <span className="text-sm font-semibold text-white">{seller.name}</span>
                                            </div>
                                        )}
                                        <span className="ml-auto text-xs text-slate-500 tabular-nums">{totalCount} leads</span>
                                    </div>

                                    {/* Funnel bars */}
                                    <div className="space-y-0.5">
                                        {funnelData.map((stage, idx) => {
                                            const maxCount = Math.max(...funnelData.map(s => s.count), 1);
                                            const percentage = (stage.count / maxCount) * 100;
                                            const prevStage = idx > 0 ? funnelData[idx - 1] : null;
                                            const retention = prevStage && prevStage.count > 0
                                                ? Math.round((stage.count / prevStage.count) * 100)
                                                : null;
                                            return (
                                                <React.Fragment key={stage.id}>
                                                    {retention !== null && (
                                                        <div className="flex items-center gap-2 py-1 pl-[120px]">
                                                            <div className="w-px h-2.5 bg-slate-700/80 ml-0.5" />
                                                            <span className={`text-[10px] font-medium tracking-wide ${retention >= 70 ? 'text-emerald-400/80' : retention >= 40 ? 'text-amber-400/80' : 'text-red-400/80'}`}>
                                                                ▼ {retention}% avançaram
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3 group py-0.5">
                                                        <div className="flex items-center gap-2 w-28 shrink-0">
                                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                                                            <p className="text-xs text-slate-400 truncate group-hover:text-slate-200 transition-colors duration-150" title={stage.title}>
                                                                {stage.title}
                                                            </p>
                                                        </div>
                                                        <div className="flex-1 h-7 bg-slate-800/70 rounded-lg overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0, opacity: 0 }}
                                                                animate={{ width: `${Math.max(percentage, stage.count > 0 ? 2 : 0)}%`, opacity: 1 }}
                                                                transition={{ duration: 0.75, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                                                                className="h-full rounded-lg relative overflow-hidden"
                                                                style={{ background: `linear-gradient(90deg, ${stage.color}DD 0%, ${stage.color}88 100%)`, boxShadow: `0 0 18px ${stage.color}35` }}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent" />
                                                            </motion.div>
                                                        </div>
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -6 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ duration: 0.4, delay: idx * 0.07 + 0.35 }}
                                                            className="w-12 shrink-0 flex justify-end"
                                                        >
                                                            <span className="text-sm font-bold tabular-nums" style={{ color: stage.color }}>{stage.count}</span>
                                                        </motion.div>
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        })()}
                    </motion.div>
                )}
                </AnimatePresence>
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
