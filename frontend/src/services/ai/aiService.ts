import { supabase } from '@/src/lib/supabase';
import { AIToolConfig, DealCoachResult } from "../../features/ai/types";
import { safeError } from '@/src/utils/logger';

// ── AIService ─────────────────────────────────────────────────
//
// Este serviço é o único ponto de chamada de IA no frontend.
// Ele NÃO instancia SDKs de IA diretamente no browser.
// Toda geração passa pelo proxy seguro /api/ai/generate,
// que roda no servidor e mantém as API keys fora do browser.
//
// Os parâmetros apiKey e model são mantidos na assinatura do
// construtor apenas para compatibilidade com chamadas existentes
// (createAIService(credential.apiKey, credential.model)).
// Eles NÃO são usados para instanciar SDKs — o servidor
// usa as credenciais armazenadas no banco para a empresa autenticada.

export class AIService {
  constructor(
    private readonly apiKey: string,
    private readonly model?: string,
  ) {}

  // ── Método central: toda geração passa por aqui ──────────
  public async generate(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Usuário não autenticado. Faça login para usar as funções de IA.');
      }

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // JWT no header — o servidor valida e deriva o companyId.
          // Nenhuma API key trafega do browser para o servidor.
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt, systemInstruction }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erro desconhecido.' }));
        throw new Error(err.error || 'Falha ao gerar resposta.');
      }

      const data = await response.json();
      return data.text || "";
    } catch (error) {
      safeError("AI Generation Error:", error);
      throw error;
    }
  }

  async runTool(
    tool: AIToolConfig,
    variables: Record<string, any>,
    systemInstruction?: string,
  ): Promise<string> {
    const useCustomPrompt = tool.id === 'sdr_vendas' && !!systemInstruction?.trim();
    let prompt = useCustomPrompt ? systemInstruction! : tool.basePrompt;

    Object.entries(variables).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    return this.generate(prompt, useCustomPrompt ? undefined : systemInstruction);
  }

  async generateSalesScript(
    tool: AIToolConfig,
    dealTitle: string,
    scriptType: string,
    context: string,
  ): Promise<string> {
    return this.runTool(tool, { dealTitle, scriptType, context });
  }

  async generateDailyBriefing(tool: AIToolConfig, dataJson: string): Promise<string> {
    return this.runTool(tool, { dataJson });
  }

  async analyzeDeal(
    tool: AIToolConfig,
    dealTitle: string,
    dealValue: string,
    stageLabel: string,
    probability: number,
  ): Promise<DealCoachResult> {
    let prompt = tool.basePrompt;
    const variables = { dealTitle, dealValue, stageLabel, probability };

    Object.entries(variables).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    const responseText = await this.generate(
      prompt,
      "You are a sales coach. Respond ONLY with a JSON object.",
    );

    try {
      return JSON.parse(responseText || "{}");
    } catch (e) {
      safeError("Failed to parse deal analysis JSON", e);
      throw new Error("Invalid AI response format");
    }
  }

  async generateEmailDraft(
    tool: AIToolConfig,
    contactName: string,
    companyName: string,
    dealTitle: string,
  ): Promise<string> {
    return this.runTool(tool, { contactName, companyName, dealTitle });
  }

  async handleObjection(
    tool: AIToolConfig,
    objection: string,
    dealTitle: string,
  ): Promise<string> {
    return this.runTool(tool, { objection, dealTitle });
  }

  async generateBoardStructure(
    tool: AIToolConfig,
    description: string,
    lifecycleJson: string,
  ): Promise<string> {
    return this.runTool(tool, { description, lifecycleJson });
  }

  async generateBoardStrategy(tool: AIToolConfig, boardName: string): Promise<string> {
    return this.runTool(tool, { boardName });
  }

  async refineBoard(
    tool: AIToolConfig,
    userInstruction: string,
    boardContext: string,
    historyContext: string,
  ): Promise<string> {
    return this.runTool(tool, { userInstruction, boardContext, historyContext });
  }
}

export const createAIService = (apiKey: string, model?: string) => {
  return new AIService(apiKey, model);
};
