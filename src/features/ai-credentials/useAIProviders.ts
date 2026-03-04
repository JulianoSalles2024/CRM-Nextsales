import { useState, useEffect, useCallback } from 'react';
import { AICredential, AIProviderId, ConnectionStatus } from './aiProviders.types';
import { aiProvidersService } from './aiProviders.service';
import { MODELS_REGISTRY } from './models.registry';
import { useAuth } from '@/src/features/auth/AuthContext';

export const useAIProviders = () => {
  const { companyId } = useAuth();

  const [credentials, setCredentials] = useState<Record<AIProviderId, AICredential>>({
    openai: { provider: 'openai', apiKey: '', model: 'gpt-5-mini', status: 'not_configured' },
    gemini: { provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash', status: 'not_configured' },
    anthropic: { provider: 'anthropic', apiKey: '', model: 'claude-sonnet-4.5', status: 'not_configured' },
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadCredentials = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await aiProvidersService.getCredentials(companyId);

      // Merge with defaults to ensure all providers are present
      setCredentials(prev => ({
        ...prev,
        ...data
      }));
    } catch (error) {
      safeError('Error loading credentials:', error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const updateCredential = (provider: AIProviderId, updates: Partial<AICredential>) => {
    setCredentials(prev => ({
      ...prev,
      [provider]: { ...prev[provider], ...updates }
    }));
  };

  const saveCredential = async (provider: AIProviderId) => {
    if (!companyId) return;
    try {
      const credential = credentials[provider];
      await aiProvidersService.saveCredential(credential, companyId);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      safeError('Error saving credential:', error);
      alert('Erro ao salvar configurações.');
      throw error;
    }
  };

  const testConnection = async (provider: AIProviderId) => {
    const credential = credentials[provider];
    if (!credential.apiKey) {
      alert('Por favor, insira uma API Key antes de testar.');
      return;
    }

    updateCredential(provider, { status: 'testing' });

    try {
      const result = await aiProvidersService.testConnection(
        provider,
        credential.model,
        credential.apiKey
      );

      updateCredential(provider, { 
        status: result.success ? 'connected' : 'invalid'
      });
      
      if (result.success) {
        alert(result.message);
      } else {
        alert(`Falha no teste: ${result.message}`);
      }
      
      return result;
    } catch (error: any) {
      updateCredential(provider, { status: 'invalid' });
      alert('Erro técnico ao tentar conectar com o servidor.');
      return { success: false, message: 'Erro ao testar conexão' };
    }
  };

  const disconnectCredential = async (provider: AIProviderId) => {
    if (!companyId) return;
    try {
      await aiProvidersService.disconnectCredential(provider, companyId);
      updateCredential(provider, { apiKey: '', status: 'not_configured' });
    } catch (error) {
      safeError('Error disconnecting credential:', error);
      alert('Erro ao desconectar.');
      throw error;
    }
  };

  return {
    credentials,
    isLoading,
    updateCredential,
    saveCredential,
    testConnection,
    disconnectCredential,
    refresh: loadCredentials
  };
};
