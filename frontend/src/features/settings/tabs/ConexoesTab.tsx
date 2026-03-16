import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Wifi, WifiOff, Loader2, RefreshCw, Plus,
  QrCode, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp,
  Shield, Zap, ExternalLink, Copy, Info, PhoneOff,
} from 'lucide-react';
import { useChannelConnections, ChannelConnection } from '@/src/hooks/useChannelConnections';
import { useAuth } from '@/src/features/auth/AuthContext';
import { supabase } from '@/src/lib/supabase';

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  instagram: 'Instagram',
  telegram: 'Telegram',
  webchat: 'Web Chat',
};

const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  email: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  instagram: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  telegram: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  webchat: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

type EvoState = 'open' | 'connecting' | 'close' | 'error' | 'unknown' | 'checking';

function EvoStateBadge({ state }: { state: EvoState }) {
  const map: Record<EvoState, { label: string; cls: string; icon: React.ElementType }> = {
    open:       { label: 'Conectado',     cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
    connecting: { label: 'Conectando',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30',       icon: Loader2 },
    close:      { label: 'Desconectado', cls: 'text-red-400 bg-red-500/10 border-red-500/30',             icon: WifiOff },
    error:      { label: 'Erro',         cls: 'text-red-400 bg-red-500/10 border-red-500/30',             icon: AlertCircle },
    checking:   { label: 'Verificando',  cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30',       icon: Loader2 },
    unknown:    { label: 'Desconhecido', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30',       icon: Info },
  };
  const { label, cls, icon: Icon } = map[state] ?? map.unknown;
  const spin = state === 'connecting' || state === 'checking';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className={`w-3 h-3 ${spin ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

/* ─── Connection Card ───────────────────────────────────────────────────── */
interface ConnCardProps {
  conn: ChannelConnection & { evolutionState?: EvoState; evolution_error?: string };
  onHealthCheck: (id: string) => void;
  checking: boolean;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ConnCard: React.FC<ConnCardProps> = ({ conn, onHealthCheck, checking, showNotification }) => {
  const [expanded, setExpanded] = useState(false);
  const channelCls = CHANNEL_COLOR[conn.channel] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  const evoState: EvoState = checking ? 'checking' : (conn.evolutionState as EvoState) ?? 'unknown';

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v);
    showNotification(`${label} copiado!`, 'info');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0B1220] border border-white/6 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 flex items-center gap-4">
        {/* Channel badge */}
        <div className={`p-2.5 rounded-xl border ${channelCls}`}>
          <MessageCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold">{conn.name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${channelCls}`}>
              {CHANNEL_LABEL[conn.channel] ?? conn.channel}
            </span>
          </div>
          {conn.external_id && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-slate-500 font-mono">{conn.external_id}</span>
              <button
                onClick={() => copy(conn.external_id!, 'Instance name')}
                className="text-slate-600 hover:text-slate-400 transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <EvoStateBadge state={evoState} />

          {/* Health check */}
          {conn.channel === 'whatsapp' && (
            <button
              onClick={() => onHealthCheck(conn.id)}
              disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
              Verificar
            </button>
          )}

          {/* Expand */}
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-white/5"
          >
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalhes</h4>

                <div className="space-y-2">
                  {[
                    { label: 'Status DB', value: conn.status },
                    { label: 'Ativo', value: conn.is_active ? 'Sim' : 'Não' },
                    { label: 'Criado em', value: new Date(conn.created_at).toLocaleString('pt-BR') },
                    { label: 'Atualizado', value: new Date(conn.updated_at).toLocaleString('pt-BR') },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-slate-300 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evolution API</h4>
                <div className="space-y-2">
                  {conn.evolution_error ? (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-300">{conn.evolution_error}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-white/3 border border-white/5">
                      <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-400">
                        Configuração isolada por empresa. API Key armazenada no campo <code className="text-blue-400">config</code> da conexão.
                      </span>
                    </div>
                  )}
                  {conn.config?.evolution_url && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">URL:</span>
                      <span className="text-slate-300 font-mono truncate">{conn.config.evolution_url}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code placeholder (shown when state is close/connecting) */}
            {(evoState === 'close' || evoState === 'connecting') && conn.channel === 'whatsapp' && (
              <div className="mx-5 mb-5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">Instância desconectada</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Para reconectar, acesse o painel da Evolution API e escaneie o QR Code com o WhatsApp.
                </p>
                {conn.config?.evolution_url && conn.external_id && (
                  <a
                    href={`${conn.config.evolution_url}/manager`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Abrir painel Evolution API <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── Main Tab ──────────────────────────────────────────────────────────── */
interface ConexoesTabProps {
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenConnect?: () => void;
}

const ConexoesTab: React.FC<ConexoesTabProps> = ({ showNotification, onOpenConnect }) => {
  const { companyId, user } = useAuth();
  const { connections, loading, refetch, updateLocalState } = useChannelConnections(companyId);
  const myConnectionExists = connections.some((c: any) => c.owner_id === user?.id);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

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

  const autoCheckedRef = useRef(false);

  // Auto-verifica ao montar, uma única vez quando as conexões carregam
  useEffect(() => {
    if (!loading && connections.length > 0 && !autoCheckedRef.current) {
      autoCheckedRef.current = true;
      handleHealthCheck();
    }
  }, [loading, connections.length, handleHealthCheck]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Canais Conectados</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {connections.length} {connections.length === 1 ? 'conexão registrada' : 'conexões registradas'}
            {lastCheck && <span className="ml-2 text-slate-600">· verificado às {lastCheck}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenConnect && (
            myConnectionExists ? (
              <button
                onClick={() => setConfirmDisconnect(true)}
                disabled={disconnecting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all disabled:opacity-50"
              >
                {disconnecting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <PhoneOff className="w-3.5 h-3.5" />}
                Desconectar WhatsApp
              </button>
            ) : (
              <button
                onClick={onOpenConnect}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Conectar meu WhatsApp
              </button>
            )
          )}
          <button
            onClick={() => handleHealthCheck()}
            disabled={checkingIds.size > 0 || connections.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/8 border border-white/8 text-slate-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingIds.size > 0 ? 'animate-spin' : ''}`} />
            Verificar todos
          </button>
        </div>
      </div>

      {/* Status summary bar */}
      {connections.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Conectados',
              count: connections.filter(c => c.evolutionState === 'open').length,
              cls: 'text-emerald-400 bg-emerald-500/8 border-emerald-500/15',
              icon: Wifi,
            },
            {
              label: 'Desconectados',
              count: connections.filter(c => c.evolutionState === 'close' || c.evolutionState === 'error').length,
              cls: 'text-red-400 bg-red-500/8 border-red-500/15',
              icon: WifiOff,
            },
            {
              label: 'Sem verificação',
              count: connections.filter(c => !c.evolutionState || c.evolutionState === 'unknown').length,
              cls: 'text-slate-400 bg-slate-500/8 border-slate-500/15',
              icon: Clock,
            },
          ].map(({ label, count, cls, icon: Icon }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-xl border ${cls}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-lg font-bold">{count}</div>
                <div className="text-[10px] font-medium opacity-80">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connection cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {connections.map(conn => (
            <ConnCard
              key={conn.id}
              conn={conn as any}
              onHealthCheck={handleHealthCheck}
              checking={checkingIds.has(conn.id)}
              showNotification={showNotification}
            />
          ))}
        </AnimatePresence>

        {connections.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="p-4 rounded-2xl bg-white/3 border border-white/5 mb-4">
              <Zap className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium mb-1">Nenhum canal conectado</p>
            <p className="text-slate-600 text-sm max-w-xs">
              Conecte um canal de WhatsApp, e-mail ou outro para começar a receber mensagens.
            </p>
            <p className="text-xs text-slate-700 mt-3">
              Registre a instância via Evolution API e ela aparecerá aqui automaticamente.
            </p>
          </motion.div>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
        <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <span className="text-blue-400 font-semibold">Isolamento garantido:</span>{' '}
          cada conexão está vinculada ao seu <code className="text-blue-300">company_id</code> via RLS no Supabase.
          Nenhum dado de outra empresa é acessível. API Keys da Evolution API ficam armazenadas no campo <code className="text-blue-300">config</code> da conexão, nunca expostas ao cliente.
        </div>
      </div>

      {/* Modal de confirmação de desconexão */}
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
              className="bg-[#0B1220] border border-white/8 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <PhoneOff className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Desconectar WhatsApp</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">
                Isso irá encerrar o serviço de WhatsApp para sua conta e remover a instância da Evolution API.
                Deseja continuar?
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setConfirmDisconnect(false)}
                  className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex-1 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-sm font-semibold text-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
