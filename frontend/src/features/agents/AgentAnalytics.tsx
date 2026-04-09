import React from 'react';
import {
  Zap, Cpu, DollarSign, TrendingUp, ExternalLink,
  Bot, BarChart2,
} from 'lucide-react';
import { useAgentAnalytics, type Period } from './hooks/useAgentAnalytics';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(3)}`;
}

function formatDuration(ms: number): string {
  if (!ms) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

function conversionBadge(rate: number): string {
  if (rate >= 20) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
  if (rate >= 10) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
  return 'bg-red-500/15 text-red-400 border-red-500/20';
}

// ── Period selector ──────────────────────────────────────────────────────────

const PERIODS: { id: Period; label: string }[] = [
  { id: '7d',  label: '7 dias'  },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
];

// ── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 animate-pulse">
    <div className="h-3 w-24 bg-slate-700/60 rounded mb-4" />
    <div className="h-7 w-16 bg-slate-700/60 rounded mb-1" />
    <div className="h-2.5 w-20 bg-slate-800 rounded" />
  </div>
);

// ── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label, value, sub, icon: Icon, accent = 'text-sky-400',
}) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
      <div className={`p-2 rounded-lg bg-sky-500/5 border border-sky-500/20 ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

interface AgentAnalyticsProps {
  companyId: string | null;
}

export const AgentAnalytics: React.FC<AgentAnalyticsProps> = ({ companyId }) => {
  const { summary, agents, loading, period, setPeriod } = useAgentAnalytics(companyId);

  const noData = !loading && (summary?.total_runs ?? 0) === 0;

  return (
    <div className="space-y-6">
      {/* Header row: title + period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Analytics de Agentes</h2>
          <p className="text-xs text-slate-500 mt-0.5">Desempenho do Exército Comercial de IA</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/60 border border-blue-500/10 rounded-xl p-1">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors duration-200 ${
                period === p.id
                  ? 'bg-sky-500/5 border border-sky-500/20 text-sky-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <SummaryCard
              label="Total Execuções"
              value={(summary?.total_runs ?? 0).toLocaleString('pt-BR')}
              sub="ciclos do agente"
              icon={Zap}
            />
            <SummaryCard
              label="Tokens Consumidos"
              value={formatTokens(summary?.total_tokens ?? 0)}
              sub="tokens processados"
              icon={Cpu}
              accent="text-purple-400"
            />
            <SummaryCard
              label="Custo Total"
              value={formatCost(summary?.total_cost ?? 0)}
              sub="custo estimado USD"
              icon={DollarSign}
              accent="text-emerald-400"
            />
            <SummaryCard
              label="Custo / Execução"
              value={formatCost((summary?.total_runs ?? 0) > 0 ? (summary?.total_cost ?? 0) / (summary?.total_runs ?? 1) : 0)}
              sub="custo médio por ciclo"
              icon={BarChart2}
              accent="text-amber-400"
            />
            <SummaryCard
              label="Tokens / Execução"
              value={formatTokens((summary?.total_runs ?? 0) > 0 ? Math.round((summary?.total_tokens ?? 0) / (summary?.total_runs ?? 1)) : 0)}
              sub="média por ciclo"
              icon={Cpu}
              accent="text-indigo-400"
            />
            <SummaryCard
              label="Taxa de Conversão"
              value={`${(summary?.avg_conversion ?? 0).toFixed(1)}%`}
              sub="média por agente"
              icon={TrendingUp}
              accent="text-sky-400"
            />
          </>
        )}
      </div>

      {/* Empty state */}
      {noData && (
        <div className="flex flex-col items-center py-16 text-slate-600">
          <Bot className="w-10 h-10 mb-3" />
          <p className="text-sm text-slate-500 font-medium">Nenhuma execução no período</p>
          <p className="text-xs text-slate-600 mt-1">
            Ative um agente para começar a coletar dados de performance
          </p>
        </div>
      )}

      {/* Agents table */}
      {!loading && agents.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">
            Ranking de Agentes
          </p>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Agente</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tokens</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Custo Total</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Custo / Exec</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Conversão</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tempo Médio</th>
                    <th className="text-center px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {agents.map((agent) => (
                    <tr
                      key={agent.agent_id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Agent name + type */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: agent.avatar_color || 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                          >
                            {agent.agent_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm leading-tight">{agent.agent_name}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{agent.function_type ?? 'genérico'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tokens */}
                      <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                        {formatTokens(agent.total_tokens ?? 0)}
                      </td>

                      {/* Cost total */}
                      <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                        {formatCost(agent.total_cost ?? 0)}
                      </td>

                      {/* Cost per execution */}
                      <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                        {formatCost(agent.total_approaches > 0 ? (agent.total_cost ?? 0) / agent.total_approaches : 0)}
                      </td>

                      {/* Conversion badge */}
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium tabular-nums ${conversionBadge(agent.conversion_rate ?? 0)}`}>
                          {(agent.conversion_rate ?? 0).toFixed(1)}%
                        </span>
                      </td>

                      {/* Avg duration */}
                      <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                        {formatDuration(agent.avg_duration_ms ?? 0)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {agent.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] bg-slate-800 text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full">
                            Inativo
                          </span>
                        )}
                      </td>

                      {/* LangSmith link */}
                      <td className="px-4 py-3">
                        <a
                          href="https://smith.langchain.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir no LangSmith"
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 hover:text-sky-400 hover:bg-sky-500/5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Table skeleton */}
      {loading && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-800/60">
              <div className="w-7 h-7 rounded-lg bg-slate-700/60" />
              <div className="h-3 w-28 bg-slate-700/60 rounded flex-1" />
              <div className="h-3 w-12 bg-slate-700/60 rounded" />
              <div className="h-3 w-12 bg-slate-700/60 rounded" />
              <div className="h-3 w-16 bg-slate-700/60 rounded" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
