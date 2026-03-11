import React, { useMemo } from 'react';
import { Key, ShieldCheck, Info, Lock, CheckCircle2, Circle } from 'lucide-react';
import { useAIProviders } from './useAIProviders';
import { AIProviderCard } from './AIProviderCard';
import { AIProviderId } from './aiProviders.types';
import { useAuth } from '@/src/features/auth/AuthContext';
import FlatCard from '@/components/ui/FlatCard';

const PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  anthropic: 'Anthropic',
};

export const AIProvidersPage: React.FC = () => {
  const { currentPermissions } = useAuth();
  const { credentials, isLoading, updateCredential, saveCredential, testConnection, disconnectCredential } = useAIProviders();

  const providers: AIProviderId[] = ['openai', 'gemini', 'anthropic'];

  const connectedCount = useMemo(
    () => providers.filter(p => credentials[p]?.status === 'connected').length,
    [credentials]
  );

  if (!currentPermissions.canManageCredentials) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">IA configurada pela organização</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          As credenciais de inteligência artificial são gerenciadas pelo administrador da sua conta.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <FlatCard className="p-6 space-y-5">
      {/* Header compacto */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
          <Key className="w-5 h-5 text-sky-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Credenciais de IA</h1>
          <p className="text-slate-400 text-xs">Gerencie as chaves de API e modelos dos provedores</p>
        </div>
      </div>

      {/* Progresso de Integrações */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Progresso de Integrações</p>
        <div className="flex items-center gap-5 mb-2">
          {providers.map(p => {
            const isConnected = credentials[p]?.status === 'connected';
            return (
              <div key={p} className={`flex items-center gap-1.5 text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                {isConnected
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <Circle className="w-4 h-4" />
                }
                {PROVIDER_LABELS[p]}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">{connectedCount} de {providers.length} provedores configurados</p>
      </div>

      {/* Aviso de segurança compacto */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2.5 items-start">
        <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80">
          <span className="font-bold text-amber-200">Segurança: </span>
          Suas chaves são criptografadas antes de serem armazenadas e nunca exibidas em texto puro.
        </p>
      </div>

      {/* Grid 2 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map(providerId => (
          <AIProviderCard
            key={providerId}
            credential={credentials[providerId]}
            onUpdate={(updates) => updateCredential(providerId, updates)}
            onSave={() => saveCredential(providerId)}
            onTest={() => testConnection(providerId)}
            onDisconnect={() => disconnectCredential(providerId)}
          />
        ))}
      </div>

      {/* Nota de prioridade */}
      <div className="p-3 rounded-xl border border-white/10 bg-white/5 flex gap-2.5 items-start">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Caso múltiplos provedores estejam conectados, a prioridade segue a ordem: Gemini {'>'} OpenAI {'>'} Anthropic.
        </p>
      </div>
    </FlatCard>
  );
};
