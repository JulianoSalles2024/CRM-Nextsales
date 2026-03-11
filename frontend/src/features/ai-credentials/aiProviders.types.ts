export type AIProviderId = 'openai' | 'gemini' | 'anthropic';

export type ConnectionStatus = 'connected' | 'invalid' | 'not_configured' | 'testing';

export interface AICredential {
  provider: AIProviderId;
  apiKey: string;
  model: string;
  status: ConnectionStatus;
  lastTested?: string;
  inputPrice?: number;
  outputPrice?: number;
}

export interface AIProvidersState {
  credentials: Record<AIProviderId, AICredential>;
  organizationId: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}
