import React, { useState, useMemo } from 'react';
import { Bot, Sparkles, AlertCircle, Loader2, Key } from 'lucide-react';
import { useAIState } from './hooks/useAIState';
import { AIToolCard } from './components/AIToolCard';
import { PromptEditorModal } from './components/PromptEditorModal';
import { AIToolId } from './types';
import { createAIService } from '@/src/services/ai';
import { useAIProviders } from '../ai-credentials/useAIProviders';

export const AIHubView: React.FC = () => {
  const { state, updateTool } = useAIState();
  const { credentials } = useAIProviders();
  const [editingToolId, setEditingToolId] = useState<AIToolId | null>(null);
  const [isTesting, setIsTesting] = useState<AIToolId | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const toolsList = Object.values(state.tools);

  const activeCredential = useMemo(() => {
    if (credentials.gemini.status === 'connected') return credentials.gemini;
    if (credentials.openai.status === 'connected') return credentials.openai;
    if (credentials.anthropic.status === 'connected') return credentials.anthropic;
    return null;
  }, [credentials]);

  const handleTest = async (toolId: AIToolId) => {
    if (!activeCredential) {
      alert('Nenhum provedor de IA conectado. Configure suas credenciais na aba "Credenciais de IA".');
      return;
    }

    setIsTesting(toolId);
    setTestResult(null);

    try {
      // Note: In a real app, the service would handle different providers.
      // For this demo, we'll assume it uses the active credential.
      const service = createAIService(activeCredential.apiKey, activeCredential.model);
      const tool = state.tools[toolId];
      
      // Mock variables for testing
      const mockVars = {
        scriptType: 'Primeiro Contato',
        dealTitle: 'Projeto Solar Residencial',
        context: 'Lead interessado em reduzir conta de luz em 90%',
        dataJson: JSON.stringify({ leads: 5, tasks: 2, value: 50000 }),
        dealValue: '50.000',
        stageLabel: 'Qualificação',
        probability: '60',
        contactName: 'João Silva',
        companyName: 'Silva & Co',
        objection: 'O preço está um pouco alto',
        description: 'Venda de software SaaS B2B',
        lifecycleJson: JSON.stringify(['Prospecção', 'Demo', 'Proposta', 'Fechamento']),
        boardName: 'Vendas Diretas',
        userInstruction: 'Adicione um estágio de Prova de Conceito',
        boardContext: 'Board atual com 4 estágios',
        historyContext: 'Nenhum histórico disponível'
      };

      const result = await service.runTool(tool, mockVars);
      setTestResult(result);
    } catch (error: any) {
      setTestResult(`Erro: ${error.message}`);
    } finally {
      setIsTesting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
          <Bot className="w-5 h-5 text-sky-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Inteligência Artificial</h1>
          <p className="text-slate-400 text-xs">Personalize os prompts e comportamentos das funções de IA</p>
        </div>
      </div>

      {/* Connection Status Info */}
      {!activeCredential ? (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white mb-1">IA Desativada</h3>
            <p className="text-xs text-slate-400 mb-3">Você precisa configurar ao menos uma API Key para ativar as funções de inteligência artificial.</p>
            <button 
              onClick={() => {
                // This is a bit hacky since we don't have direct access to setActiveTab here
                // but in a real app we would use a context or routing
                const event = new CustomEvent('changeSettingsTab', { detail: 'Credenciais de IA' });
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              <Key className="w-4 h-4" />
              Configurar Credenciais
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-sm text-emerald-400 font-medium">
            Sistema ativo usando <span className="font-bold">{activeCredential.provider === 'gemini' ? 'Google Gemini' : activeCredential.provider === 'openai' ? 'OpenAI' : 'Anthropic'}</span> ({activeCredential.model})
          </p>
        </div>
      )}

      {/* Tools Grid */}
      <div
        className="p-4 rounded-xl border border-white/10"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <h3 className="text-sm font-bold text-white">Funções de IA</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Ative ou desative as ferramentas e personalize os prompts para cada uma delas.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {toolsList.map((tool: any) => (
            <AIToolCard 
              key={tool.id}
              tool={tool}
              onToggle={(enabled) => updateTool(tool.id, { enabled })}
              onEditPrompt={() => setEditingToolId(tool.id)}
              onTest={() => handleTest(tool.id)}
            />
          ))}
        </div>
      </div>

      {/* Test Result Section */}
      {testResult && (
        <div 
          className="p-6 rounded-2xl border border-white/10 bg-black/20"
          style={{
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Resultado do Teste</h3>
            <button 
              onClick={() => setTestResult(null)}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              Limpar
            </button>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-sm text-slate-300 whitespace-pre-wrap font-mono">
            {testResult}
          </div>
        </div>
      )}

      {/* Loading Overlay for Testing */}
      {isTesting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            <p className="text-white font-medium">Gerando resposta...</p>
          </div>
        </div>
      )}

      {/* Prompt Editor Modal */}
      {editingToolId && (
        <PromptEditorModal 
          isOpen={!!editingToolId}
          onClose={() => setEditingToolId(null)}
          toolName={state.tools[editingToolId].name}
          initialPrompt={state.tools[editingToolId].basePrompt}
          onSave={(newPrompt) => updateTool(editingToolId, { basePrompt: newPrompt })}
        />
      )}
    </div>
  );
};
