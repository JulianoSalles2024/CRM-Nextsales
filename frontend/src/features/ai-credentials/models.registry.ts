export interface AIModel {
  id: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  name: string;
  inputPrice: number; // Price per 1M tokens
  outputPrice: number; // Price per 1M tokens
  recommended?: boolean;
}

export const MODELS_REGISTRY: AIModel[] = [
  // OPENAI
  {
    id: 'gpt-5-mini',
    provider: 'openai',
    name: 'GPT-5 Mini',
    inputPrice: 0.25,
    outputPrice: 2.00,
    recommended: true,
  },
  {
    id: 'gpt-5-nano',
    provider: 'openai',
    name: 'GPT-5 Nano',
    inputPrice: 0.05,
    outputPrice: 0.40,
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    inputPrice: 2.50,
    outputPrice: 10.00,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    inputPrice: 0.15,
    outputPrice: 0.60,
  },

  // GEMINI
  {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    name: 'Gemini 2.5 Flash',
    inputPrice: 0.30,
    outputPrice: 2.50,
    recommended: true,
  },
  {
    id: 'gemini-2.5-flash-lite',
    provider: 'gemini',
    name: 'Gemini 2.5 Flash Lite',
    inputPrice: 0.10,
    outputPrice: 0.40,
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    name: 'Gemini 2.5 Pro',
    inputPrice: 1.25,
    outputPrice: 10.00,
  },
  {
    id: 'gemini-3-pro-preview',
    provider: 'gemini',
    name: 'Gemini 3 Pro (Preview)',
    inputPrice: 2.00,
    outputPrice: 12.00,
  },

  // ANTHROPIC
  {
    id: 'claude-sonnet-4.5',
    provider: 'anthropic',
    name: 'Claude Sonnet 4.5',
    inputPrice: 3.00,
    outputPrice: 15.00,
    recommended: true,
  },
  {
    id: 'claude-haiku-4.5',
    provider: 'anthropic',
    name: 'Claude Haiku 4.5',
    inputPrice: 1.00,
    outputPrice: 5.00,
  },
  {
    id: 'claude-opus-4.5',
    provider: 'anthropic',
    name: 'Claude Opus 4.5',
    inputPrice: 5.00,
    outputPrice: 25.00,
  },
];
