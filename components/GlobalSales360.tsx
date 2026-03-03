import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    DollarSign, TrendingUp, TrendingDown, Building2,
    Briefcase, Target, Globe,
    ChevronLeft, ChevronRight, RefreshCw, Award, Zap,
    Filter, Calendar, Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '../src/features/auth/AuthContext';
import GlassCard from './ui/GlassCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SaleRecord {
    id: string;
    seller_id: string;
    client_name: string;
    banco: string;
    tipo_operacao: string;
    valor: number;
    status: 'pendente' | 'aprovado' | 'recusado' | 'cancelado';
    data_fechamento: string;
    created_at: string;
}

type Period = 'hoje' | 'semana' | 'mes' | 'ano' | 'custom';

// ── Date Utilities ────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getDateRange(period: Period): { start: string; end: string } {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth();
    const d = now.getDate();

    const end = new Date(y, mo, d);
    let start: Date;

    switch (period) {
        case 'hoje':   start = new Date(y, mo, d); break;
        case 'semana': start = new Date(y, mo, d - 6); break;
        case 'ano':    start = new Date(y, 0, 1); break;
        case 'mes':
        default:       start = new Date(y, mo, 1);
    }
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

function getPrevDateRange(period: Period): { start: string; end: string } {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth();
    const d = now.getDate();

    switch (period) {
        case 'hoje': {
            const s = toLocalDateStr(new Date(y, mo, d - 1));
            return { start: s, end: s };
        }
        case 'semana':
            return {
                start: toLocalDateStr(new Date(y, mo, d - 13)),
                end:   toLocalDateStr(new Date(y, mo, d - 7)),
            };
        case 'ano':
            return {
                start: toLocalDateStr(new Date(y - 1, 0, 1)),
                end:   toLocalDateStr(new Date(y - 1, 11, 31)),
            };
        case 'mes':
        default:
            return {
                start: toLocalDateStr(new Date(y, mo - 1, 1)),
                end:   toLocalDateStr(new Date(y, mo, 0)),
            };
    }
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

const SVGLineChart: React.FC<{
    data: { label: string; value: number }[];
    color?: string;
}> = ({ data, color = '#3b82f6' }) => {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm italic">
                Sem dados para o período
            </div>
        );
    }

    const W = 600;
    const H = 140;
    const padX = 20;
    const padY = 16;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const toX = (i: number) => padX + (i / Math.max(data.length - 1, 1)) * (W - padX * 2);
    const toY = (v: number) => H - padY - (v / maxVal) * (H - padY * 2);

    const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
    const areaPoints = [
        `${toX(0)},${H}`,
        ...data.map((d, i) => `${toX(i)},${toY(d.value)}`),
        `${toX(data.length - 1)},${H}`,
    ].join(' ');

    const showLabels = data.length <= 10
        ? data.map((_, i) => i)
        : [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor(3 * data.length / 4), data.length - 1];

    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="globalAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75, 1].map((pct, i) => (
                    <line
                        key={i}
                        x1={padX} y1={toY(maxVal * pct)}
                        x2={W - padX} y2={toY(maxVal * pct)}
                        stroke="#1e293b" strokeWidth="1"
                    />
                ))}
                <polygon points={areaPoints} fill="url(#globalAreaGrad)" />
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
                {data.map((d, i) => (
                    showLabels.includes(i) && (
                        <circle key={i} cx={toX(i)} cy={toY(d.value)} r="3" fill={color} vectorEffect="non-scaling-stroke" />
                    )
                ))}
            </svg>
            <div className="flex justify-between text-[10px] text-slate-600 mt-1 px-1">
                {showLabels.map(i => (
                    <span key={i}>{data[i]?.label ?? ''}</span>
                ))}
            </div>
        </div>
    );
};

// ── Horizontal Bar Chart ───────────────────────────────────────────────────────

const BarChartRow: React.FC<{
    name: string;
    value: number;
    maxValue: number;
    formatter: (v: number) => string;
    color: string;
}> = ({ name, value, maxValue, formatter, color }) => (
    <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 w-28 truncate flex-shrink-0">{name}</span>
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max((value / maxValue) * 100, 2)}%`, background: color }}
            />
        </div>
        <span className="text-xs font-bold text-white w-24 text-right flex-shrink-0">{formatter(value)}</span>
    </div>
);

// ── Currency Formatter ─────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// ── Main Component ─────────────────────────────────────────────────────────────

const GlobalSales360: React.FC = () => {
    const { companyId } = useAuth();

    const [period, setPeriod] = useState<Period>('mes');
    const [loading, setLoading] = useState(true);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const [wonLeads, setWonLeads] = useState<{ value: number; owner_id: string | null }[]>([]);
    const [prevWonLeads, setPrevWonLeads] = useState<{ value: number }[]>([]);
    const [sales, setSales] = useState<SaleRecord[]>([]);
    const [globalGoal, setGlobalGoal] = useState<{ targetValue: number } | null>(null);
    const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);

    // Table state
    const [page, setPage] = useState(1);
    const [bankFilter, setBankFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const PAGE_SIZE = 10;

    // ── Data Fetching ──────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        if (!companyId) { setLoading(false); return; }
        if (period === 'custom' && (!customStart || !customEnd)) { setLoading(false); return; }

        setLoading(true);

        const { start, end } = period === 'custom'
            ? { start: customStart, end: customEnd }
            : getDateRange(period);
        const { start: prevStart, end: prevEnd } = period === 'custom'
            ? { start: customStart, end: customEnd }
            : getPrevDateRange(period as Exclude<Period, 'custom'>);
        const today = toLocalDateStr(new Date());

        // Step 1: resolve seller IDs/names for this company
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('company_id', companyId)
            .eq('is_active', true);

        const resolvedSellers = (profilesData ?? []).map(p => ({ id: p.id as string, name: (p.name as string) ?? '—' }));
        setSellers(resolvedSellers);
        const sellerIds = resolvedSellers.map(s => s.id);

        // Step 2: parallel queries
        const [wonRes, prevWonRes, salesRes, goalRes] = await Promise.all([
            // Won leads current period — all company
            supabase
                .from('leads')
                .select('value, owner_id')
                .eq('company_id', companyId)
                .eq('status', 'GANHO')
                .eq('is_archived', false)
                .is('deleted_at', null)
                .gte('won_at', start + 'T00:00:00')
                .lte('won_at', end + 'T23:59:59.999'),

            // Won leads previous period — all company
            supabase
                .from('leads')
                .select('value')
                .eq('company_id', companyId)
                .eq('status', 'GANHO')
                .eq('is_archived', false)
                .is('deleted_at', null)
                .gte('won_at', prevStart + 'T00:00:00')
                .lte('won_at', prevEnd + 'T23:59:59.999'),

            // Sales current period — filtered by company sellers
            sellerIds.length > 0
                ? supabase
                    .from('sales')
                    .select('*')
                    .in('seller_id', sellerIds)
                    .gte('data_fechamento', start)
                    .lte('data_fechamento', end)
                    .order('data_fechamento', { ascending: false })
                : Promise.resolve({ data: [] as SaleRecord[], error: null }),

            // Global goal (user_id IS NULL)
            supabase
                .from('goals')
                .select('goal_value')
                .eq('company_id', companyId)
                .is('user_id', null)
                .eq('is_active', true)
                .lte('start_date', today)
                .gte('end_date', today)
                .order('created_at', { ascending: false })
                .limit(1),
        ]);

        setWonLeads((wonRes.data as { value: number; owner_id: string | null }[]) ?? []);
        setPrevWonLeads((prevWonRes.data as { value: number }[]) ?? []);
        setSales((salesRes.data as SaleRecord[]) ?? []);

        const rawGoal = (goalRes.data as { goal_value: number }[] | null)?.[0] ?? null;
        setGlobalGoal(rawGoal ? { targetValue: rawGoal.goal_value ?? 0 } : null);

        setPage(1);
        setLoading(false);
    }, [companyId, period, customStart, customEnd]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── KPI Computations ──────────────────────────────────────────────────────

    const kpis = useMemo(() => {
        const faturamento = wonLeads.reduce((s, r) => s + r.value, 0);
        const prevFaturamento = prevWonLeads.reduce((s, r) => s + r.value, 0);
        const crescimento = prevFaturamento > 0
            ? ((faturamento - prevFaturamento) / prevFaturamento) * 100
            : 0;
        const totalVendas = wonLeads.length;
        const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;

        const metaMensal = globalGoal?.targetValue ?? 0;
        const metaPct = metaMensal > 0 ? Math.min((faturamento / metaMensal) * 100, 100) : 0;
        const faltamParaMeta = Math.max(metaMensal - faturamento, 0);

        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = Math.max(lastDay - now.getDate() + 1, 1);
        const metaDiaria = period === 'mes' ? faltamParaMeta / daysRemaining : 0;

        // Daily evolution from won leads (grouped by won_at date)
        const dailyMap = new Map<string, number>();
        wonLeads.forEach(l => {
            const dateStr = (l as any).won_at as string | undefined;
            const d = dateStr?.split('T')[0] ?? '';
            if (d) dailyMap.set(d, (dailyMap.get(d) ?? 0) + l.value);
        });
        const dailyData = [...dailyMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => ({
                label: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                value,
            }));

        // Bank breakdown from sales
        const bankMap = new Map<string, number>();
        sales.forEach(s => {
            const banco = s.banco ?? 'Sem Banco';
            bankMap.set(banco, (bankMap.get(banco) ?? 0) + s.valor);
        });
        const bankData = [...bankMap.entries()].sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));

        // Operation type breakdown from sales
        const typeMap = new Map<string, number>();
        sales.forEach(s => typeMap.set(s.tipo_operacao, (typeMap.get(s.tipo_operacao) ?? 0) + s.valor));
        const typeData = [...typeMap.entries()].sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));

        // Seller ranking from won leads
        const sellerMap = new Map<string, number>();
        wonLeads.forEach(l => {
            if (l.owner_id) sellerMap.set(l.owner_id, (sellerMap.get(l.owner_id) ?? 0) + l.value);
        });
        const sellerRanking = [...sellerMap.entries()]
            .sort(([, a], [, b]) => b - a)
            .map(([sellerId, value]) => ({
                id: sellerId,
                name: sellers.find(s => s.id === sellerId)?.name ?? '—',
                value,
            }));

        return {
            faturamento, prevFaturamento, crescimento,
            totalVendas, ticketMedio,
            metaMensal, metaPct, faltamParaMeta, metaDiaria,
            dailyData, bankData, typeData, sellerRanking,
        };
    }, [wonLeads, prevWonLeads, sales, globalGoal, period, sellers]);

    // ── Table ─────────────────────────────────────────────────────────────────

    const filteredSales = useMemo(() => sales.filter(s =>
        (!bankFilter || s.banco === bankFilter) &&
        (!typeFilter || s.tipo_operacao === typeFilter) &&
        (!statusFilter || s.status === statusFilter)
    ), [sales, bankFilter, typeFilter, statusFilter]);

    const totalPages = Math.max(Math.ceil(filteredSales.length / PAGE_SIZE), 1);
    const paginatedSales = filteredSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const uniqueBanks = useMemo(() => [...new Set(sales.map(s => s.banco))].sort(), [sales]);
    const uniqueTypes = useMemo(() => [...new Set(sales.map(s => s.tipo_operacao))].sort(), [sales]);

    const statusConfig: Record<string, { label: string; cls: string }> = {
        aprovado:  { label: 'Aprovado',  cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
        pendente:  { label: 'Pendente',  cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
        recusado:  { label: 'Recusado',  cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
        cancelado: { label: 'Cancelado', cls: 'bg-slate-700/50 text-slate-500 border border-slate-700' },
    };

    const periodLabels: Record<Period, string> = {
        hoje: 'Hoje', semana: 'Semana', mes: 'Mês', ano: 'Ano', custom: 'Personalizado',
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <motion.div
            key="global"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6 pb-10"
        >
            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-2xl p-6 space-y-5">
                {/* Identity + period filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center text-blue-400">
                            <Globe className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Vendas Globais</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Consolidado da empresa</p>
                            <span className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                                <Building2 className="w-3 h-3" /> Empresa
                            </span>
                        </div>
                    </div>

                    {/* Period filter */}
                    <div className="flex flex-col gap-2 items-end">
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                            <Calendar className="w-4 h-4 text-slate-500 ml-2" />
                            {(['hoje', 'semana', 'mes', 'ano', 'custom'] as Period[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        period === p
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {periodLabels[p]}
                                </button>
                            ))}
                            <button
                                onClick={fetchData}
                                className="ml-1 p-1.5 text-slate-600 hover:text-slate-400 transition-colors"
                                title="Atualizar"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        {period === 'custom' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={e => setCustomStart(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-slate-500 text-xs">até</span>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={e => setCustomEnd(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Global goal progress bar */}
                {!globalGoal ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                        <Target className="w-3.5 h-3.5 flex-shrink-0" />
                        Sem meta global definida
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-400">Meta global: {fmt.format(kpis.metaMensal)}</span>
                            <span className={kpis.metaPct >= 100 ? 'text-emerald-400 font-bold' : 'text-white'}>
                                {kpis.metaPct.toFixed(1)}% atingida
                            </span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${kpis.metaPct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                    kpis.metaPct >= 100 ? 'bg-emerald-500' :
                                    kpis.metaPct >= 70  ? 'bg-blue-500' :
                                    kpis.metaPct >= 40  ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                            />
                        </div>
                    </div>
                )}

                {/* Key metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-2 border-t border-white/5">
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Faturado</p>
                        <p className="text-lg font-bold text-white">{fmt.format(kpis.faturamento)}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ticket Médio</p>
                        <p className="text-lg font-bold text-white">{fmt.format(kpis.ticketMedio)}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Vendas</p>
                        <p className="text-lg font-bold text-blue-400">{kpis.totalVendas}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Crescimento</p>
                        <p className={`text-lg font-bold ${kpis.crescimento >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {kpis.crescimento >= 0 ? '+' : ''}{kpis.crescimento.toFixed(1)}%
                        </p>
                    </div>
                    {period === 'mes' && (
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Meta/dia</p>
                            <p className="text-lg font-bold text-blue-400">{fmt.format(kpis.metaDiaria)}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── KPI CARDS ──────────────────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-[rgba(10,16,28,0.72)] border border-white/5 rounded-xl p-5 h-24 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Faturamento Total */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-blue-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Total</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{fmt.format(kpis.faturamento)}</p>
                        <p className="text-xs text-slate-600">{kpis.totalVendas} leads ganhos no período</p>
                    </div>

                    {/* Crescimento */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpis.crescimento >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                {kpis.crescimento >= 0
                                    ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    : <TrendingDown className="w-4 h-4 text-red-400" />}
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Crescimento</p>
                        </div>
                        <p className={`text-2xl font-bold ${kpis.crescimento >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {kpis.crescimento >= 0 ? '+' : ''}{kpis.crescimento.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-600">vs período anterior ({fmt.format(kpis.prevFaturamento)})</p>
                    </div>

                    {/* Meta Global */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Target className="w-4 h-4 text-amber-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meta Global</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{kpis.metaPct.toFixed(1)}%</p>
                        <p className="text-xs text-slate-600">
                            {globalGoal
                                ? kpis.faltamParaMeta === 0 ? '🎉 Meta atingida!' : `${fmt.format(kpis.faltamParaMeta)} restantes`
                                : 'Sem meta definida'}
                        </p>
                    </div>

                    {/* Ticket Médio */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <Award className="w-4 h-4 text-purple-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Médio</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{fmt.format(kpis.ticketMedio)}</p>
                        <p className="text-xs text-slate-600">por lead ganho</p>
                    </div>

                    {/* Banco Campeão */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-purple-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banco Campeão</p>
                        </div>
                        <p className="text-2xl font-bold text-white truncate">{kpis.bankData[0]?.name ?? '—'}</p>
                        <p className="text-xs text-slate-600">
                            {kpis.bankData[0] ? fmt.format(kpis.bankData[0].value) + ' em operações' : 'Nenhuma venda'}
                        </p>
                    </div>

                    {/* Total de Vendas */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-emerald-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Vendas</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{kpis.totalVendas}</p>
                        <p className="text-xs text-slate-600">leads ganhos no período</p>
                    </div>
                </div>
            )}

            {/* ── CHARTS ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Evolution chart */}
                <GlassCard className="lg:col-span-2 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">
                        Evolução de Faturamento — {periodLabels[period]}
                    </h3>
                    <SVGLineChart data={kpis.dailyData} color="#3b82f6" />
                </GlassCard>

                {/* Breakdowns */}
                <div className="flex flex-col gap-4">
                    <GlassCard className="rounded-xl p-5 space-y-4 flex-1">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Building2 className="w-3 h-3" /> Por Banco
                        </h3>
                        {kpis.bankData.length > 0 ? (
                            <div className="space-y-3">
                                {kpis.bankData.slice(0, 5).map((b, i) => (
                                    <BarChartRow
                                        key={i}
                                        name={b.name}
                                        value={b.value}
                                        maxValue={kpis.bankData[0].value}
                                        formatter={fmt.format.bind(fmt)}
                                        color="#8b5cf6"
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-600 italic">Sem dados</p>
                        )}
                    </GlassCard>

                    <GlassCard className="rounded-xl p-5 space-y-4 flex-1">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Briefcase className="w-3 h-3" /> Por Tipo de Operação
                        </h3>
                        {kpis.typeData.length > 0 ? (
                            <div className="space-y-3">
                                {kpis.typeData.slice(0, 5).map((t, i) => (
                                    <BarChartRow
                                        key={i}
                                        name={t.name}
                                        value={t.value}
                                        maxValue={kpis.typeData[0].value}
                                        formatter={fmt.format.bind(fmt)}
                                        color="#f59e0b"
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-600 italic">Sem dados</p>
                        )}
                    </GlassCard>
                </div>
            </div>

            {/* ── RANKING DE VENDEDORES ───────────────────────────────────────── */}
            {kpis.sellerRanking.length > 0 && (
                <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Ranking de Vendedores
                        <span className="text-xs font-normal text-slate-500">({periodLabels[period]})</span>
                    </h3>
                    <div className="space-y-3">
                        {kpis.sellerRanking.slice(0, 10).map((seller, idx) => (
                            <div key={seller.id} className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                    idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                                    idx === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' :
                                    'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}>
                                    {idx + 1}
                                </div>
                                <BarChartRow
                                    name={seller.name}
                                    value={seller.value}
                                    maxValue={kpis.sellerRanking[0].value}
                                    formatter={fmt.format.bind(fmt)}
                                    color={
                                        idx === 0 ? '#f59e0b' :
                                        idx === 1 ? '#94a3b8' :
                                        idx === 2 ? '#f97316' : '#3b82f6'
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── TABELA DETALHADA ────────────────────────────────────────────── */}
            <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl overflow-hidden">
                {/* Header + filters */}
                <div className="p-5 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        Operações Detalhadas
                        <span className="text-xs font-normal text-slate-500">({filteredSales.length})</span>
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={bankFilter}
                            onChange={e => { setBankFilter(e.target.value); setPage(1); }}
                            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Todos os bancos</option>
                            {uniqueBanks.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <select
                            value={typeFilter}
                            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Todos os tipos</option>
                            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Todos os status</option>
                            <option value="aprovado">Aprovado</option>
                            <option value="pendente">Pendente</option>
                            <option value="recusado">Recusado</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800/60 bg-slate-950/30">
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vendedor</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Banco</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fechamento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {paginatedSales.length > 0 ? (
                                paginatedSales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-slate-900/30 transition-colors">
                                        <td className="px-5 py-3.5 text-sm text-slate-400">
                                            {sellers.find(s => s.id === sale.seller_id)?.name ?? '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-white font-medium">
                                            {sale.client_name || '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-slate-400">{sale.banco}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-400">{sale.tipo_operacao}</td>
                                        <td className="px-5 py-3.5 text-sm font-bold text-emerald-400 text-right">
                                            {fmt.format(sale.valor)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusConfig[sale.status]?.cls ?? 'text-slate-500'}`}>
                                                {statusConfig[sale.status]?.label ?? sale.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-500">
                                            {new Date(sale.data_fechamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500 italic text-sm">
                                        {loading ? 'Carregando...' : 'Nenhuma operação encontrada para os filtros selecionados.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Exibindo {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredSales.length)} de {filteredSales.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(p - 1, 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                                .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                                    if (idx > 0 && (n as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                                    acc.push(n);
                                    return acc;
                                }, [])
                                .map((n, i) => (
                                    n === '...'
                                        ? <span key={i} className="px-1 text-slate-600 text-xs">…</span>
                                        : <button
                                            key={i}
                                            onClick={() => setPage(n as number)}
                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                                page === n
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            }`}
                                        >
                                            {n}
                                        </button>
                                ))}
                            <button
                                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default GlobalSales360;
