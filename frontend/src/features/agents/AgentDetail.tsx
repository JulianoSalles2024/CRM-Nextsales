import React from 'react';
import ReactDOM from 'react-dom';
import {
  X, RefreshCw, MessageSquare, TrendingUp, Target,
  Database, Eye, DollarSign, Bot, Clock, Zap,
  ChevronRight, Activity,
} from 'lucide-react';
import type { AIAgent, AgentFunctionType } from './hooks/useAgents';
import { useAgentDetail } from './hooks/useAgentDetail';

// ─── Shared metadata (mirrors AgentCard) ──────────────────────────────────────
const FUNCTION_META: Record<AgentFunctionType, {
  label: string; color: string; bg: string; icon: React.ElementType;
}> = {
  hunter:     { label: 'Hunter',     color: 'text-orange-400',  bg: 'bg-orange-500/10',  icon: Target },
  sdr:        { label: 'SDR',        color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: MessageSquare },
  closer:     { label: 'Closer',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: DollarSign },
  followup:   { label: 'Follow-up',  color: 'text-violet-400',  bg: 'bg-violet-500/10',  icon: RefreshCw },
  curator:    { label: 'Curator',    color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    icon: Database },
  supervisor: { label: 'Supervisor', color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: Eye },
};

const INTEREST_CONFIG = {
  very_high: { label: 'Muito alto', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  high:      { label: 'Alto',       color: 'text-blue-400',    dot: 'bg-blue-400' },
  medium:    { label: 'Médio',      color: 'text-amber-400',   dot: 'bg-amber-400' },
  low:       { label: 'Baixo',      color: 'text-slate-400',   dot: 'bg-slate-500' },
};

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  escalated:         { label: 'Escalou',          color: 'text-amber-400' },
  followup_scheduled:{ label: 'Follow-up agend.', color: 'text-violet-400' },
  message_sent:      { label: 'Msg enviada',       color: 'text-blue-400' },
  no_response:       { label: 'Sem resposta',      color: 'text-slate-500' },
  qualified:         { label: 'Qualificado',       color: 'text-emerald-400' },
  closed_won:        { label: 'Fechado',           color: 'text-emerald-400' },
};

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)   return 'agora';
  if (diffMin < 60)  return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)    return `${diffH}h atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatNextAction(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs < 0) return 'Atrasado';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60)  return `em ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)    return `em ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `em ${diffD}d`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex flex-col items-center justify-center bg-white/3 rounded-xl p-3 border border-white/5">
    <span className={`text-xl font-bold ${color}`}>{value}</span>
    <span className="text-[10px] text-slate-500 mt-0.5 text-center leading-tight">{label}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
interface AgentDetailProps {
  agent: AIAgent;
  onClose: () => void;
}

const PAGE_SIZE = 8;

function Paginator({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 mt-3">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ‹
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
            p === page
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-500 hover:text-white hover:bg-white/5'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ›
      </button>
    </div>
  );
}

export const AgentDetail: React.FC<AgentDetailProps> = ({ agent, onClose }) => {
  const meta = FUNCTION_META[agent.function_type];
  const FnIcon = meta.icon;
  const { queue, runs, perf, loading, refetch } = useAgentDetail(agent.id);
  const [queuePage, setQueuePage] = React.useState(1);
  const [runsPage, setRunsPage] = React.useState(1);

  const pagedQueue = queue.slice((queuePage - 1) * PAGE_SIZE, queuePage * PAGE_SIZE);
  const pagedRuns  = runs.slice((runsPage  - 1) * PAGE_SIZE, runsPage  * PAGE_SIZE);

  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-x-0 bottom-0 z-[150] bg-black/40 backdrop-blur-sm"
        style={{ top: '80px' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 bottom-0 z-[151] w-[420px] flex flex-col bg-[#0B1220] border-l border-blue-500/30 shadow-2xl shadow-blue-900/20 animate-slide-in-right overflow-hidden" style={{ top: '80px' }}>

        {/* Top accent */}
        <div className="h-0.5 w-full flex-shrink-0" style={{ background: agent.avatar_color }} />

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2"
            style={{
              background: `${agent.avatar_color}22`,
              color: agent.avatar_color,
              boxShadow: `0 0 0 2px ${agent.avatar_color}40`,
            }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                <FnIcon className="w-3 h-3" />
                {meta.label}
              </span>
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                agent.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                {agent.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={refetch}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPIs do dia */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hoje</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <KpiCard label="Abordagens"  value={perf?.approaches  ?? 0} color="text-blue-400" />
            <KpiCard label="Respostas"   value={perf?.responses   ?? 0} color="text-violet-400" />
            <KpiCard label="Qualific."   value={perf?.qualified   ?? 0} color="text-cyan-400" />
            <KpiCard label="Escalações"  value={perf?.escalations ?? 0} color="text-amber-400" />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6 space-y-6">

          {/* Lead Queue */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Fila de leads
                </span>
              </div>
              <span className="text-xs text-slate-600">{queue.length} leads</span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-white/3 rounded-xl animate-pulse border border-white/5" />
                ))}
              </div>
            ) : queue.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-600">
                <Bot className="w-8 h-8 mb-2" />
                <p className="text-xs text-slate-500">Nenhum lead na fila</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pagedQueue.map((item) => {
                  const interest = item.interest_level
                    ? INTEREST_CONFIG[item.interest_level as keyof typeof INTEREST_CONFIG]
                    : null;
                  return (
                    <div
                      key={item.lead_id}
                      className="flex items-center gap-3 bg-white/3 rounded-xl px-3 py-2.5 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: `${agent.avatar_color}18`, color: agent.avatar_color }}
                      >
                        {(item.lead_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{item.lead_name ?? 'Lead'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {interest && (
                            <span className={`flex items-center gap-1 text-[10px] ${interest.color}`}>
                              <span className={`w-1 h-1 rounded-full ${interest.dot}`} />
                              {interest.label}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-600 capitalize">{item.stage?.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="w-2.5 h-2.5" />
                          {formatNextAction(item.next_action_at)}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {item.approach_count}x abord.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Paginator page={queuePage} total={queue.length} onPage={setQueuePage} />
          </div>

          {/* Recent Runs */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Execuções recentes
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-white/3 rounded-lg animate-pulse border border-white/5" />
                ))}
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-600">
                <Activity className="w-8 h-8 mb-2" />
                <p className="text-xs text-slate-500">Nenhuma execução registrada</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pagedRuns.map((run) => {
                  const outcome = run.outcome
                    ? OUTCOME_CONFIG[run.outcome] ?? { label: run.outcome, color: 'text-slate-400' }
                    : null;
                  const tokens = (run.tokens_input ?? 0) + (run.tokens_output ?? 0);
                  return (
                    <div
                      key={run.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/5 hover:border-white/8 hover:bg-white/2 transition-colors"
                    >
                      <ChevronRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-300 truncate capitalize">
                            {run.run_type?.replace('_', ' ') ?? 'run'}
                          </span>
                          {outcome && (
                            <span className={`text-[10px] font-medium ${outcome.color}`}>
                              · {outcome.label}
                            </span>
                          )}
                        </div>
                        {run.output_text && (
                          <p className="text-[10px] text-slate-600 truncate mt-0.5">{run.output_text}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] text-slate-500">{formatRelative(run.created_at)}</p>
                        {tokens > 0 && (
                          <p className="text-[10px] text-slate-700">{tokens.toLocaleString()} tok</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Paginator page={runsPage} total={runs.length} onPage={setRunsPage} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </>,
    document.body
  );
};
