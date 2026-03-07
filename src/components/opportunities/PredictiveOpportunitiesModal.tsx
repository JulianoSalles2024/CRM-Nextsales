import React, { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  AlertCircle,
  Flame,
  TrendingUp,
  Thermometer,
  AlertTriangle,
  Snowflake,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { useOpportunityScores, type OpportunityScore } from '@/src/hooks/useOpportunityScores';

// ── Props ─────────────────────────────────────────────────────
interface PredictiveOpportunitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLead: (leadId: string) => void;
}

// ── Band config ───────────────────────────────────────────────
type Band = OpportunityScore['priority_band'];

const BAND_CONFIG: Record<Band, {
  label: string;
  Icon: React.ElementType;
  badge: string;
  iconBg: string;
  dot: string;
  row: string;
}> = {
  hot: {
    label:  'Hot',
    Icon:   Flame,
    badge:  'bg-orange-500/15 text-orange-400 border border-orange-500/25',
    iconBg: 'bg-orange-500/15',
    dot:    'bg-orange-400',
    row:    'border-orange-500/10 hover:bg-orange-500/5',
  },
  upsell: {
    label:  'Upsell',
    Icon:   TrendingUp,
    badge:  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    iconBg: 'bg-emerald-500/15',
    dot:    'bg-emerald-400',
    row:    'border-emerald-500/10 hover:bg-emerald-500/5',
  },
  warm: {
    label:  'Warm',
    Icon:   Thermometer,
    badge:  'bg-blue-500/15 text-blue-400 border border-blue-500/25',
    iconBg: 'bg-blue-500/15',
    dot:    'bg-blue-400',
    row:    'border-blue-500/10 hover:bg-blue-500/5',
  },
  risk: {
    label:  'Risco',
    Icon:   AlertTriangle,
    badge:  'bg-red-500/15 text-red-400 border border-red-500/25',
    iconBg: 'bg-red-500/15',
    dot:    'bg-red-400',
    row:    'border-red-500/10 hover:bg-red-500/5',
  },
  cold: {
    label:  'Cold',
    Icon:   Snowflake,
    badge:  'bg-slate-700/60 text-slate-400 border border-slate-700',
    iconBg: 'bg-slate-700/60',
    dot:    'bg-slate-500',
    row:    'border-slate-800 hover:bg-slate-800/40',
  },
};

// hot → upsell → warm → risk → cold
const BAND_ORDER: Record<Band, number> = {
  hot: 0, upsell: 1, warm: 2, risk: 3, cold: 4,
};

// ── Score color helpers ───────────────────────────────────────
function convColor(v: number): string {
  if (v >= 80) return 'bg-emerald-500/15 text-emerald-300';
  if (v >= 50) return 'bg-blue-500/15 text-blue-300';
  return 'bg-slate-700/60 text-slate-400';
}
function upsellColor(v: number): string {
  return v >= 60 ? 'bg-violet-500/15 text-violet-300' : 'bg-slate-700/60 text-slate-400';
}
function riskColor(v: number): string {
  return v >= 60 ? 'bg-red-500/15 text-red-400' : 'bg-slate-700/60 text-slate-400';
}

// "novo" — analisado nas últimas 24h
function isRecent(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 86_400_000;
}

// ── Sub-components ────────────────────────────────────────────
const ScorePill: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
    {label} <span className="opacity-80">{value}</span>
  </span>
);

const BandBadge: React.FC<{ band: Band }> = ({ band }) => {
  const cfg = BAND_CONFIG[band];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.badge}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

const StatsSummary: React.FC<{ opportunities: OpportunityScore[] }> = ({ opportunities }) => {
  const counts = useMemo(() => {
    const c: Partial<Record<Band, number>> = {};
    for (const o of opportunities) {
      c[o.priority_band] = (c[o.priority_band] ?? 0) + 1;
    }
    return c;
  }, [opportunities]);

  const bands: Band[] = ['hot', 'upsell', 'warm', 'risk', 'cold'];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {bands.map((band) => {
        const count = counts[band];
        if (!count) return null;
        const cfg = BAND_CONFIG[band];
        return (
          <span key={band} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="font-semibold text-slate-200">{count}</span>
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
};

const OpportunityRow: React.FC<{
  item: OpportunityScore;
  onSelectLead: (leadId: string) => void;
}> = ({ item, onSelectLead }) => {
  const cfg = BAND_CONFIG[item.priority_band];
  const readyToClose = item.conversion_score >= 85;
  const recent = isRecent(item.last_analyzed_at);

  return (
    <div className={`flex items-start justify-between gap-4 p-3 rounded-lg border transition-colors ${cfg.row}`}>
      {/* Left: icon + info */}
      <div className="flex items-start gap-3 min-w-0">
        <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.iconBg} flex-shrink-0`}>
          <cfg.Icon className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          {/* Name + badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-white truncate">{item.lead_name}</span>

            {/* "Pronto para fechar" — antes do BandBadge */}
            {readyToClose && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                🔥 Pronto para fechar
              </span>
            )}

            <BandBadge band={item.priority_band} />

            {/* Indicador de oportunidade recente */}
            {recent && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                novo
              </span>
            )}
          </div>

          {/* Score pills — cores dinâmicas por threshold */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <ScorePill label="Conv"   value={item.conversion_score} color={convColor(item.conversion_score)} />
            <ScorePill label="Upsell" value={item.upsell_score}     color={upsellColor(item.upsell_score)} />
            <ScorePill label="Risco"  value={item.risk_score}       color={riskColor(item.risk_score)} />
          </div>

          {/* Ação recomendada */}
          {item.next_best_action && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
              💡 {item.next_best_action}
            </p>
          )}
        </div>
      </div>

      {/* Right: open button */}
      <button
        onClick={() => onSelectLead(item.lead_id)}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors mt-0.5"
      >
        Abrir <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
};

// ── Modal ─────────────────────────────────────────────────────
const PredictiveOpportunitiesModal: React.FC<PredictiveOpportunitiesModalProps> = ({
  isOpen,
  onClose,
  onSelectLead,
}) => {
  const { opportunities, loading, error, refresh } = useOpportunityScores();

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen]);

  const sorted = useMemo(
    () => [...opportunities].sort(
      (a, b) => BAND_ORDER[a.priority_band] - BAND_ORDER[b.priority_band]
    ),
    [opportunities]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-800 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ─────────────────────────────────────── */}
            <div className="p-6 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Oportunidades Inteligentes</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Leads classificados por potencial comercial
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats — só quando há dados */}
              {!loading && !error && sorted.length > 0 && (
                <div className="mt-4">
                  <StatsSummary opportunities={sorted} />
                </div>
              )}
            </div>

            {/* ── Body ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* Loading */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  <p className="text-sm text-slate-500">Carregando oportunidades...</p>
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-sm text-slate-400">{error}</p>
                </div>
              )}

              {/* Empty */}
              {!loading && !error && sorted.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Zap className="w-8 h-8 text-slate-600" />
                  <p className="text-sm text-slate-400">Nenhuma oportunidade detectada ainda.</p>
                  <p className="text-xs text-slate-600">
                    Execute uma análise para gerar insights comerciais.
                  </p>
                </div>
              )}

              {/* List */}
              {!loading && !error && sorted.length > 0 && (
                <div className="space-y-2">
                  {sorted.map((item) => (
                    <OpportunityRow
                      key={item.lead_id}
                      item={item}
                      onSelectLead={(id) => { onSelectLead(id); onClose(); }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────── */}
            {!loading && !error && sorted.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-800 flex-shrink-0">
                <p className="text-xs text-slate-600 text-center">
                  {sorted.length} oportunidade{sorted.length !== 1 ? 's' : ''} · análise determinística
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PredictiveOpportunitiesModal;
