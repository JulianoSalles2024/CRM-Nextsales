import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Wifi, WifiOff, Loader2, RefreshCw,
  QrCode, Clock, Shield, Zap, Copy,
  PhoneOff, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useChannelConnections, ChannelConnection } from '@/src/hooks/useChannelConnections';
import { useAuth } from '@/src/features/auth/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { usePlanLimits } from '@/src/hooks/usePlanLimits';
import { Lock } from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  instagram: 'Instagram',
  telegram: 'Telegram',
  webchat: 'Web Chat',
};

const CHANNEL_COLOR: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  whatsapp:  { text: 'text-emerald-400', bg: 'bg-emerald-500/8',  border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  email:     { text: 'text-sky-400',    bg: 'bg-blue-500/8',     border: 'border-sky-500/20',    glow: 'shadow-blue-500/10'    },
  instagram: { text: 'text-pink-400',    bg: 'bg-pink-500/8',     border: 'border-pink-500/20',    glow: 'shadow-pink-500/10'    },
  telegram:  { text: 'text-sky-400',     bg: 'bg-sky-500/8',      border: 'border-sky-500/20',     glow: 'shadow-sky-500/10'     },
  webchat:   { text: 'text-violet-400',  bg: 'bg-violet-500/8',   border: 'border-violet-500/20',  glow: 'shadow-violet-500/10'  },
};

const DEFAULT_COLOR = { text: 'text-slate-400', bg: 'bg-slate-500/8', border: 'border-slate-500/20', glow: 'shadow-slate-500/10' };

type EvoState = 'open' | 'connecting' | 'close' | 'error' | 'unknown' | 'checking';

const STATE_MAP: Record<EvoState, { label: string; dot: string; text: string }> = {
  open:       { label: 'Conectado',    dot: 'bg-emerald-400',                             text: 'text-emerald-400' },
  connecting: { label: 'Conectando',  dot: 'bg-amber-400 animate-pulse',                 text: 'text-amber-400'   },
  close:      { label: 'Desconectado',dot: 'bg-red-500',                                 text: 'text-red-400'     },
  error:      { label: 'Erro',        dot: 'bg-red-500',                                 text: 'text-red-400'     },
  checking:   { label: 'Verificando', dot: 'bg-slate-500 animate-pulse',                 text: 'text-slate-400'   },
  unknown:    { label: 'Sem status',  dot: 'bg-slate-600',                               text: 'text-slate-500'   },
};

const ITEMS_PER_PAGE = 3;

/* ─── ConnCard — vertical grid card ─────────────────────────────────────── */

interface ConnCardProps {
  conn: ChannelConnection & { evolutionState?: EvoState; evolution_error?: string };
  onHealthCheck: (id: string) => void;
  checking: boolean;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  onDisconnect?: () => void;
  index: number;
  ownerRole?: 'admin' | 'seller' | 'user' | null;
  ownerName?: string | null;
}

const ConnCard: React.FC<ConnCardProps> = ({
  conn, onHealthCheck, checking, showNotification, onDisconnect, index, ownerRole, ownerName,
}) => {
  const color = CHANNEL_COLOR[conn.channel] ?? DEFAULT_COLOR;
  const evoState: EvoState = checking ? 'checking' : (conn.evolutionState as EvoState) ?? 'unknown';
  const state = STATE_MAP[evoState] ?? STATE_MAP.unknown;
  const isOnline = evoState === 'open';

  // Flash sutil quando updated_at muda (conexão atualizada via Realtime)
  const [flash, setFlash] = useState(false);
  const prevUpdatedAt = useRef(conn.updated_at);
  useEffect(() => {
    if (prevUpdatedAt.current && prevUpdatedAt.current !== conn.updated_at) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1000);
      return () => clearTimeout(t);
    }
    prevUpdatedAt.current = conn.updated_at;
  }, [conn.updated_at]);

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v);
    showNotification(`${label} copiado!`, 'info');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`
        relative flex flex-col rounded-2xl overflow-hidden
        bg-slate-900/40
        border shadow-lg ${color.glow} group
        transition-all duration-500
        ${flash ? 'border-emerald-500/50 shadow-emerald-500/15' : 'border-slate-800/50 hover:border-slate-700/60'}
        hover:shadow-xl
      `}
    >
      {/* Subtle top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-px ${isOnline ? 'bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent' : 'bg-gradient-to-r from-transparent via-slate-700/40 to-transparent'}`} />

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">

        {/* Top row: icon + status dot */}
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl ${color.bg} border ${color.border}`}>
            <MessageCircle className={`w-5 h-5 ${color.text}`} />
          </div>

          {/* Status dot + label */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${state.dot} shrink-0`} />
            <span className={`text-[10px] font-semibold tracking-wide ${state.text}`}>
              {state.label}
            </span>
          </div>
        </div>

        {/* Name + channel */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">{conn.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${color.bg} ${color.text} border ${color.border}`}>
              {CHANNEL_LABEL[conn.channel] ?? conn.channel}
            </span>
            {ownerRole === 'admin' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/5 text-sky-400 border border-sky-500/20">
                Admin
              </span>
            )}
            {(ownerRole === 'seller' || ownerRole === 'user') && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Seller
              </span>
            )}
          </div>
          {ownerName && (
            <p className="text-[10px] text-slate-600 mt-1 truncate">{ownerName}</p>
          )}
          {conn.external_id && (
            <button
              onClick={() => copy(conn.external_id!, 'Instance name')}
              className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors font-mono truncate max-w-full"
              title={conn.external_id}
            >
              <Copy className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{conn.external_id}</span>
            </button>
          )}
        </div>

        {/* QR warning (when disconnected) — no infrastructure URLs exposed to client */}
        {(evoState === 'close' || evoState === 'error') && conn.channel === 'whatsapp' && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-500/70">
            <QrCode className="w-3 h-3 shrink-0" />
            Use o botão Reconectar para vincular novamente
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 pb-4 flex items-center gap-2">
        {conn.channel === 'whatsapp' && (
          <button
            onClick={() => onHealthCheck(conn.id)}
            disabled={checking}
            title="Verificar status"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition-all duration-200 disabled:opacity-40 flex-1 justify-center"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            Verificar
          </button>
        )}

        {onDisconnect && (
          <button
            onClick={onDisconnect}
            title="Remover conexão"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/6 hover:bg-red-500/15 border border-red-500/15 hover:border-red-500/30 text-red-500/70 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Pagination ─────────────────────────────────────────────────────────── */

interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ page, total, perPage, onChange }) => {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
            p === page
              ? 'bg-blue-600/80 text-white border border-blue-500/40 shadow-sm shadow-blue-500/20'
              : 'text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

/* ─── Main Tab ──────────────────────────────────────────────────────────── */

interface ConexoesTabProps {
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenConnect?: () => void;
}

const ConexoesTab: React.FC<ConexoesTabProps> = ({ showNotification, onOpenConnect }) => {
  const { companyId, user, currentUserRole } = useAuth();
  const { limits, hasFeature, canCreate } = usePlanLimits();
  const { connections, loading, refetch, updateLocalState } = useChannelConnections(
    companyId,
    { userId: user?.id, role: currentUserRole ?? undefined }
  );

  // Isolamento estrito: apenas owner_id, sem fallback por prefixo de external_id
  const isMyConnection = (c: ChannelConnection) => c.owner_id === user?.id;

  const myConnection       = connections.find(isMyConnection) ?? null;
  const myConnectionExists = !!myConnection;
  const myConnectionIsDown = myConnectionExists &&
    myConnection!.evolutionState !== 'open' &&
    myConnection!.evolutionState !== 'connecting';

  const [checkingIds, setCheckingIds]         = useState<Set<string>>(new Set());
  const [lastCheck, setLastCheck]             = useState<string | null>(null);
  const [disconnecting, setDisconnecting]     = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [page, setPage]                       = useState(1);
  const [profileMap, setProfileMap]           = useState<Record<string, { role: string; name: string }>>({});

  // Carrega mapa userId→{role,name} para mostrar tags Admin/Seller nos cards (só admin precisa)
  useEffect(() => {
    if (currentUserRole !== 'admin' || !companyId) return;
    supabase
      .from('profiles')
      .select('id, role, name')
      .eq('company_id', companyId)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, { role: string; name: string }> = {};
        data.forEach((p: any) => { map[p.id] = { role: p.role, name: p.name }; });
        setProfileMap(map);
      });
  }, [currentUserRole, companyId]);

  // reset page when connections change
  useEffect(() => { setPage(1); }, [connections.length]);

  const handleHealthCheck = useCallback(async (id?: string) => {
    const ids = id ? [id] : connections.map(c => c.id);
    setCheckingIds(new Set(ids));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/channels/health', {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (!res.ok) throw new Error('Falha ao verificar saúde');
      const data = await res.json();
      (data.connections ?? []).forEach((c: any) => {
        if (!id || c.id === id) {
          updateLocalState(c.id, {
            evolutionState: c.evolution_state as any,
            evolution_error: c.evolution_error,
            lastHealthCheck: data.checked_at,
          } as any);
        }
      });
      setLastCheck(new Date().toLocaleTimeString('pt-BR'));
      showNotification('Verificação concluída!', 'success');
    } catch {
      showNotification('Erro ao verificar saúde das conexões.', 'error');
    } finally {
      setCheckingIds(new Set());
    }
  }, [connections, updateLocalState, showNotification]);

  const handleDisconnectById = useCallback(async (connectionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/channels/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ connectionId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      showNotification('Conexão removida com sucesso.', 'success');
      refetch();
    } catch (err: any) {
      showNotification(`Erro ao remover: ${err?.message ?? 'tente novamente'}`, 'error');
    }
  }, [showNotification, refetch]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/channels/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (!res.ok) throw new Error('Falha ao desconectar');
      showNotification('WhatsApp desconectado com sucesso.', 'success');
      refetch();
    } catch {
      showNotification('Erro ao desconectar. Tente novamente.', 'error');
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  }, [showNotification, refetch]);

  const handleReconnect = useCallback(async () => {
    if (!myConnection) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/channels/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ connectionId: myConnection.id }),
      });
      await refetch();
    } catch { /* abre modal mesmo assim */ }
    onOpenConnect?.();
  }, [myConnection, refetch, onOpenConnect]);

  const autoCheckedRef = useRef(false);
  useEffect(() => {
    if (!loading && connections.length > 0 && !autoCheckedRef.current) {
      autoCheckedRef.current = true;
      handleHealthCheck();
    }
  }, [loading, connections.length, handleHealthCheck]);

  // Paginação
  const totalPages  = Math.ceil(connections.length / ITEMS_PER_PAGE);
  const paged       = connections.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Stats
  const stats = {
    online:  connections.filter(c => (c as any).evolutionState === 'open').length,
    offline: connections.filter(c => ['close', 'error'].includes((c as any).evolutionState)).length,
    pending: connections.filter(c => !['open', 'close', 'error', 'connecting'].includes((c as any).evolutionState ?? '')).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Canais Conectados</h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {connections.length} {connections.length === 1 ? 'instância' : 'instâncias'}
            {lastCheck && <span className="ml-1.5 text-slate-700">· verificado {lastCheck}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenConnect && (() => {
            const waConnections = connections.filter(c => c.channel === 'whatsapp').length;
            const whatsappAllowed = hasFeature('has_whatsapp');
            const withinLimit    = canCreate('max_whatsapp_instances', waConnections);
            const canConnect     = whatsappAllowed && withinLimit;
            const lockReason     = !whatsappAllowed
              ? 'WhatsApp não está disponível no seu plano'
              : !withinLimit
              ? `Limite de ${limits?.max_whatsapp_instances} instância(s) atingido`
              : null;

            return !myConnectionExists ? (
              canConnect ? (
                <button
                  onClick={onOpenConnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/18 border border-emerald-500/20 text-emerald-400 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Conectar WhatsApp
                </button>
              ) : (
                <div
                  title={lockReason ?? ''}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-not-allowed select-none"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' }}
                >
                  <Lock className="w-3 h-3" />
                  WhatsApp — Upgrade necessário
                </div>
              )
            ) : myConnectionIsDown ? (
              <button
                onClick={handleReconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/18 border border-amber-500/20 text-amber-400 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconectar
              </button>
            ) : (
              <button
                onClick={() => setConfirmDisconnect(true)}
                disabled={disconnecting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/8 hover:bg-red-500/15 border border-red-500/15 text-red-500 hover:text-red-400 transition-all disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneOff className="w-3.5 h-3.5" />}
                Desconectar
              </button>
            );
          })()}
          <button
            onClick={() => handleHealthCheck()}
            disabled={checkingIds.size > 0 || connections.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition-all duration-200 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingIds.size > 0 ? 'animate-spin' : ''}`} />
            Verificar todos
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {connections.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Online',      count: stats.online,  icon: Wifi,     cls: 'text-emerald-400 border-emerald-500/15 bg-emerald-500/5' },
            { label: 'Offline',     count: stats.offline, icon: WifiOff,  cls: 'text-red-400     border-red-500/15     bg-red-500/5'     },
            { label: 'Sem status',  count: stats.pending, icon: Clock,    cls: 'text-slate-500   border-slate-700/40   bg-slate-800/30'  },
          ].map(({ label, count, icon: Icon, cls }) => (
            <div key={label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${cls}`}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <div>
                <div className="text-base font-bold leading-none">{count}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Grid ── */}
      {connections.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="p-4 rounded-2xl bg-white/3 border border-white/5 mb-4">
            <Zap className="w-7 h-7 text-slate-700" />
          </div>
          <p className="text-slate-400 font-medium text-sm">Nenhum canal conectado</p>
          <p className="text-slate-600 text-xs max-w-xs mt-1">
            Conecte um canal de WhatsApp para começar a receber mensagens.
          </p>
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              {paged.map((conn, i) => {
                const ownerProfile = conn.owner_id ? profileMap[conn.owner_id] : null;
                return (
                  <ConnCard
                    key={conn.id}
                    conn={conn as any}
                    index={i}
                    onHealthCheck={handleHealthCheck}
                    checking={checkingIds.has(conn.id)}
                    showNotification={showNotification}
                    ownerRole={(ownerProfile?.role as any) ?? null}
                    ownerName={ownerProfile?.name ?? null}
                    onDisconnect={
                      currentUserRole === 'admin' || isMyConnection(conn)
                        ? () => handleDisconnectById(conn.id)
                        : undefined
                    }
                  />
                );
              })}
            </motion.div>
          </AnimatePresence>

          <Pagination
            page={page}
            total={connections.length}
            perPage={ITEMS_PER_PAGE}
            onChange={setPage}
          />
        </>
      )}

      {/* ── Security note ── */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-500/4 border border-blue-500/10">
        <Shield className="w-3.5 h-3.5 text-blue-500/60 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 leading-relaxed">
          <span className="text-blue-500/70 font-medium">Isolamento garantido:</span>{' '}
          cada conexão está vinculada ao <code className="text-sky-400/60">company_id</code> via RLS.
          API Keys ficam no campo <code className="text-sky-400/60">config</code>, nunca expostas ao cliente.
        </p>
      </div>

      {/* ── Modal confirmação desconexão ── */}
      <AnimatePresence>
        {confirmDisconnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setConfirmDisconnect(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#0B1220] border border-slate-800/60 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/8 border border-red-500/15">
                  <PhoneOff className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Desconectar WhatsApp</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Isso encerrará o serviço de WhatsApp e removerá a instância da Evolution API. Continuar?
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmDisconnect(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-700/60 text-sm text-slate-400 hover:bg-white/4 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/18 border border-red-500/20 text-sm font-semibold text-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {disconnecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Desconectar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConexoesTab;
