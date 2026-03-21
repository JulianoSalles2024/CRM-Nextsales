import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, CheckCircle2, XCircle, Clock, Copy2, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, Loader2, Inbox,
  ArrowDownLeft, ArrowUpRight, Filter,
} from 'lucide-react';
import { useWebhookEvents, WebhookEvent } from '@/src/hooks/useWebhookEvents';
import { useAuth } from '@/src/features/auth/AuthContext';

// lucide doesn't export Copy2, using Copy
import { Copy } from 'lucide-react';

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const STATUS_MAP: Record<WebhookEvent['status'], { label: string; cls: string; icon: React.ElementType }> = {
  processed: { label: 'Processado', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: CheckCircle2 },
  received:  { label: 'Recebido',   cls: 'text-blue-400 bg-blue-500/10 border-blue-500/25',         icon: ArrowDownLeft },
  failed:    { label: 'Falhou',     cls: 'text-red-400 bg-red-500/10 border-red-500/25',             icon: XCircle },
  duplicate: { label: 'Duplicado',  cls: 'text-slate-400 bg-slate-500/10 border-slate-500/25',       icon: Copy },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function EventRow({ event }: { event: WebhookEvent }) {
  const [open, setOpen] = useState(false);
  const { label, cls, icon: Icon } = STATUS_MAP[event.status] ?? STATUS_MAP.received;
  const payloadStr = JSON.stringify(event.payload, null, 2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0B1220] border border-white/5 rounded-xl overflow-hidden"
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors text-left"
        onClick={() => setOpen(p => !p)}
      >
        {/* Status */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${cls}`}>
          <Icon className="w-2.5 h-2.5" />
          {label}
        </span>

        {/* Source */}
        <span className="text-xs font-mono text-slate-300 flex-1 truncate">{event.source}</span>

        {/* External ID */}
        <span className="text-[10px] font-mono text-slate-600 hidden md:block truncate max-w-[140px]">
          {event.external_id}
        </span>

        {/* Time */}
        <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(event.created_at)}</span>

        {/* Expand */}
        <span className="text-slate-600 shrink-0">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/5"
          >
            <div className="p-4 space-y-3">
              {event.error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-300">{event.error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'ID', value: event.id },
                  { label: 'Fonte', value: event.source },
                  { label: 'Recebido', value: new Date(event.created_at).toLocaleString('pt-BR') },
                  { label: 'Processado', value: event.processed_at ? new Date(event.processed_at).toLocaleString('pt-BR') : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-slate-600 mb-0.5">{label}</div>
                    <div className="text-slate-300 font-mono text-[10px] truncate">{value}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[10px] text-slate-600 mb-1.5 font-semibold uppercase tracking-wider">Payload</div>
                <pre className="text-[10px] text-slate-400 font-mono bg-black/30 border border-white/5 rounded-lg p-3 overflow-x-auto max-h-40 scrollbar-thin scrollbar-thumb-slate-700">
                  {payloadStr.length > 2000 ? payloadStr.slice(0, 2000) + '\n...' : payloadStr}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main Tab ──────────────────────────────────────────────────────────── */

const STATUS_FILTERS: Array<{ value: WebhookEvent['status'] | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'processed', label: 'Processados' },
  { value: 'received', label: 'Recebidos' },
  { value: 'failed', label: 'Falhos' },
  { value: 'duplicate', label: 'Duplicados' },
];

interface EventosTabProps {
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const EventosTab: React.FC<EventosTabProps> = ({ showNotification }) => {
  const { companyId } = useAuth();
  const { events, loading, refetch } = useWebhookEvents(companyId);
  const [filter, setFilter] = useState<WebhookEvent['status'] | 'all'>('all');

  // Sliding pill
  const pillContainerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = STATUS_FILTERS.findIndex(f => f.value === filter);
    const btn = btnRefs.current[idx];
    if (btn) setPillStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [filter]);

  const filtered = filter === 'all' ? events : events.filter(e => e.status === filter);

  const counts = {
    processed: events.filter(e => e.status === 'processed').length,
    failed:    events.filter(e => e.status === 'failed').length,
    received:  events.filter(e => e.status === 'received').length,
    duplicate: events.filter(e => e.status === 'duplicate').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Monitor de Eventos</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Últimos {events.length} webhooks recebidos · atualização em tempo real
          </p>
        </div>
        <button
          onClick={() => { refetch(); showNotification('Lista atualizada.', 'info'); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-all duration-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Processados', count: counts.processed, cls: 'text-emerald-400' },
          { label: 'Recebidos',   count: counts.received,  cls: 'text-blue-400' },
          { label: 'Falhos',      count: counts.failed,    cls: 'text-red-400' },
          { label: 'Duplicados',  count: counts.duplicate, cls: 'text-slate-400' },
        ].map(({ label, count, cls }) => (
          <div key={label} className="bg-[#0B1220] border border-white/5 rounded-xl p-3 text-center">
            <div className={`text-xl font-extrabold ${cls}`}>{count}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs — sliding pill */}
      <div
        ref={pillContainerRef}
        className="relative flex items-center gap-1 p-1 bg-slate-900/60 border border-blue-500/10 rounded-xl w-fit"
      >
        {/* animated pill */}
        <span
          className="absolute top-1 bottom-1 bg-blue-500/10 border border-blue-500/20 rounded-lg transition-all duration-300 pointer-events-none"
          style={{ left: pillStyle.left, width: pillStyle.width }}
        />
        {STATUS_FILTERS.map(({ value, label }, i) => (
          <button
            key={value}
            ref={el => { btnRefs.current[i] = el; }}
            onClick={() => setFilter(value)}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${
              filter === value
                ? 'text-blue-400'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Events list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-2xl bg-white/3 border border-white/5 mb-4">
            <Activity className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium mb-1">Nenhum evento encontrado</p>
          <p className="text-slate-600 text-sm">
            {filter === 'all'
              ? 'Os eventos de webhook aparecerão aqui em tempo real.'
              : `Sem eventos com status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map(ev => <EventRow key={ev.id} event={ev} />)}
          </AnimatePresence>
        </div>
      )}

      {/* Info footer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-white/2 border border-white/5">
        <Inbox className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Somente eventos com <code className="text-slate-500">status = processed</code> são visíveis via RLS.
          Eventos em falha são registrados pelo n8n com <code className="text-slate-500">service_role</code> e visíveis para o admin.
        </p>
      </div>
    </div>
  );
};

export default EventosTab;
