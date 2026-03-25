import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, MessageSquare, Target, Calendar, DollarSign,
  AlertTriangle, TrendingUp, Users, Zap, RefreshCw, Brain,
} from 'lucide-react';
import { useAgentPerformance } from './hooks/useAgentPerformance';
import { useSupervisorInsights } from './hooks/useSupervisorInsights';
import { SupervisorIntelligence } from './SupervisorIntelligence';
import type { AgentRanking, AgentFunctionType } from './hooks/useAgents';
import type { PerformancePeriod } from './hooks/useAgentPerformance';

type CommandTab = 'central' | 'inteligencia';

const COMMAND_TABS: { id: CommandTab; label: string; icon: React.ElementType }[] = [
  { id: 'central',      label: 'Central de Comando', icon: Zap },
  { id: 'inteligencia', label: 'Inteligência',        icon: Brain },
];

const FUNCTION_COLORS: Record<AgentFunctionType, string> = {
  hunter: '#f97316', sdr: '#60a5fa', closer: '#34d399',
  followup: '#a78bfa', curator: '#22d3ee', supervisor: '#fbbf24',
};

const FUNCTION_LABELS: Record<AgentFunctionType, string> = {
  hunter: 'Hunter', sdr: 'SDR', closer: 'Closer',
  followup: 'Follow-up', curator: 'Curator', supervisor: 'Supervisor',
};

interface KpiData {
  approaches: number; responses: number; qualified: number;
  meetings: number; sales: number; revenue: number; escalations: number;
}

interface Props {
  onSelectAgent?: (agentId: string) => void;
}

export const AgentsCommandCenter: React.FC<Props> = ({ onSelectAgent }) => {
  const { fetchTodayTotals, fetchRanking, loading } = useAgentPerformance();
  const { unreadCount } = useSupervisorInsights();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [ranking, setRanking] = useState<AgentRanking[]>([]);
  const [period, setPeriod] = useState<PerformancePeriod>('month');
  const [refreshing, setRefreshing] = useState(false);
  const [commandTab, setCommandTab] = useState<CommandTab>('central');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = COMMAND_TABS.findIndex(t => t.id === commandTab);
    const el = tabRefs.current[idx];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [commandTab]);

  useEffect(() => {
    const idx = COMMAND_TABS.findIndex(t => t.id === commandTab);
    const el = tabRefs.current[idx];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setRefreshing(true);
    const [totals, rank] = await Promise.all([
      fetchTodayTotals(),
      fetchRanking(period),
    ]);
    setKpis(totals as KpiData | null);
    setRanking((rank ?? []) as AgentRanking[]);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpiCards = [
    { label: 'Abordagens hoje', value: kpis?.approaches ?? 0, icon: Activity, color: '#60a5fa' },
    { label: 'Respostas', value: kpis?.responses ?? 0, icon: MessageSquare, color: '#34d399' },
    { label: 'Qualificados', value: kpis?.qualified ?? 0, icon: Target, color: '#f97316' },
    { label: 'Reuniões', value: kpis?.meetings ?? 0, icon: Calendar, color: '#a78bfa' },
    { label: 'Vendas', value: kpis?.sales ?? 0, icon: DollarSign, color: '#fbbf24' },
    { label: 'Escalações', value: kpis?.escalations ?? 0, icon: AlertTriangle, color: '#f87171' },
  ];

  const maxRevenue = Math.max(...ranking.map(r => r.total_revenue), 1);

  return (
    <div className="space-y-6">
      {/* Inner tab bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center bg-slate-900/60 border border-blue-500/10 rounded-xl p-1">
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all duration-300 ease-in-out pointer-events-none"
            style={{ left: pill.left, width: pill.width }}
          />
          {COMMAND_TABS.map((tab, i) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                ref={el => { tabRefs.current[i] = el; }}
                onClick={() => setCommandTab(tab.id)}
                className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-colors duration-200 whitespace-nowrap ${
                  commandTab === tab.id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {tab.label}
                {tab.id === 'inteligencia' && unreadCount > 0 && (
                  <span className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={commandTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >

      {commandTab === 'inteligencia' && <SupervisorIntelligence />}

      {commandTab === 'central' && <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            Central de Comando
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Visão em tempo real do Exército Comercial</p>
        </div>
        <button
          onClick={load}
          disabled={refreshing || loading}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-[#0B1220] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${kpi.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value.toLocaleString('pt-BR')}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Ranking */}
      <div className="bg-[#0B1220] border border-white/5 rounded-xl overflow-hidden">
        {/* Ranking header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Ranking de Agentes</span>
          </div>
          <div className="flex items-center bg-[#0F172A] rounded-lg p-0.5 gap-0.5">
            {(['today', 'week', 'month'] as PerformancePeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        {/* Ranking list */}
        <div className="divide-y divide-white/[0.03]">
          {ranking.length === 0 && (
            <div className="flex flex-col items-center py-10 text-slate-600">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum dado no período</p>
            </div>
          )}
          {ranking.map((agent, idx) => {
            const color = FUNCTION_COLORS[agent.function_type as AgentFunctionType] ?? '#60a5fa';
            const barWidth = agent.total_revenue > 0
              ? `${(agent.total_revenue / maxRevenue) * 100}%`
              : '2%';

            return (
              <div
                key={agent.agent_id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                onClick={() => onSelectAgent?.(agent.agent_id)}
              >
                {/* Rank */}
                <div className="w-6 text-center text-sm font-bold" style={{ color: idx < 3 ? color : undefined }}>
                  {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `${idx + 1}`}
                </div>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${agent.avatar_color}22`, color: agent.avatar_color }}
                >
                  {agent.agent_name.slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{agent.agent_name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded text-slate-500 bg-slate-800/50 hidden sm:inline">
                      {FUNCTION_LABELS[agent.function_type as AgentFunctionType] ?? agent.function_type}
                    </span>
                    {!agent.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded text-slate-600 bg-slate-800/30">
                        Inativo
                      </span>
                    )}
                  </div>
                  {/* Bar */}
                  <div className="mt-1.5 h-1 bg-slate-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: barWidth, background: color }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-5 text-right ml-4">
                  <div>
                    <p className="text-xs font-semibold text-white">{agent.total_approaches}</p>
                    <p className="text-[10px] text-slate-600">abord.</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-400">{agent.total_sales}</p>
                    <p className="text-[10px] text-slate-600">vendas</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {agent.response_rate.toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-slate-600">resp.</p>
                  </div>
                  <div className="w-20 text-right">
                    <p className="text-xs font-bold" style={{ color }}>
                      {agent.total_revenue > 0
                        ? `R$ ${(agent.total_revenue / 1000).toFixed(1)}k`
                        : '—'}
                    </p>
                    <p className="text-[10px] text-slate-600">receita</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </>}

        </motion.div>
      </AnimatePresence>
    </div>
  );
};
