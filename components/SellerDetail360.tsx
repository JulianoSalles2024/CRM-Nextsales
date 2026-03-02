import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ArrowLeft, DollarSign, TrendingUp, TrendingDown, Building2,
    Briefcase, Clock, Target, Star, AlertTriangle,
    ChevronLeft, ChevronRight, RefreshCw, Award, Zap,
    Filter, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useActiveGoal } from '../src/hooks/useActiveGoal';
import { useAuth } from '../src/features/auth/AuthContext';
import type { User } from '../types';
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
    data_fechamento: string; // YYYY-MM-DD
    created_at: string;
    company_id?: string;
}

interface SellerProfileData {
    meta_mensal: number;
    name: string;
    email: string;
    role: string;
    company_id: string;
}

type Period = 'hoje' | 'semana' | 'mes' | 'ano' | 'custom';

interface SellerDetail360Props {
    seller: User;
    onBack: () => void;
}

// ── Date Utilities ────────────────────────────────────────────────────────────

function getDateRange(period: Period): { start: string; end: string } {
    const now = new Date();
    let start: Date;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
        case 'hoje':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'semana': {
            start = new Date(now);
            start.setDate(now.getDate() - 6);
            break;
        }
        case 'ano':
            start = new Date(now.getFullYear(), 0, 1);
            break;
        case 'mes':
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
}

function getPrevDateRange(period: Period): { start: string; end: string } {
    const now = new Date();
    switch (period) {
        case 'hoje': {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            const s = d.toISOString().split('T')[0];
            return { start: s, end: s };
        }
        case 'semana': {
            const prevEnd = new Date(now);
            prevEnd.setDate(now.getDate() - 7);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevEnd.getDate() - 6);
            return {
                start: prevStart.toISOString().split('T')[0],
                end: prevEnd.toISOString().split('T')[0],
            };
        }
        case 'ano': {
            const start = new Date(now.getFullYear() - 1, 0, 1);
            const end = new Date(now.getFullYear() - 1, 11, 31);
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            };
        }
        case 'mes':
        default: {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            };
        }
    }
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────

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
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map((pct, i) => (
                    <line
                        key={i}
                        x1={padX} y1={toY(maxVal * pct)}
                        x2={W - padX} y2={toY(maxVal * pct)}
                        stroke="#1e293b" strokeWidth="1"
                    />
                ))}
                {/* Area */}
                <polygon points={areaPoints} fill="url(#areaGrad)" />
                {/* Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
                {/* Dots on significant points */}
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

const SellerDetail360: React.FC<SellerDetail360Props> = ({ seller, onBack }) => {
    const [period, setPeriod] = useState<Period>('mes');
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState<SaleRecord[]>([]);
    const [prevSales, setPrevSales] = useState<{ valor: number; status: string }[]>([]);
    const [profile, setProfile] = useState<SellerProfileData | null>(null);
    const [teamSales, setTeamSales] = useState<{ seller_id: string; valor: number }[]>([]);
    const [activeTab, setActiveTab] = useState<'individual' | 'team'>('individual');
    const [individualWonLeads, setIndividualWonLeads] = useState<{ value: number }[]>([]);
    const [prevIndividualWonLeads, setPrevIndividualWonLeads] = useState<{ value: number }[]>([]);
    const [teamWonLeads, setTeamWonLeads] = useState<{ value: number }[]>([]);
    const [prevTeamWonLeads, setPrevTeamWonLeads] = useState<{ value: number }[]>([]);
    const [teamGoal, setTeamGoal] = useState<{ targetValue: number } | null>(null);
    const [teamGoalLoading, setTeamGoalLoading] = useState(true);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const { companyId } = useAuth();

    const { activeGoal, loading: goalLoading } = useActiveGoal(companyId, seller.id);

    // Table state
    const [page, setPage] = useState(1);
    const [bankFilter, setBankFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const PAGE_SIZE = 10;

    // ── Data Fetching ──────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        if (!supabase) { setLoading(false); return; }

        // Custom period: wait until both dates are filled
        if (period === 'custom' && (!customStart || !customEnd)) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const { start, end } = period === 'custom'
            ? { start: customStart, end: customEnd }
            : getDateRange(period);
        const { start: prevStart, end: prevEnd } = period === 'custom'
            ? { start: customStart, end: customEnd } // no "prev" concept for custom → growth = 0
            : getPrevDateRange(period as Exclude<Period, 'custom'>);

        const today = new Date().toISOString().split('T')[0];

        const [
            curRes, prevRes, profileRes, teamRes,
            indWonRes, prevIndWonRes,
            teamWonRes, prevTeamWonRes,
            teamGoalRes,
        ] = await Promise.all([
            // ── Sales existentes (sem alteração) ──────────────────────────────
            supabase
                .from('sales')
                .select('*')
                .eq('seller_id', seller.id)
                .gte('data_fechamento', start)
                .lte('data_fechamento', end)
                .order('data_fechamento', { ascending: true }),

            supabase
                .from('sales')
                .select('valor, status')
                .eq('seller_id', seller.id)
                .gte('data_fechamento', prevStart)
                .lte('data_fechamento', prevEnd),

            supabase
                .from('profiles')
                .select('meta_mensal, name, email, role, company_id')
                .eq('id', seller.id)
                .single(),

            supabase
                .from('sales')
                .select('seller_id, valor')
                .gte('data_fechamento', start)
                .lte('data_fechamento', end),

            // ── Individual: leads GANHO do vendedor — período atual ───────
            // Filtra por won_at: campo preenchido com now() ao mover para coluna 'won'.
            supabase
                .from('leads')
                .select('value')
                .eq('owner_id', seller.id)
                .eq('company_id', companyId)
                .eq('status', 'GANHO')
                .eq('is_archived', false)
                .is('deleted_at', null)
                .gte('won_at', start)
                .lte('won_at', end + 'T23:59:59'),

            // ── Individual: leads GANHO do vendedor — período anterior ─────
            supabase
                .from('leads')
                .select('value')
                .eq('owner_id', seller.id)
                .eq('company_id', companyId)
                .eq('status', 'GANHO')
                .eq('is_archived', false)
                .is('deleted_at', null)
                .gte('won_at', prevStart)
                .lte('won_at', prevEnd + 'T23:59:59'),

            // ── Time: todos leads GANHO da empresa — período atual ────────
            supabase
                .from('leads')
                .select('value')
                .eq('company_id', companyId)
                .eq('status', 'GANHO')
                .eq('is_archived', false)
                .is('deleted_at', null)
                .gte('won_at', start)
                .lte('won_at', end + 'T23:59:59'),

            // ── Time: todos leads GANHO da empresa — período anterior ──────
            supabase
                .from('leads')
                .select('value')
                .eq('company_id', companyId)
                .eq('status', 'GANHO')
                .eq('is_archived', false)
                .is('deleted_at', null)
                .gte('won_at', prevStart)
                .lte('won_at', prevEnd + 'T23:59:59'),

            // ── Meta global (user_id IS NULL) — query direta ──────────────
            supabase
                .from('goals')
                .select('id, goal_value, goal_type')
                .eq('company_id', companyId)
                .is('user_id', null)
                .eq('is_active', true)
                .lte('start_date', today)
                .gte('end_date', today)
                .order('created_at', { ascending: false })
                .limit(1),
        ]);

        setSales((curRes.data as SaleRecord[]) ?? []);
        setPrevSales((prevRes.data as SaleRecord[]) ?? []);
        setProfile((profileRes.data as SellerProfileData) ?? null);
        setTeamSales((teamRes.data as { seller_id: string; valor: number }[]) ?? []);

        setIndividualWonLeads((indWonRes.data as { value: number }[]) ?? []);
        setPrevIndividualWonLeads((prevIndWonRes.data as { value: number }[]) ?? []);
        setTeamWonLeads((teamWonRes.data as { value: number }[]) ?? []);
        setPrevTeamWonLeads((prevTeamWonRes.data as { value: number }[]) ?? []);

        const rawTeamGoal = (teamGoalRes.data as { id: string; goal_value: number; goal_type: string }[] | null)?.[0] ?? null;
        setTeamGoal(rawTeamGoal ? { targetValue: rawTeamGoal.goal_value ?? 0 } : null);
        setTeamGoalLoading(false);

        console.log('[SellerDetail360] indWonLeads:', indWonRes.data, '| erro:', indWonRes.error);
        console.log('[SellerDetail360] teamWonLeads:', teamWonRes.data, '| erro:', teamWonRes.error);
        console.log('[SellerDetail360] teamGoal:', rawTeamGoal, '| erro:', teamGoalRes.error);
        setPage(1);
        setLoading(false);
    }, [seller.id, period, companyId, customStart, customEnd]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── KPI Computations ──────────────────────────────────────────────────────

    const kpis = useMemo(() => {
        const total = sales.length;
        const faturamento = individualWonLeads.reduce((s, r) => s + r.value, 0);
        const prevFaturamento = prevIndividualWonLeads.reduce((s, r) => s + r.value, 0);
        const crescimento = prevFaturamento > 0
            ? ((faturamento - prevFaturamento) / prevFaturamento) * 100
            : 0;

        const aprovados = sales.filter(s => s.status === 'aprovado').length;
        const conversao = total > 0 ? (aprovados / total) * 100 : 0;

        // Average closing time (created_at → data_fechamento)
        const closingTimes = sales
            .filter(s => s.created_at)
            .map(s => {
                const diff = new Date(s.data_fechamento).getTime() - new Date(s.created_at).getTime();
                return diff / (1000 * 60 * 60 * 24); // days
            })
            .filter(d => d >= 0);
        const tempoMedio = closingTimes.length > 0
            ? closingTimes.reduce((a, b) => a + b, 0) / closingTimes.length
            : 0;

        // Bank breakdown
        const bankMap = new Map<string, number>();

sales.forEach(s => {
  const banco = s.banco ?? 'Sem Banco';
  const valor = s.valor ?? 0;

  const current = bankMap.get(banco) ?? 0;
  bankMap.set(banco, current + valor);
});

        const bankData = [...bankMap.entries()].sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));

        // Operation type breakdown
        const typeMap = new Map<string, number>();
        sales.forEach(s => typeMap.set(s.tipo_operacao, (typeMap.get(s.tipo_operacao) ?? 0) + s.valor));
        const typeData = [...typeMap.entries()].sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));

        // Só usa a meta se ela for realmente individual (userId = seller.id).
        // useActiveGoal faz fallback para global — esse fallback não deve aparecer na aba Individual.
        const metaMensal = activeGoal?.userId === seller.id ? (activeGoal?.targetValue ?? 0) : 0;
        const metaPct = metaMensal > 0 ? Math.min((faturamento / metaMensal) * 100, 100) : 0;
        const faltamParaMeta = Math.max(metaMensal - faturamento, 0);
        const ticketMedio = total > 0 ? faturamento / total : 0;

        // Days remaining in month
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = Math.max(lastDay - now.getDate() + 1, 1);
        const metaDiaria = period === 'mes' ? faltamParaMeta / daysRemaining : 0;

        // Team ranking
        const teamTotals = new Map<string, number>();
        teamSales.forEach(s => teamTotals.set(s.seller_id, (teamTotals.get(s.seller_id) ?? 0) + s.valor));
        const sorted = [...teamTotals.entries()].sort(([, a], [, b]) => b - a);
        const rankingPos = sorted.findIndex(([id]) => id === seller.id) + 1;
        const rankingTotal = sorted.length;

        // Performance score
        const metaPts = (metaPct / 100) * 50;
        const aprovPts = (conversao / 100) * 30;
        const volPts = Math.min(total / 10, 1) * 20;
        const score = Math.round(metaPts + aprovPts + volPts);

        // Daily evolution data
        const dailyMap = new Map<string, number>();
        sales.forEach(s => {
            const d = s.data_fechamento;
            dailyMap.set(d, (dailyMap.get(d) ?? 0) + s.valor);
        });
        const dailyData = [...dailyMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => ({
                label: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                value,
            }));

        return {
            faturamento, prevFaturamento, crescimento,
            total, aprovados, conversao, tempoMedio,
            bankData, typeData,
            metaMensal, metaPct, faltamParaMeta, ticketMedio,
            metaDiaria, daysRemaining,
            rankingPos, rankingTotal,
            score, dailyData,
        };
    }, [sales, prevSales, profile, teamSales, period, seller.id, activeGoal, individualWonLeads, prevIndividualWonLeads]);

    // ── KPI Time ──────────────────────────────────────────────────────────────

    const kpisTeam = useMemo(() => {
        const faturamento = teamWonLeads.reduce((s, r) => s + r.value, 0);
        const prevFaturamento = prevTeamWonLeads.reduce((s, r) => s + r.value, 0);
        const crescimento = prevFaturamento > 0
            ? ((faturamento - prevFaturamento) / prevFaturamento) * 100
            : 0;
        const metaMensal = teamGoal?.targetValue ?? 0;
        const metaPct = metaMensal > 0 ? Math.min((faturamento / metaMensal) * 100, 100) : 0;
        const faltamParaMeta = Math.max(metaMensal - faturamento, 0);
        const ticketMedio = teamWonLeads.length > 0 ? faturamento / teamWonLeads.length : 0;
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = Math.max(lastDay - now.getDate() + 1, 1);
        const metaDiaria = period === 'mes' ? faltamParaMeta / daysRemaining : 0;
        return { faturamento, prevFaturamento, crescimento, metaMensal, metaPct, faltamParaMeta, ticketMedio, metaDiaria };
    }, [teamWonLeads, prevTeamWonLeads, teamGoal, period]);

    // ── KPI ativo (Individual ou Time) ────────────────────────────────────────

    const activeFinancialKpis = activeTab === 'individual'
        ? { faturamento: kpis.faturamento, prevFaturamento: kpis.prevFaturamento, crescimento: kpis.crescimento, metaMensal: kpis.metaMensal, metaPct: kpis.metaPct, faltamParaMeta: kpis.faltamParaMeta, ticketMedio: kpis.ticketMedio, metaDiaria: kpis.metaDiaria }
        : kpisTeam;

    // ── Table Filtering & Pagination ──────────────────────────────────────────

    const filteredSales = useMemo(() => sales.filter(s =>
        (!bankFilter || s.banco === bankFilter) &&
        (!typeFilter || s.tipo_operacao === typeFilter) &&
        (!statusFilter || s.status === statusFilter)
    ), [sales, bankFilter, typeFilter, statusFilter]);

    const totalPages = Math.max(Math.ceil(filteredSales.length / PAGE_SIZE), 1);
    const paginatedSales = filteredSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const uniqueBanks = useMemo(() => [...new Set(sales.map(s => s.banco))].sort(), [sales]);
    const uniqueTypes = useMemo(() => [...new Set(sales.map(s => s.tipo_operacao))].sort(), [sales]);

    // ── Status badge ──────────────────────────────────────────────────────────

    const statusConfig: Record<string, { label: string; cls: string }> = {
        aprovado:  { label: 'Aprovado',  cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
        pendente:  { label: 'Pendente',  cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
        recusado:  { label: 'Recusado',  cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
        cancelado: { label: 'Cancelado', cls: 'bg-slate-700/50 text-slate-500 border border-slate-700' },
    };

    const periodLabels: Record<Period, string> = {
        hoje: 'Hoje', semana: 'Semana', mes: 'Mês', ano: 'Ano', custom: 'Personalizado'
    };

    // ── Helpers de meta por aba ───────────────────────────────────────────────

    const currentGoalLoading = activeTab === 'individual' ? goalLoading : teamGoalLoading;
    // Na aba Individual, só exibe meta se for realmente individual (userId = seller.id).
    // Se activeGoal.userId for null significa que useActiveGoal retornou o fallback global — não exibir.
    const individualGoal = activeGoal?.userId === seller.id ? activeGoal : null;
    const currentGoal    = activeTab === 'individual' ? individualGoal : teamGoal;
    const noMetaLabel        = activeTab === 'individual'
        ? 'Sem meta individual definida'
        : 'Sem meta global definida';

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6 pb-10"
        >
            {/* ── Back button ── */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium w-fit"
            >
                <ArrowLeft className="w-4 h-4" />
                Voltar à lista
            </button>

            {/* ── Abas Individual / Time ── */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
                {(['individual', 'team'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            activeTab === tab
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        {tab === 'individual' ? 'Individual' : 'Time'}
                    </button>
                ))}
            </div>

            {/* ── HEADER ── */}
            <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-2xl p-6 space-y-5">
                {/* Top row: identity + period filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {seller.avatarUrl ? (
                            <img src={seller.avatarUrl} alt="" className="w-14 h-14 rounded-full border-2 border-slate-700 object-cover" />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-bold">
                                {seller.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-white">{seller.name}</h2>
                            <p className="text-sm text-slate-500 mt-0.5">{seller.email}</p>
                            <span className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                                <Star className="w-3 h-3" /> Vendedor
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

                {/* Meta progress — tab-aware */}
                {currentGoalLoading ? (
                    <div className="space-y-2">
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden animate-pulse" />
                        <div className="h-2 w-32 bg-slate-800 rounded animate-pulse" />
                    </div>
                ) : !currentGoal ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                        <Target className="w-3.5 h-3.5 flex-shrink-0" />
                        {noMetaLabel}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-400">Meta: {fmt.format(activeFinancialKpis.metaMensal)}</span>
                            <span className={activeFinancialKpis.metaPct >= 100 ? 'text-emerald-400 font-bold' : 'text-white'}>
                                {activeFinancialKpis.metaPct.toFixed(1)}% atingida
                            </span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${activeFinancialKpis.metaPct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                    activeFinancialKpis.metaPct >= 100 ? 'bg-emerald-500' :
                                    activeFinancialKpis.metaPct >= 70  ? 'bg-blue-500' :
                                    activeFinancialKpis.metaPct >= 40  ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                            />
                        </div>
                    </div>
                )}

                {/* Key metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pt-2 border-t border-white/5">
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Faturado</p>
                        <p className="text-lg font-bold text-white">{fmt.format(activeFinancialKpis.faturamento)}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ticket Médio</p>
                        <p className="text-lg font-bold text-white">{fmt.format(activeFinancialKpis.ticketMedio)}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ranking</p>
                        <p className="text-lg font-bold text-amber-400">
                            {kpis.rankingPos > 0 ? `${kpis.rankingPos}º/${kpis.rankingTotal}` : '—'}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Faltam</p>
                        <p className={`text-lg font-bold ${activeFinancialKpis.faltamParaMeta === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {activeFinancialKpis.faltamParaMeta === 0 ? '🎉 Meta!' : fmt.format(activeFinancialKpis.faltamParaMeta)}
                        </p>
                    </div>
                    {period === 'mes' && (
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Meta/dia</p>
                            <p className="text-lg font-bold text-blue-400">{fmt.format(activeFinancialKpis.metaDiaria)}</p>
                        </div>
                    )}
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Score</p>
                        <div className="flex items-center gap-2">
                            <p className={`text-lg font-bold ${
                                kpis.score >= 80 ? 'text-emerald-400' :
                                kpis.score >= 60 ? 'text-blue-400' :
                                kpis.score >= 40 ? 'text-amber-400' : 'text-red-400'
                            }`}>{kpis.score}</p>
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI CARDS ── */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-[rgba(10,16,28,0.72)] border border-white/5 rounded-xl p-5 h-24 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* KPI 1 – Faturamento */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-blue-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{fmt.format(activeFinancialKpis.faturamento)}</p>
                        <p className="text-xs text-slate-600">{kpis.total} operações no período</p>
                    </div>

                    {/* KPI 2 – Crescimento */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeFinancialKpis.crescimento >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                {activeFinancialKpis.crescimento >= 0
                                    ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    : <TrendingDown className="w-4 h-4 text-red-400" />}
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Crescimento</p>
                        </div>
                        <p className={`text-2xl font-bold ${activeFinancialKpis.crescimento >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {activeFinancialKpis.crescimento >= 0 ? '+' : ''}{activeFinancialKpis.crescimento.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-600">vs período anterior ({fmt.format(activeFinancialKpis.prevFaturamento)})</p>
                    </div>

                    {/* KPI 3 – Banco campeão */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-purple-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banco Campeão</p>
                        </div>
                        <p className="text-2xl font-bold text-white truncate">{kpis.bankData[0]?.name ?? '—'}</p>
                        <p className="text-xs text-slate-600">
                            {kpis.bankData[0] ? fmt.format(kpis.bankData[0].value) + ' em vendas' : 'Nenhuma venda'}
                        </p>
                    </div>

                    {/* KPI 4 – Tipo campeão */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                <Briefcase className="w-4 h-4 text-orange-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo Mais Vendido</p>
                        </div>
                        <p className="text-2xl font-bold text-white truncate">{kpis.typeData[0]?.name ?? '—'}</p>
                        <p className="text-xs text-slate-600">
                            {kpis.typeData[0] ? fmt.format(kpis.typeData[0].value) + ' em vendas' : 'Nenhuma venda'}
                        </p>
                    </div>

                    {/* KPI 5 – Conversão */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Target className="w-4 h-4 text-emerald-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taxa de Conversão</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">{kpis.conversao.toFixed(1)}%</p>
                        <p className="text-xs text-slate-600">{kpis.aprovados} aprovados de {kpis.total}</p>
                    </div>

                    {/* KPI 6 – Tempo médio */}
                    <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600/30 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tempo Médio</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{kpis.tempoMedio.toFixed(0)} dias</p>
                        <p className="text-xs text-slate-600">do cadastro ao fechamento</p>
                    </div>
                </div>
            )}

            {/* ── CHARTS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Evolution chart */}
                <GlassCard className="lg:col-span-2 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">
                        Evolução de Vendas — {periodLabels[period]}
                    </h3>
                    <SVGLineChart data={kpis.dailyData} color="#3b82f6" />
                </GlassCard>

                {/* Breakdowns */}
                <div className="flex flex-col gap-4">
                    {/* By bank */}
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

                    {/* By operation type */}
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

            {/* ── TABELA DETALHADA ── */}
            <div className="bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-white/5 rounded-xl overflow-hidden">
                {/* Table header + filters */}
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
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500 italic text-sm">
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
                                ))
                            }
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

export default SellerDetail360;
