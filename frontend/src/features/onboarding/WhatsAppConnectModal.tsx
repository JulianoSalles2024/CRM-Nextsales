import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  MessageCircle, CheckCircle2, AlertCircle, RefreshCw, X, Smartphone, Wifi, Bot, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Step = 'loading' | 'qr' | 'connected' | 'error';

interface Props {
  onClose: () => void;
  onConnected: () => void;
  onGoToAgents?: () => void;
  userName?: string;
}

const QR_TTL = 28;
const POLL_INTERVAL = 5000;

/* ─── Component ─────────────────────────────────────────────────────────── */
const WhatsAppConnectModal: React.FC<Props> = ({ onClose, onConnected, onGoToAgents, userName }) => {
  const [step, setStep] = useState<Step>('loading');
  // qrValue: raw string para QRCodeSVG | base64 PNG fallback
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [qrIsBase64, setQrIsBase64] = useState(false);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(QR_TTL);
  const [errorMsg, setErrorMsg] = useState('');
  const [registering, setRegistering] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  /* Aplica o QR recebido — prefere raw code, fallback para base64 */
  const applyQR = (code: string | null, base64: string | null) => {
    if (code) {
      setQrValue(code);
      setQrIsBase64(false);
    } else if (base64) {
      setQrValue(base64);
      setQrIsBase64(true);
    }
  };

  /* ── 1. Criar instância + obter QR ───────────────────────────────────── */
  const startConnect = useCallback(async () => {
    setStep('loading');
    setQrValue(null);
    setErrorMsg('');
    stopTimers();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/channels/connect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Erro ${res.status}`);
      }
      const data = await res.json();
      setInstanceName(data.instanceName);

      // Instância já conectada (ex: usuário re-abriu o modal) — registra direto
      if (data.alreadyConnected) {
        await registerConnection(data.instanceName);
        return;
      }

      if (data.code || data.base64) {
        applyQR(data.code ?? null, data.base64 ?? null);
        setStep('qr');
        startPolling(data.instanceName);
        startCountdown(data.instanceName);
      } else {
        throw new Error('QR code não retornado pela Evolution API. Verifique as configurações da instância.');
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro desconhecido.');
      setStep('error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 2. Polling de estado ─────────────────────────────────────────────── */
  const startPolling = useCallback((name: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/channels/instance-state?name=${encodeURIComponent(name)}`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.state === 'open') {
          stopTimers();
          await registerConnection(name);
        } else if (data.code || data.base64) {
          applyQR(data.code ?? null, data.base64 ?? null);
          setCountdown(QR_TTL);
        }
      } catch { /* ignora erros de rede no polling */ }
    }, POLL_INTERVAL);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 3. Countdown + refresh de QR ───────────────────────────────────── */
  const startCountdown = useCallback((name: string) => {
    setCountdown(QR_TTL);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshQR(name);
          return QR_TTL;
        }
        return prev - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshQR = async (name: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/channels/instance-state?name=${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code || data.base64) applyQR(data.code ?? null, data.base64 ?? null);
        if (data.state === 'open') { stopTimers(); await registerConnection(name); }
      }
    } catch { /* ignora */ }
  };

  /* ── 4. Registrar no banco ───────────────────────────────────────────── */
  const registerConnection = async (name: string) => {
    if (registering) return;
    setRegistering(true);
    setStep('connected');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/channels/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ instanceName: name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Registro falhou (HTTP ${res.status})`);
      }
      // Não fecha automaticamente — mostra o próximo passo (criar agente)
    } catch (err: any) {
      setRegistering(false);
      setErrorMsg(err?.message ?? 'Erro ao registrar conexão no banco.');
      setStep('error');
    }
  };

  useEffect(() => {
    startConnect();
    return stopTimers;
  }, []);

  /* ── UI ──────────────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#0B1220] border border-white/8 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Conectar WhatsApp</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {userName ? `Olá, ${userName.split(' ')[0]}!` : 'Seu número pessoal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">

            {/* ── Loading ──────────────────────────────────────────────── */}
            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center py-10 gap-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0B1220] border border-white/10 flex items-center justify-center">
                    <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Preparando sua instância…</p>
                  <p className="text-xs text-slate-500 mt-1">Isso leva alguns segundos</p>
                </div>
              </motion.div>
            )}

            {/* ── QR Code ──────────────────────────────────────────────── */}
            {step === 'qr' && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Instruções */}
                <div className="space-y-2">
                  {[
                    { n: 1, text: 'Abra o WhatsApp no seu celular' },
                    { n: 2, text: 'Toque em Dispositivos conectados → Conectar dispositivo' },
                    { n: 3, text: 'Aponte a câmera para o QR code abaixo' },
                  ].map(({ n, text }) => (
                    <div key={n} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">{n}</span>
                      <span className="text-xs text-slate-400">{text}</span>
                    </div>
                  ))}
                </div>

                {/* QR */}
                <div className="relative">
                  {qrValue && (
                    <div className="rounded-xl overflow-hidden border border-white/8 bg-white p-3 flex items-center justify-center">
                      {qrIsBase64 ? (
                        <img src={qrValue} alt="QR Code WhatsApp" className="w-full aspect-square object-contain" />
                      ) : (
                        <QRCodeSVG
                          value={qrValue}
                          size={280}
                          level="M"
                          className="w-full h-auto"
                        />
                      )}
                    </div>
                  )}

                  {/* Countdown overlay */}
                  <div className="absolute bottom-3 right-3">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold backdrop-blur-sm ${
                      countdown <= 5
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-black/40 text-slate-400 border border-white/10'
                    }`}>
                      <RefreshCw className="w-2.5 h-2.5" />
                      {countdown}s
                    </div>
                  </div>
                </div>

                {/* Polling indicator */}
                <div className="flex items-center justify-center gap-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-slate-600">Aguardando conexão…</span>
                </div>

                {/* Retry */}
                <button
                  onClick={startConnect}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  QR não carregou? Clique para gerar novo
                </button>
              </motion.div>
            )}

            {/* ── Connected ────────────────────────────────────────────── */}
            {step === 'connected' && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-4 py-2"
              >
                {/* Sucesso */}
                <div className="flex flex-col items-center gap-3 py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-white font-semibold">WhatsApp conectado!</p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <Wifi className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs text-emerald-400">Online</span>
                    </div>
                  </div>
                </div>

                {/* Próximo passo — criar agente */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">Próximo passo: criar seu agente de IA</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Sem um agente configurado, o WhatsApp recebe mensagens mas não responde automaticamente.
                      </p>
                    </div>
                  </div>
                  {onGoToAgents && (
                    <button
                      onClick={() => { onConnected(); onGoToAgents(); }}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-sky-400 border border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/50 transition-all"
                    >
                      <Bot className="w-4 h-4" />
                      Criar agente agora
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>

                {/* Fechar sem criar agente */}
                <button
                  onClick={onConnected}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors text-center"
                >
                  Criar agente depois
                </button>
              </motion.div>
            )}

            {/* ── Error ────────────────────────────────────────────────── */}
            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center py-8 gap-4"
              >
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-center space-y-2 w-full">
                  <p className="text-white font-medium">Não foi possível conectar</p>
                  {errorMsg && (
                    <div className="mx-auto max-w-xs px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15 text-left">
                      <p className="text-xs text-red-300 leading-relaxed break-words">{errorMsg}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={startConnect}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 text-sm text-slate-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tentar novamente
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer — info de segurança */}
        {(step === 'qr' || step === 'loading') && (
          <div className="px-6 py-3 border-t border-white/5 flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <p className="text-[11px] text-slate-600">
              Cada vendedor conecta seu próprio número. Nenhuma mensagem pessoal é acessada.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default WhatsAppConnectModal;
