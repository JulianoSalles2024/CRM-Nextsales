import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';
import { AppError, apiError } from '../_lib/errors.js';
import { isRateLimited } from '../_lib/rateLimit.js';

const PLAYBOOK_SYSTEM_PROMPT = `Você é um especialista em vendas B2B e CRM. Sua tarefa é criar playbooks de cadência de vendas eficazes.

Retorne APENAS um objeto JSON válido, sem markdown, sem texto adicional, no seguinte formato exato:
{
  "name": "Nome descritivo e conciso do playbook",
  "steps": [
    { "day": 1, "type": "email", "instructions": "Descrição clara e acionável da tarefa" },
    { "day": 3, "type": "call", "instructions": "Descrição clara e acionável da tarefa" }
  ]
}

Regras obrigatórias:
- Tipos disponíveis: task, email, call, meeting, note
- Os dias devem ser crescentes (ex: 1, 3, 5, 8, 12)
- Mínimo 3 passos, máximo 8 passos
- Instruções em português, práticas e acionáveis (sem jargão vazio)
- Nome do playbook deve ser descritivo e direto (máximo 50 caracteres)
- Não inclua o número do dia nas instruções (já é exibido separadamente)`;

const METHODOLOGY_CONTEXTS: Record<string, string> = {
  BANT:   'Budget (orçamento), Authority (autoridade), Need (necessidade), Timeline (prazo)',
  SPIN:   'Situation (situação), Problem (problema), Implication (implicação), Need-payoff (benefício)',
  MEDDIC: 'Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion',
  GPCT:   'Goals (metas), Plans (planos), Challenges (desafios), Timeline (prazo)',
  Simple: 'Abordagem simples e direta focada em entender o problema e apresentar a solução',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  qualification:  'Qualificação de lead',
  reengagement:   'Reengajamento de lead frio',
  closing:        'Aceleração de fechamento',
  followup:       'Follow-up pós-proposta',
  onboarding:     'Onboarding de novo cliente',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── 1. Autenticação — companyId vem do JWT ─────────────────────────────
    const ctx = await requireAuth(req);

    // ── 2. Rate limiting — 10 req/min (geração é pesada) ──────────────────
    if (await isRateLimited(ctx.userId)) {
      return res.status(429).json({ error: 'Limite de requisições atingido. Tente novamente em 1 minuto.' });
    }

    const { mode, prompt, methodology, objective, stageNames } = req.body;

    if (!mode || !['prompt', 'methodology'].includes(mode)) {
      throw new AppError(400, 'mode deve ser "prompt" ou "methodology".');
    }
    if (mode === 'prompt' && !prompt?.trim()) {
      throw new AppError(400, 'prompt é obrigatório no modo "prompt".');
    }
    if (mode === 'methodology' && (!methodology || !objective)) {
      throw new AppError(400, 'methodology e objective são obrigatórios no modo "methodology".');
    }

    // ── 3. Montar prompt do usuário ─────────────────────────────────────────
    let userPrompt = '';

    if (mode === 'prompt') {
      userPrompt = `Crie um playbook de cadência de vendas com o seguinte objetivo:\n\n${prompt.trim()}`;
    } else {
      const methodCtx = METHODOLOGY_CONTEXTS[methodology] ?? methodology;
      const objLabel  = OBJECTIVE_LABELS[objective] ?? objective;
      userPrompt = `Crie um playbook de cadência de vendas usando a metodologia ${methodology} (${methodCtx}) com objetivo de: ${objLabel}.`;
    }

    if (stageNames?.length) {
      userPrompt += `\n\nEstágios do pipeline disponíveis: ${stageNames.join(', ')}.`;
    }

    userPrompt += '\n\nRetorne apenas o JSON conforme solicitado.';

    // ── 4. Buscar credencial de IA da empresa ──────────────────────────────
    const providers = ['gemini', 'openai', 'anthropic'];
    let activeCred: { ai_provider: string; ai_api_key: string; model: string } | null = null;

    for (const p of providers) {
      const { data, error } = await supabaseAdmin
        .from('organization_ai_credentials')
        .select('ai_provider, ai_api_key, model')
        .eq('organization_id', ctx.companyId)
        .eq('ai_provider', p)
        .single();

      if (!error && data) {
        activeCred = data;
        break;
      }
    }

    if (!activeCred) {
      throw new AppError(400, 'Nenhuma credencial de IA configurada para esta empresa. Configure em Configurações > IA.');
    }

    const { ai_api_key: apiKey, model, ai_provider: providerId } = activeCred;

    // ── 5. Chamar provedor de IA ───────────────────────────────────────────
    let rawText = '';

    if (providerId === 'gemini') {
      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model,
        contents: userPrompt,
        config: { systemInstruction: PLAYBOOK_SYSTEM_PROMPT },
      });
      rawText = response.text ?? '';

    } else if (providerId === 'openai') {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: PLAYBOOK_SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      rawText = response.choices[0].message.content ?? '';

    } else if (providerId === 'anthropic') {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: PLAYBOOK_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const textPart = response.content.find(p => p.type === 'text');
      rawText = textPart?.type === 'text' ? textPart.text : '';
    }

    // ── 6. Parsear e validar JSON ──────────────────────────────────────────
    let parsed: { name: string; steps: Array<{ day: number; type: string; instructions: string }> };

    try {
      // Remove possível markdown fence caso o modelo ignore a instrução
      const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      throw new AppError(500, 'A IA retornou um formato inválido. Tente novamente.');
    }

    if (!parsed.name || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new AppError(500, 'Resposta da IA incompleta. Tente novamente com uma descrição mais detalhada.');
    }

    // Garante tipos válidos
    const validTypes = ['task', 'email', 'call', 'meeting', 'note'];
    const steps = parsed.steps.map(s => ({
      day:          Math.max(1, Number(s.day) || 1),
      type:         validTypes.includes(s.type) ? s.type : 'task',
      instructions: String(s.instructions ?? '').trim(),
    }));

    return res.json({ name: parsed.name.trim(), steps });

  } catch (err) {
    return apiError(res, err);
  }
}
