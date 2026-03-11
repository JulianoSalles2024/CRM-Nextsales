import { safeError } from '@/src/utils/logger';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, User, Trophy, Plus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User as UserType, Id } from '@/types';
import SellerDetail360 from './SellerDetail360';
import GlobalSales360 from './GlobalSales360';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';

interface Painel360Props {
    users: UserType[];
    onSelectSeller?: (seller: UserType) => void;
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// ── Score Tab ──────────────────────────────────────────────────────────────────

type ScorePeriod = 'mes_atual' | 'mes_especifico' | 'trimestre' | 'ano' | 'custom';
type RankingType = 'faturamento' | 'crescimento' | 'meta' | 'ticket_medio' | 'num_vendas' | 'consistencia';

interface SellerScore {
    id: string;
    name: string;
    avatarUrl?: string;
    faturamento: number;
    prevFaturamento: number;
    crescimento: number;
    numVendas: number;
    ticketMedio: number;
    metaTarget: number;
    metaPct: number;
    bateuMeta: boolean;
    maiorCrescimento: boolean;
    consistencia: number;
}

interface ScoreTabProps {
    sellers: UserType[];
    onSelectSeller: (s: UserType) => void;
    companyId: string | null;
}

function toScoreLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getScoreRange(
    period: ScorePeriod, selMonth: number, selYear: number,
    cStart: string, cEnd: string
): { start: string; end: string } {
    const n = new Date();
    const y = n.getFullYear(), mo = n.getMonth(), d = n.getDate();
    switch (period) {
        case 'mes_atual':
            return { start: new Date(y, mo, 1, 0, 0, 0, 0).toISOString(), end: new Date(y, mo, d, 23, 59, 59, 999).toISOString() };
        case 'mes_especifico':
            return { start: new Date(selYear, selMonth - 1, 1, 0, 0, 0, 0).toISOString(), end: new Date(selYear, selMonth, 0, 23, 59, 59, 999).toISOString() };
        case 'trimestre': {
            const q = Math.floor(mo / 3);
            return { start: new Date(y, q * 3, 1, 0, 0, 0, 0).toISOString(), end: new Date(y, mo, d, 23, 59, 59, 999).toISOString() };
        }
        case 'ano':
            return { start: new Date(y, 0, 1, 0, 0, 0, 0).toISOString(), end: new Date(y, mo, d, 23, 59, 59, 999).toISOString() };
        case 'custom':
            return { start: new Date(cStart + 'T00:00:00').toISOString(), end: new Date(cEnd + 'T23:59:59.999').toISOString() };
    }
}

function getPrevScoreRange(
    period: ScorePeriod, selMonth: number, selYear: number,
    cStart: string, cEnd: string
): { start: string; end: string } {
    const n = new Date();
    const y = n.getFullYear(), mo = n.getMonth();
    switch (period) {
        case 'mes_atual':
            return { start: new Date(y, mo - 1, 1, 0, 0, 0, 0).toISOString(), end: new Date(y, mo, 0, 23, 59, 59, 999).toISOString() };
        case 'mes_especifico':
            return { start: new Date(selYear, selMonth - 2, 1, 0, 0, 0, 0).toISOString(), end: new Date(selYear, selMonth - 1, 0, 23, 59, 59, 999).toISOString() };
        case 'trimestre': {
            const q = Math.floor(mo / 3);
            return { start: new Date(y, (q - 1) * 3, 1, 0, 0, 0, 0).toISOString(), end: new Date(y, q * 3, 0, 23, 59, 59, 999).toISOString() };
        }
        case 'ano':
            return { start: new Date(y - 1, 0, 1, 0, 0, 0, 0).toISOString(), end: new Date(y - 1, 11, 31, 23, 59, 59, 999).toISOString() };
        case 'custom':
            return { start: new Date(cStart + 'T00:00:00').toISOString(), end: new Date(cEnd + 'T23:59:59.999').toISOString() };
    }
}

function getRankValue(s: SellerScore, type: RankingType): number {
    switch (type) {
        case 'faturamento':  return s.faturamento;
        case 'crescimento':  return s.crescimento;
        case 'meta':         return s.metaPct;
        case 'ticket_medio': return s.ticketMedio;
        case 'num_vendas':   return s.numVendas;
        case 'consistencia': return s.consistencia;
    }
}

function getDisplayValue(s: SellerScore, type: RankingType): string {
    switch (type) {
        case 'faturamento':  return fmt.format(s.faturamento);
        case 'crescimento':  return `${s.crescimento >= 0 ? '+' : ''}${s.crescimento.toFixed(1)}%`;
        case 'meta':         return `${s.metaPct.toFixed(1)}%`;
        case 'ticket_medio': return fmt.format(s.ticketMedio);
        case 'num_vendas':   return `${s.numVendas} venda${s.numVendas !== 1 ? 's' : ''}`;
        case 'consistencia': return fmt.format(s.consistencia);
    }
}

const rankTypeLabel: Record<RankingType, string> = {
    faturamento: 'Faturamento', crescimento: 'Crescimento', meta: 'Meta %',
    ticket_medio: 'Ticket Médio', num_vendas: 'Nº Vendas', consistencia: 'Consistência',
};

const ScoreTab: React.FC<ScoreTabProps> = ({ sellers, onSelectSeller, companyId }) => {
    const now = new Date();
    const [period, setPeriod] = useState<ScorePeriod>('mes_atual');
    const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
    const [selYear, setSelYear] = useState(now.getFullYear());
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [rankingType, setRankingType] = useState<RankingType>('faturamento');
    const [scoreData, setScoreData] = useState<SellerScore[]>([]);
    const [loading, setLoading] = useState(true);

    const vendedores = useMemo(() => sellers.filter(u => u.role === 'Vendedor'), [sellers]);

    const fetchData = useCallback(async () => {
        if (!companyId || vendedores.length === 0) { setLoading(false); return; }
        if (period === 'custom' && (!customStart || !customEnd)) { setLoading(false); return; }
        setLoading(true);

        const n = new Date();
        const { start, end } = getScoreRange(period, selMonth, selYear, customStart, customEnd);
        const { start: prevStart, end: prevEnd } = getPrevScoreRange(period, selMonth, selYear, customStart, customEnd);
        const today = toScoreLocal(n);
        const consEnd = new Date(n.getFullYear(), n.getMonth(), 0, 23, 59, 59, 999).toISOString();
        const consStart = new Date(n.getFullYear(), n.getMonth() - 3, 1, 0, 0, 0, 0).toISOString();

        const [curRes, prevRes, goalsRes, consRes] = await Promise.all([
            supabase.from('leads').select('owner_id, value')
                .eq('company_id', companyId).eq('status', 'GANHO')
                .eq('is_archived', false).is('deleted_at', null)
                .gte('won_at', start).lte('won_at', end),

            supabase.from('leads').select('owner_id, value')
                .eq('company_id', companyId).eq('status', 'GANHO')
                .eq('is_archived', false).is('deleted_at', null)
                .gte('won_at', prevStart).lte('won_at', prevEnd),

            supabase.from('goals').select('user_id, goal_value')
                .eq('company_id', companyId).eq('is_active', true)
                .not('user_id', 'is', null)
                .lte('start_date', today).gte('end_date', today),

            supabase.from('leads').select('owner_id, value, won_at')
                .eq('company_id', companyId).eq('status', 'GANHO')
                .eq('is_archived', false).is('deleted_at', null)
                .gte('won_at', consStart).lte('won_at', consEnd),
        ]);

        const curLeads  = (curRes.data  ?? []) as { owner_id: string | null; value: number }[];
        const prevLeads = (prevRes.data ?? []) as { owner_id: string | null; value: number }[];
        const goals     = (goalsRes.data ?? []) as { user_id: string; goal_value: number }[];
        const consLeads = (consRes.data ?? []) as { owner_id: string | null; value: number; won_at: string }[];

        const curMap      = new Map<string, number>();
        const curCountMap = new Map<string, number>();
        curLeads.forEach(l => {
            if (!l.owner_id) return;
            curMap.set(l.owner_id, (curMap.get(l.owner_id) ?? 0) + Number(l.value || 0));
            curCountMap.set(l.owner_id, (curCountMap.get(l.owner_id) ?? 0) + 1);
        });

        const prevMap = new Map<string, number>();
        prevLeads.forEach(l => {
            if (!l.owner_id) return;
            prevMap.set(l.owner_id, (prevMap.get(l.owner_id) ?? 0) + Number(l.value || 0));
        });

        const goalMap = new Map<string, number>();
        goals.forEach(g => { if (g.user_id) goalMap.set(g.user_id, g.goal_value ?? 0); });

        const consBySellerMonth = new Map<string, Map<string, number>>();
        consLeads.forEach(l => {
            if (!l.owner_id || !l.won_at) return;
            const mKey = (l.won_at as string).substring(0, 7);
            if (!consBySellerMonth.has(l.owner_id)) consBySellerMonth.set(l.owner_id, new Map());
            const mMap = consBySellerMonth.get(l.owner_id)!;
            mMap.set(mKey, (mMap.get(mKey) ?? 0) + Number(l.value || 0));
        });

        let maxGrowthId = '';
        let maxGrowth   = -Infinity;

        const rawScores: SellerScore[] = vendedores.map(u => {
            const faturamento    = curMap.get(u.id) ?? 0;
            const prevFaturamento = prevMap.get(u.id) ?? 0;
            const crescimento    = prevFaturamento > 0 ? ((faturamento - prevFaturamento) / prevFaturamento) * 100 : 0;
            const numVendas      = curCountMap.get(u.id) ?? 0;
            const ticketMedio    = numVendas > 0 ? faturamento / numVendas : 0;
            const metaTarget     = goalMap.get(u.id) ?? 0;
            const metaPct        = metaTarget > 0 ? (faturamento / metaTarget) * 100 : 0;
            const bateuMeta      = metaTarget > 0 && faturamento >= metaTarget;
            const monthTotals    = consBySellerMonth.get(u.id);
            const consistencia   = monthTotals
                ? Array.from(monthTotals.values()).reduce((a, b) => a + b, 0) / monthTotals.size
                : 0;

            if (faturamento > 0 && crescimento > maxGrowth) {
                maxGrowth   = crescimento;
                maxGrowthId = u.id;
            }

            return {
                id: u.id, name: u.name, avatarUrl: u.avatarUrl,
                faturamento, prevFaturamento, crescimento,
                numVendas, ticketMedio, metaTarget, metaPct, bateuMeta,
                maiorCrescimento: false, consistencia,
            };
        });

        rawScores.forEach(s => { s.maiorCrescimento = s.id === maxGrowthId && maxGrowth > 0; });
        setScoreData(rawScores);
        setLoading(false);
    }, [companyId, vendedores, period, selMonth, selYear, customStart, customEnd]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const sortedScores = useMemo(() => [...scoreData].sort((a, b) =>
        getRankValue(b, rankingType) - getRankValue(a, rankingType)
    ), [scoreData, rankingType]);

    const champion       = sortedScores[0] ?? null;
    const maxRankVal     = champion ? Math.abs(getRankValue(champion, rankingType)) : 1;
    const totalVendido   = scoreData.reduce((s, r) => s + r.faturamento, 0);
    const prevTotal      = scoreData.reduce((s, r) => s + r.prevFaturamento, 0);
    const crescGeral     = prevTotal > 0 ? ((totalVendido - prevTotal) / prevTotal) * 100 : 0;
    const mediaVendedor  = scoreData.length > 0 ? totalVendido / scoreData.length : 0;
    const totalVendas    = scoreData.reduce((s, r) => s + r.numVendas, 0);

    const getPeriodLabel = (): string => {
        switch (period) {
            case 'mes_atual': return 'Mês atual';
            case 'mes_especifico': return `${String(selMonth).padStart(2, '0')}/${selYear}`;
            case 'trimestre': { const q = Math.floor(new Date().getMonth() / 3) + 1; return `T${q}/${new Date().getFullYear()}`; }
            case 'ano': return `Ano ${new Date().getFullYear()}`;
            case 'custom': return customStart && customEnd ? `${customStart} → ${customEnd}` : 'Personalizado';
        }
    };

    return (
        <div className="space-y-6">
            {/* ── CONTEXT BAR ─────────────────────────────────────────────── */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Period */}
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Período</label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {([
                                { v: 'mes_atual',      l: 'Mês atual'     },
                                { v: 'mes_especifico', l: 'Mês'           },
                                { v: 'trimestre',      l: 'Trimestre'     },
                                { v: 'ano',            l: 'Ano'           },
                                { v: 'custom',         l: 'Personalizado' },
                            ] as { v: ScorePeriod; l: string }[]).map(({ v, l }) => (
                                <button key={v} onClick={() => setPeriod(v)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === v ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                        {period === 'mes_especifico' && (
                            <div className="flex items-center gap-2 mt-1">
                                <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500">
                                    {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                                <input type="number" value={selYear} onChange={e => setSelYear(Number(e.target.value))}
                                    min={2020} max={2099}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 w-20" />
                            </div>
                        )}
                        {period === 'custom' && (
                            <div className="flex items-center gap-2 mt-1">
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" />
                                <span className="text-slate-500 text-xs">até</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" />
                            </div>
                        )}
                    </div>

                    {/* Ranking type */}
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Ranking</label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {([
                                { v: 'faturamento',  l: 'Faturamento'  },
                                { v: 'crescimento',  l: 'Crescimento'  },
                                { v: 'meta',         l: 'Meta %'       },
                                { v: 'ticket_medio', l: 'Ticket Médio' },
                                { v: 'num_vendas',   l: 'Nº Vendas'    },
                                { v: 'consistencia', l: 'Consistência' },
                            ] as { v: RankingType; l: string }[]).map(({ v, l }) => (
                                <button key={v} onClick={() => setRankingType(v)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rankingType === v ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                </div>
            ) : sortedScores.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                        <Trophy className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold">Nenhum vendedor cadastrado</h4>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">Convide membros para a equipe para ver o ranking aqui.</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* ── HERO (Campeão do Período) ────────────────────────── */}
                    {champion && (
                        <div className="relative bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] border border-blue-500/20 rounded-2xl p-6 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-blue-600/5 pointer-events-none" />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl font-bold overflow-hidden">
                                            {champion.avatarUrl
                                                ? <img src={champion.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                : champion.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                                            <span className="text-xs">🏆</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">Campeão do Período</p>
                                        <h3 className="text-xl font-bold text-white">{champion.name}</h3>
                                        <p className="text-sm text-slate-500 mt-0.5">{getPeriodLabel()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">{rankTypeLabel[rankingType]}</p>
                                        <p className="text-2xl font-bold text-amber-400">{getDisplayValue(champion, rankingType)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Crescimento</p>
                                        <p className={`text-lg font-bold ${champion.crescimento >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {champion.crescimento >= 0 ? '+' : ''}{champion.crescimento.toFixed(1)}%
                                        </p>
                                    </div>
                                    {champion.bateuMeta && (
                                        <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                                            <p className="text-xs font-bold text-emerald-400">✓ Bateu a meta</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── KPIs RÁPIDOS ─────────────────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Vendido</p>
                            <p className="text-xl font-bold text-white">{fmt.format(totalVendido)}</p>
                            <p className="text-xs text-slate-600">no período</p>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Média por Vendedor</p>
                            <p className="text-xl font-bold text-white">{fmt.format(mediaVendedor)}</p>
                            <p className="text-xs text-slate-600">{scoreData.length} vendedores</p>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Crescimento Geral</p>
                            <p className={`text-xl font-bold ${crescGeral >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {crescGeral >= 0 ? '+' : ''}{crescGeral.toFixed(1)}%
                            </p>
                            <p className="text-xs text-slate-600">vs período anterior</p>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total de Vendas</p>
                            <p className="text-xl font-bold text-white">{totalVendas}</p>
                            <p className="text-xs text-slate-600">leads ganhos</p>
                        </div>
                    </div>

                    {/* ── RANKING EXECUTIVO ────────────────────────────────── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                Ranking Executivo
                                <span className="text-xs font-normal text-slate-500">({getPeriodLabel()})</span>
                            </h3>
                            <span className="text-xs text-slate-500">{sortedScores.length} vendedores</span>
                        </div>

                        {sortedScores.map((seller, idx) => {
                            const rankVal = getRankValue(seller, rankingType);
                            const barPct  = maxRankVal > 0 ? Math.max((Math.abs(rankVal) / maxRankVal) * 100, 2) : 2;
                            const barColor = idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#f97316' : '#3b82f6';

                            return (
                                <button
                                    key={seller.id}
                                    onClick={() => { const u = sellers.find(s => s.id === seller.id); if (u) onSelectSeller(u); }}
                                    className="w-full p-4 bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 hover:bg-slate-900 rounded-xl transition-all group text-left space-y-3"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Position */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                            idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                            idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                                            idx === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' :
                                            'bg-slate-800 text-slate-500 border border-slate-700'
                                        }`}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                        </div>

                                        {/* Avatar */}
                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold overflow-hidden flex-shrink-0">
                                            {seller.avatarUrl
                                                ? <img src={seller.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                : seller.name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Name + badges */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                                    {seller.name}
                                                </p>
                                                {seller.bateuMeta && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 whitespace-nowrap">
                                                        ✓ Meta
                                                    </span>
                                                )}
                                                {seller.maiorCrescimento && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 whitespace-nowrap">
                                                        ↑ Maior crescimento
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Main ranking value */}
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-sm font-bold ${
                                                idx === 0 ? 'text-amber-400' :
                                                idx === 1 ? 'text-slate-300' :
                                                idx === 2 ? 'text-orange-400' : 'text-white'
                                            }`}>
                                                {getDisplayValue(seller, rankingType)}
                                            </p>
                                            {seller.crescimento !== 0 && (
                                                <p className={`text-[10px] ${seller.crescimento >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {seller.crescimento >= 0 ? '+' : ''}{seller.crescimento.toFixed(1)}%
                                                </p>
                                            )}
                                        </div>

                                        {/* Meta % */}
                                        {seller.metaTarget > 0 && (
                                            <div className="text-right flex-shrink-0 w-14">
                                                <p className="text-[10px] text-slate-500">Meta</p>
                                                <p className={`text-xs font-bold ${
                                                    seller.metaPct >= 100 ? 'text-emerald-400' :
                                                    seller.metaPct >= 70  ? 'text-blue-400' : 'text-slate-400'
                                                }`}>
                                                    {seller.metaPct.toFixed(0)}%
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Proportional bar */}
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${barPct}%`, background: barColor }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

const Painel360: React.FC<Painel360Props> = ({ users, onSelectSeller }) => {
    const [activeTab, setActiveTab] = useState<'Vendas Globais' | 'Vendedores' | 'Score' | 'Normativas'>('Vendas Globais');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeller, setSelectedSeller] = useState<UserType | null>(null);
    const [supabaseUsers, setSupabaseUsers] = useState<UserType[]>([]);
    const [isFetchingUsers, setIsFetchingUsers] = useState(true);
    const { companyId } = useAuth();

    useEffect(() => {
        const fetchSellers = async () => {
            setIsFetchingUsers(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, email, name, role, created_at')
                    .in('role', ['admin', 'seller'])
                    .eq('is_active', true)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                const mapped: UserType[] = (data ?? []).map(p => ({
                    id: p.id,
                    name: p.name ?? p.email ?? 'Sem nome',
                    email: p.email ?? '',
                    role: p.role === 'admin' ? 'Admin' : 'Vendedor',
                    joinedAt: p.created_at,
                }));
                setSupabaseUsers(mapped);
            } catch (err) {
                safeError('[Painel360] fetchSellers error:', err);
            } finally {
                setIsFetchingUsers(false);
            }
        };

        fetchSellers();
    }, []);

    const handleSelectSeller = (seller: UserType) => {
        setSelectedSeller(seller);
        onSelectSeller?.(seller);
    };

    const allUsers = supabaseUsers.length > 0 ? supabaseUsers : users;
    const sellers = allUsers.filter(u => u.role === 'Vendedor' || u.role === 'Admin');

    const filteredSellers = sellers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Seller Detail View ─────────────────────────────────────────────────────
    if (selectedSeller) {
        return (
            <SellerDetail360
                seller={selectedSeller}
                onBack={() => setSelectedSeller(null)}
            />
        );
    }

    // ── Main Painel 360 ────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
  Painel 360
</h1>

<p className="text-slate-400 mt-1">
  Visão completa de performance por vendedor.
</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                {(['Vendas Globais', 'Vendedores', 'Score', 'Normativas'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-medium transition-all relative ${
                            activeTab === tab
                                ? 'text-blue-400'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab360"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'Vendedores' && (
                        <motion.div
                            key="vendedores"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar vendedor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>

                            {isFetchingUsers ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                                </div>
                            ) : filteredSellers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                    <User className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm">Nenhum vendedor encontrado.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredSellers.map((seller) => (
                                        <button
                                            key={seller.id}
                                            onClick={() => handleSelectSeller(seller)}
                                            className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-900 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-700 overflow-hidden">
                                                    {seller.avatarUrl ? (
                                                        <img src={seller.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        seller.name.substring(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                                        {seller.name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`w-2 h-2 rounded-full ${seller.role === 'Admin' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                                            {seller.role ?? 'Vendedor'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-600 group-hover:text-blue-400 transition-colors font-medium">
                                                    Ver 360
                                                </span>
                                                <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-blue-400 transition-all" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'Score' && (
                        <motion.div
                            key="score"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <ScoreTab
                                sellers={allUsers}
                                onSelectSeller={handleSelectSeller}
                                companyId={companyId}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'Vendas Globais' && (
                        <GlobalSales360 />
                    )}

                    {activeTab === 'Normativas' && (
                        <motion.div
                            key="normativas"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Normativas Bancárias</h3>
                                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                                    <Plus className="w-4 h-4" /> Cadastrar Banco
                                </button>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-950 border-b border-slate-800">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Banco</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Operação</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        <tr className="hover:bg-slate-800/30 transition-colors">
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                                                Nenhum banco cadastrado ainda.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Painel360;
