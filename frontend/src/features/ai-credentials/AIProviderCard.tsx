import React, { useMemo, useState } from 'react';
import { AICredential } from './aiProviders.types';
import { MODELS_REGISTRY } from './models.registry';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Save, Zap, Unplug, ChevronDown, ChevronUp } from 'lucide-react';
import { ui } from '@/src/lib/uiStyles';

interface AIProviderCardProps {
  credential: AICredential;
  onUpdate: (updates: Partial<AICredential>) => void;
  onSave: () => Promise<void>;
  onTest: () => Promise<any>;
  onDisconnect: () => Promise<void>;
}

export const AIProviderCard: React.FC<AIProviderCardProps> = ({
  credential,
  onUpdate,
  onSave,
  onTest,
  onDisconnect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const providerModels = useMemo(() =>
    MODELS_REGISTRY.filter(m => m.provider === credential.provider),
    [credential.provider]
  );

  const selectedModel = useMemo(() =>
    MODELS_REGISTRY.find(m => m.id === credential.model),
    [credential.model]
  );

  const statusConfig = {
    connected: {
      badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
      icon: CheckCircle2,
      label: 'Conectado',
    },
    invalid: {
      badge: 'bg-red-500/15 text-red-400 border border-red-500/20',
      icon: XCircle,
      label: 'Inválido',
    },
    not_configured: {
      badge: 'bg-slate-700/40 text-slate-400 border border-slate-600/30',
      icon: AlertCircle,
      label: 'Não configurado',
    },
    testing: {
      badge: 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
      icon: Loader2,
      label: 'Testando...',
    },
  };

  const config = statusConfig[credential.status];
  const StatusIcon = config.icon;

  const providerNames = {
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    anthropic: 'Anthropic',
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${credential.status === 'connected' ? 'border-emerald-500/20' : 'border-white/10'}`}
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Header — sempre visível */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/5">
            <Zap className={`w-4 h-4 ${credential.status === 'connected' ? 'text-sky-500' : 'text-slate-500'}`} />
          </div>
          <span className="text-sm font-bold text-white">{providerNames[credential.provider]}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${config.badge}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${credential.status === 'testing' ? 'animate-spin' : ''}`} />
          {config.label}
        </div>
      </div>

      {/* Resumo do modelo + botão Configurar — sempre visível */}
      <div className="flex items-center justify-between px-4 pb-3 gap-2">
        <p className="text-xs text-slate-400 truncate">
          Modelo: <span className="text-slate-300 font-medium">{selectedModel?.name ?? credential.model}</span>
        </p>
        <button
          onClick={() => setIsExpanded(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors flex-shrink-0"
        >
          {isExpanded ? 'Fechar' : 'Configurar'}
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Formulário expansível */}
      {isExpanded && (
        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modelo</label>
              <select
                value={credential.model}
                onChange={(e) => onUpdate({ model: e.target.value })}
                className={ui.input}
              >
                {providerModels.map(model => (
                  <option key={model.id} value={model.id} className="bg-slate-900">
                    {model.name}{model.recommended ? ' (Recomendado)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preço / 1M tokens</label>
              <div className="flex items-center h-[34px] px-3 rounded-lg bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
                In: ${selectedModel?.inputPrice.toFixed(2)} · Out: ${selectedModel?.outputPrice.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">API Key</label>
            <input
              type="password"
              value={credential.apiKey}
              onChange={(e) => onUpdate({ apiKey: e.target.value })}
              placeholder={`Chave ${providerNames[credential.provider]}...`}
              className={ui.input}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onTest}
              disabled={credential.status === 'testing' || !credential.apiKey}
              className={`${ui.buttonSecondary} flex-1 disabled:opacity-50`}
            >
              Testar Conexão
            </button>
            {credential.status === 'connected' && (
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-red-600/15 hover:bg-red-600/30 text-red-400 border border-red-500/20 transition-all"
              >
                <Unplug className="w-3.5 h-3.5" />
                Desconectar
              </button>
            )}
            <button
              onClick={onSave}
              disabled={credential.status === 'testing'}
              className={`${ui.buttonPrimary} flex items-center gap-1.5 disabled:opacity-50`}
            >
              <Save className="w-3.5 h-3.5" />
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
