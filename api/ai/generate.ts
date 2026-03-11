import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';
import { AppError, apiError } from '../_lib/errors.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── 1. Autenticação — companyId vem do JWT, nunca do body ─
    const ctx = await requireAuth(req);

    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      throw new AppError(400, 'prompt é obrigatório.');
    }

    // ── 2. Buscar credencial da empresa autenticada ────────────
    const providers = ["gemini", "openai", "anthropic"];
    let activeCred: { ai_provider: string; ai_api_key: string; model: string } | null = null;

    for (const p of providers) {
      const { data, error } = await supabaseAdmin
        .from('organization_ai_credentials')
        .select('ai_provider, ai_api_key, model')
        .eq('organization_id', ctx.companyId)   // companyId do JWT
        .eq('ai_provider', p)
        .single();

      if (!error && data) {
        activeCred = data;
        break;
      }
    }

    if (!activeCred) {
      throw new AppError(400, 'Nenhuma credencial de IA configurada para esta empresa.');
    }

    const { ai_api_key: apiKey, model, ai_provider: providerId } = activeCred;

    // ── 3. Gerar resposta no servidor ─────────────────────────
    // API key nunca é enviada ao browser.
    let result = "";

    if (providerId === "gemini") {
      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction },
      });
      result = response.text || "";
    } else if (providerId === "openai") {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model,
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction } as const] : []),
          { role: "user", content: prompt },
        ],
      });
      result = response.choices[0].message.content || "";
    } else if (providerId === "anthropic") {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: systemInstruction,
        messages: [{ role: "user", content: prompt }],
      });
      const textPart = response.content.find(p => p.type === "text");
      result = textPart?.type === "text" ? textPart.text : "";
    }

    return res.json({ text: result });

  } catch (err) {
    return apiError(res, err);
  }
}
