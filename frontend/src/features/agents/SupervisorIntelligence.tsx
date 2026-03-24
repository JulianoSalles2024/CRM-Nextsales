import React, { useState } from 'react';
import { Brain, Lightbulb, CheckCheck, Sparkles, RefreshCw, Bot, User } from 'lucide-react';
import { useSupervisorInsights, type SupervisorInsight } from './hooks/useSupervisorInsights';

const TYPE_LABELS: Record<SupervisorInsight['type'], string> = {
  performance_drop: 'Queda de Performance',
  script_issue:     'Problema no Script',
  channel_weak:     'Canal Fraco',
  goal_risk:        'Risco de Meta',
  general:          'Observação Geral',
};

const SEVERITY_CONFIG: Record<SupervisorInsight['severity'], {
  border: string; badge: string; dot: string; label: string;
}> = {
  critical: {
    border: 'border-l-red-500',
    badge:  'bg-red-500/15 text-red-400 border border-red-500/20',
    dot:    'bg-red-500',
    label:  'Crítico',
  },
  warning: {
    border: 'border-l-amber-500',
    badge:  'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    dot:    'bg-amber-400',
    label:  'Aviso',
  },
  info: {
    border: 'border-l-blue-500',
    badge:  'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    dot:    'bg-blue-400',
    label:  'Info',
  },
};

type SeverityFilter = 'all' | SupervisorInsight['severity'];
type SourceFilter = 'all' | 'agents' | 'sellers';

const SEVERITY_FILTERS: { id: SeverityFilter; label: string }[] = [
  { id: 'all',      label: 'Todos' },
  { id: 'critical', label: 'Crítico' },
  { id: 'warning',  label: 'Aviso' },
  { id: 'info',     label: 'Info' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

interface InsightCardProps {
  insight: SupervisorInsight;
  onMarkRead: (id: string) => void;
  onMarkApplied: (id: string) => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, onMarkRead, onMarkApplied }) => {
  const cfg = SEVERITY_CONFIG[insight.severity];
  const isAgent   = !!insight.agent_id;
  const isSeller  = !!insight.profile_id;
  const subjectName  = isAgent ? insight.agent_name : insight.profile_name;
  const subjectColor = isAgent ? (insight.agent_avatar_color ?? '#60a5fa') : '#a78bfa';

  return (
    <div className={`bg-[#0B1220] border border-white/5 border-l-4 ${cfg.border} rounded-xl p-4 transition-opacity ${insight.is_read ? 'opacity-60' : ''}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center flex-wrap gap-2">
          {/* Severidade */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
            {cfg.label}
          </span>

          {/* Tipo */}
          <span className="text-[11px] text-slate-400 font-medium">
            {TYPE_LABELS[insight.type]}
          </span>

          {/* Badge agente IA */}
          {isAgent && subjectName && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1"
              style={{
                background: `${subjectColor}15`,
                color: subjectColor,
                borderColor: `${subjectColor}30`,
              }}
            >
              <Bot className="w-2.5 h-2.5" />
              {subjectName}
            </span>
          )}

          {/* Badge vendedor humano */}
          {isSeller && subjectName && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 bg-violet-500/15 text-violet-400 border-violet-500/20">
              <User className="w-2.5 h-2.5" />
              {subjectName}
            </span>
          )}

          {/* Badge geral (sem agente nem vendedor) */}
          {!isAgent && !isSeller && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-800/60 text-slate-400 border-slate-700/40">
              Geral
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-600 whitespace-nowrap flex-shrink-0">
          {timeAgo(insight.created_at)}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm text-slate-300 leading-relaxed">{insight.content}</p>

      {/* Recommendation */}
      {insight.recommendation && (
        <div className="mt-3 flex items-start gap-2 bg-slate-800/40 rounded-lg px-3 py-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">{insight.recommendation}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        {!insight.is_read && (
          <button
            onClick={() => onMarkRead(insight.id)}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            Marcar como lida
          </button>
        )}
        {insight.recommendation && !insight.is_applied && (
          <button
            onClick={() => onMarkApplied(insight.id)}
            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 ml-auto"
          >
            <Sparkles className="w-3 h-3" />
            Aplicar recomendação
          </button>
        )}
        {insight.is_applied && (
          <span className="text-[11px] text-emerald-500 flex items-center gap-1 ml-auto">
            <CheckCheck className="w-3 h-3" />
            Aplicada
          </span>
        )}
      </div>
    </div>
  );
};

export const SupervisorIntelligence: React.FC = () => {
  const { insights, loading, fetchError, markRead, markApplied, refetch } = useSupervisorInsights();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const filtered = insights
    .filter(i => severityFilter === 'all' || i.severity === severityFilter)
    .filter(i => {
      if (sourceFilter === 'agents')  return !!i.agent_id;
      if (sourceFilter === 'sellers') return !!i.profile_id;
      return true;
    });

  const grouped = {
    critical: filtered.filter(i => i.severity === 'critical'),
    warning:  filtered.filter(i => i.severity === 'warning'),
    info:     filtered.filter(i => i.severity === 'info'),
  };

  const agentCount  = insights.filter(i => !!i.agent_id).length;
  const sellerCount = insights.filter(i => !!i.profile_id).length;

  if (fetchError) {
    return (
      <div className="flex flex-col items-center py-16 text-slate-500 gap-2">
        <Brain className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-400">Erro ao carregar insights</p>
        <p className="text-xs text-slate-600 font-mono max-w-sm text-center break-all">{fetchError}</p>
        <button onClick={refetch} className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#0B1220] border border-white/5 rounded-xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-amber-400" />
            Inteligência do Supervisor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Análise automática gerada diariamente sobre agentes e vendedores
          </p>
        </div>
        <button
          onClick={refetch}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filtros — linha 1: fonte */}
      <div className="flex items-center gap-2">
        {([
          { id: 'all',     label: 'Todos',     count: insights.length },
          { id: 'agents',  label: 'Agentes IA', count: agentCount, icon: Bot },
          { id: 'sellers', label: 'Vendedores', count: sellerCount, icon: User },
        ] as { id: SourceFilter; label: string; count: number; icon?: React.ElementType }[]).map(f => {
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              onClick={() => setSourceFilter(f.id)}
              className={`px-3 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 ${
                sourceFilter === f.id
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                  : 'text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {f.label}
              <span className="text-[10px] opacity-60">{f.count}</span>
            </button>
          );
        })}

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Filtros — linha 1: severidade */}
        {SEVERITY_FILTERS.filter(f => f.id !== 'all').map(f => (
          <button
            key={f.id}
            onClick={() => setSeverityFilter(severityFilter === f.id ? 'all' : f.id)}
            className={`px-3 py-1 text-xs rounded-lg border transition-all ${
              severityFilter === f.id
                ? SEVERITY_CONFIG[f.id as SupervisorInsight['severity']].badge
                : 'text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[10px] opacity-70">
              {insights.filter(i => i.severity === f.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-slate-600">
          <Brain className="w-10 h-10 mb-3" />
          <p className="text-sm text-slate-500">Nenhuma análise disponível</p>
          <p className="text-xs text-slate-600 mt-1 text-center max-w-xs">
            O Supervisor analisa agentes e vendedores diariamente e gera insights automaticamente.
          </p>
        </div>
      )}

      {/* Grouped insights */}
      {(['critical', 'warning', 'info'] as const).map(sev => {
        const group = grouped[sev];
        if (group.length === 0) return null;
        const cfg = SEVERITY_CONFIG[sev];
        return (
          <div key={sev} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {cfg.label} · {group.length}
              </span>
            </div>
            {group.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onMarkRead={markRead}
                onMarkApplied={markApplied}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};
