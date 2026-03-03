import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from '@/src/lib/supabase';
import { AIToolId, AIToolConfig, DealCoachResult } from "../../features/ai/types";

export class AIService {
  private provider: 'gemini' | 'openai' | 'anthropic';
  private model: string;
  private apiKey: string;

  constructor(apiKey: string, model: string = "gemini-3-flash-preview") {
    this.apiKey = apiKey;
    this.model = model;
    
    if (model.includes('gpt') || model.includes('o1')) {
      this.provider = 'openai';
    } else if (model.includes('claude')) {
      this.provider = 'anthropic';
    } else {
      this.provider = 'gemini';
    }
  }

  public async generate(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      // If we have a real API key (from the test screen), use it directly
      if (this.apiKey && this.apiKey !== "********") {
        if (this.provider === 'gemini') {
          const genAI = new GoogleGenAI({ apiKey: this.apiKey });
          const response = await genAI.models.generateContent({
            model: this.model,
            contents: prompt,
            config: { systemInstruction },
          });
          return response.text || "";
        } else if (this.provider === 'openai') {
          const openai = new OpenAI({ apiKey: this.apiKey, dangerouslyAllowBrowser: true });
          const response = await openai.chat.completions.create({
            model: this.model,
            messages: [
              ...(systemInstruction ? [{ role: 'system', content: systemInstruction } as const] : []),
              { role: 'user', content: prompt }
            ],
          });
          return response.choices[0].message.content || "";
        } else if (this.provider === 'anthropic') {
          const anthropic = new Anthropic({ apiKey: this.apiKey, dangerouslyAllowBrowser: true });
          const response = await anthropic.messages.create({
            model: this.model,
            max_tokens: 4096,
            system: systemInstruction,
            messages: [{ role: 'user', content: prompt }],
          });
          const textPart = response.content.find(p => p.type === 'text');
          return textPart?.type === 'text' ? textPart.text : "";
        }
      }

      // Otherwise, use the backend proxy with stored credentials
      const { data: authData } = await supabase.auth.getUser();

const { data: profile } = await supabase
  .from('profiles')
  .select('company_id')
  .eq('id', authData?.user?.id)
  .single();

const response = await fetch('/api/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: profile?.company_id,
    prompt,
    systemInstruction
  })
});

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao gerar resposta via proxy');
      }

      const data = await response.json();
      return data.text || "";
    } catch (error) {
      console.error("AI Generation Error:", error);
      throw error;
    }
  }

  async runTool(tool: AIToolConfig, variables: Record<string, any>, systemInstruction?: string): Promise<string> {
    // Para sdr_vendas: se houver systemInstruction customizado, usa exclusivamente ele.
    // Para todas as outras tools: usa basePrompt normalmente.
    const useCustomPrompt = tool.id === 'sdr_vendas' && !!systemInstruction?.trim();
    let prompt = useCustomPrompt ? systemInstruction! : tool.basePrompt;

    // Simple variable replacement (continua funcionando em ambos os casos)
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return this.generate(prompt, useCustomPrompt ? undefined : systemInstruction);
  }

  async generateSalesScript(tool: AIToolConfig, dealTitle: string, scriptType: string, context: string): Promise<string> {
    return this.runTool(tool, { dealTitle, scriptType, context });
  }

  async generateDailyBriefing(tool: AIToolConfig, dataJson: string): Promise<string> {
    return this.runTool(tool, { dataJson });
  }

  async analyzeDeal(tool: AIToolConfig, dealTitle: string, dealValue: string, stageLabel: string, probability: number): Promise<DealCoachResult> {
    let prompt = tool.basePrompt;
    const variables = { dealTitle, dealValue, stageLabel, probability };
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
    });

    const responseText = await this.generate(prompt, "You are a sales coach. Respond ONLY with a JSON object.");

    try {
      return JSON.parse(responseText || "{}");
    } catch (e) {
      console.error("Failed to parse deal analysis JSON", e);
      throw new Error("Invalid AI response format");
    }
  }

  async generateEmailDraft(tool: AIToolConfig, contactName: string, companyName: string, dealTitle: string): Promise<string> {
    return this.runTool(tool, { contactName, companyName, dealTitle });
  }

  async handleObjection(tool: AIToolConfig, objection: string, dealTitle: string): Promise<string> {
    return this.runTool(tool, { objection, dealTitle });
  }

  async generateBoardStructure(tool: AIToolConfig, description: string, lifecycleJson: string): Promise<string> {
    return this.runTool(tool, { description, lifecycleJson });
  }

  async generateBoardStrategy(tool: AIToolConfig, boardName: string): Promise<string> {
    return this.runTool(tool, { boardName });
  }

  async refineBoard(tool: AIToolConfig, userInstruction: string, boardContext: string, historyContext: string): Promise<string> {
    return this.runTool(tool, { userInstruction, boardContext, historyContext });
  }
}

export const createAIService = (apiKey: string, model?: string) => {
  return new AIService(apiKey, model);
};
