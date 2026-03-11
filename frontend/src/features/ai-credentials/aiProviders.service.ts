import { supabase } from '@/src/lib/supabase';
import { AICredential, AIProviderId, TestConnectionResponse } from './aiProviders.types';

// ── Helper: obtém o JWT da sessão ativa ───────────────────────
// Lança erro se não houver sessão — o backend exige autenticação.
async function getAuthHeader(): Promise<{ Authorization: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

const API_BASE = '/api/ai';

export const aiProvidersService = {
  // organizationId removido dos parâmetros — o servidor deriva do JWT.
  async getCredentials(): Promise<Record<AIProviderId, AICredential>> {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_BASE}/credentials`, {
      headers: { ...auth },
    });
    if (!response.ok) throw new Error('Falha ao buscar credenciais.');
    return response.json();
  },

  async saveCredential(credential: Partial<AICredential>): Promise<void> {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_BASE}/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      // organizationId removido do body — o servidor usa o companyId do JWT.
      body: JSON.stringify({
        provider: credential.provider,
        apiKey: credential.apiKey,
        model: credential.model,
      }),
    });
    if (!response.ok) throw new Error('Falha ao salvar credencial.');
  },

  async disconnectCredential(provider: AIProviderId): Promise<void> {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_BASE}/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ action: 'disconnect', provider }),
    });
    if (!response.ok) throw new Error('Falha ao desconectar credencial.');
  },

  async testConnection(
    provider: AIProviderId,
    model: string,
    apiKey: string,
  ): Promise<TestConnectionResponse> {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_BASE}/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ provider, model, apiKey }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, message: error.message || 'Falha na conexão.' };
    }
    return response.json();
  },
};
