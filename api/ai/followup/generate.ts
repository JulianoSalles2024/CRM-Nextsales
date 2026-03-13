// ============================================================================
// api/ai/followup/generate.ts
// POST /api/ai/followup/generate
//
// Gera a próxima mensagem de follow-up automático usando o LLM da empresa.
// Chamado pelo worker/n8n — autenticado via X-Worker-Secret (server-to-server).
//
// Auth: header  X-Worker-Secret: <FOLLOWUP_WORKER_SECRET>
// Body: { company_id, prompt_rule, contact_name, agent_name,
//         company_name, conversation_history? }
// Resp: { generated_text: "..." }
// ============================================================================

import { GoogleGenAI }   from '@google/genai';
import OpenAI            from 'openai';
import Anthropic         from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../_lib/supabase.js';
import { AppError, AuthError, apiError } from '../../_lib/errors.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryEntry {
  direction: 'inbound' | 'outbound';
  content:   string;
  created_at: string;
}

interface RequestBody {
  company_id:           string;
  prompt_rule:          string;
  contact_name:         string;
  agent_name:           string;
  company_name:         string;
  conversation_history?: HistoryEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formata o histórico em texto cronológico legível pelo LLM. */
function formatHistory(history: HistoryEntry[]): string {
  if (!history.length) return '(sem histórico de mensagens disponível)';

  return history
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(msg => {
      const label = msg.direction === 'inbound' ? 'Cliente' : 'Agente';
      const time  = new Date(msg.created_at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
      return `[${time}] ${label}: ${msg.content.trim()}`;
    })
    .join('\n');
}

/** Valida presença e tipo dos campos obrigatórios. Lança AppError(400) se inválido. */
function validateBody(body: Partial<RequestBody>): asserts body is RequestBody {
  const required: (keyof RequestBody)[] = [
    'company_id', 'prompt_rule', 'agent_name', 'company_name',
  ];

  for (const field of required) {
    const value = body[field];
    if (!value || typeof value !== 'string' || !value.trim()) {
      throw new AppError(400, `Campo obrigatório ausente ou inválido: "${field}".`);
    }
  }

  if (
    body.conversation_history !== undefined &&
    !Array.isArray(body.conversation_history)
  ) {
    throw new AppError(400, '"conversation_history" deve ser um array.');
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── 1. Autenticação server-to-server (worker secret) ──────────────────
    //
    // Este endpoint é chamado pelo n8n/scheduler — sem sessão de usuário.
    // O segredo deve ser idêntico ao FOLLOWUP_WORKER_SECRET configurado
    // tanto na Vercel quanto nas variáveis de ambiente do n8n.
    //
    const workerSecret = process.env.FOLLOWUP_WORKER_SECRET;
    if (!workerSecret) {
      // Falha silenciosa na config do servidor — não vaza detalhes ao cliente
      console.error('[followup/generate] FOLLOWUP_WORKER_SECRET não configurado.');
      return res.status(500).json({ error: 'Configuração de servidor incompleta.' });
    }

    const incomingSecret = (
      req.headers['x-worker-secret'] ?? req.headers['X-Worker-Secret'] ?? ''
    ) as string;

    if (!incomingSecret || incomingSecret.trim() !== workerSecret.trim()) {
      throw new AuthError(401, 'Não autorizado.');
    }

    // ── 2. Validação do body ───────────────────────────────────────────────
    const body: Partial<RequestBody> = req.body ?? {};
    validateBody(body);

    const {
      company_id,
      prompt_rule,
      contact_name = 'Cliente',
      agent_name,
      company_name,
      conversation_history = [],
    } = body;

    // ── 3. Buscar credencial de IA da empresa ─────────────────────────────
    //
    // Mesma prioridade do generate.ts: gemini → openai → anthropic
    //
    const PROVIDER_PRIORITY = ['gemini', 'openai', 'anthropic'] as const;
    type ProviderId = typeof PROVIDER_PRIORITY[number];

    let activeCred: { ai_provider: ProviderId; ai_api_key: string; model: string } | null = null;

    for (const provider of PROVIDER_PRIORITY) {
      const { data, error } = await supabaseAdmin
        .from('organization_ai_credentials')
        .select('ai_provider, ai_api_key, model')
        .eq('organization_id', company_id)
        .eq('ai_provider', provider)
        .maybeSingle();                // 0 rows é válido — não lança PGRST116

      if (!error && data) {
        activeCred = data as { ai_provider: ProviderId; ai_api_key: string; model: string };
        break;
      }
    }

    if (!activeCred) {
      throw new AppError(422, 'Nenhuma credencial de IA configurada para esta empresa.');
    }

    const { ai_api_key: apiKey, model, ai_provider: providerId } = activeCred;

    // ── 4. Montar os prompts ───────────────────────────────────────────────
    const historyText = formatHistory(conversation_history);

    const systemPrompt = [
      `Você é ${agent_name}, representante da empresa ${company_name}.`,
      `Estou lhe passando as recentes interações contidas no histórico com o cliente ${contact_name}.`,
      `Sua tarefa é gerar a PRÓXIMA MENSAGEM de follow-up a ser enviada, seguindo ESTRITAMENTE a instrução abaixo.`,
      ``,
      `Regras de retorno:`,
      `1. Aja de forma conversacional e natural pelo WhatsApp.`,
      `2. Nunca envie marcações (como "Nome:", prefixos, etc.) nem quebras bruscas de tom.`,
      `3. Retorne APENAS o texto da resposta final, pronto para ser lido no WhatsApp, sem aspas e sem explicações.`,
    ].join('\n');

    const userPrompt = [
      `## Histórico da conversa`,
      historyText,
      ``,
      `## Instrução para o próximo follow-up`,
      prompt_rule.trim(),
    ].join('\n');

    // ── 5. Chamar o provedor de IA ─────────────────────────────────────────
    let generatedText = '';

    if (providerId === 'gemini') {
      const genAI    = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model,
        contents: userPrompt,
        config: { systemInstruction: systemPrompt },
      });
      generatedText = response.text?.trim() ?? '';

    } else if (providerId === 'openai') {
      const openai   = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt  },
        ],
      });
      generatedText = response.choices[0]?.message?.content?.trim() ?? '';

    } else if (providerId === 'anthropic') {
      const anthropic = new Anthropic({ apiKey });
      const response  = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system:     systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const textBlock = response.content.find(b => b.type === 'text');
      generatedText   = textBlock?.type === 'text' ? textBlock.text.trim() : '';
    }

    if (!generatedText) {
      throw new AppError(502, 'O modelo de IA retornou uma resposta vazia.');
    }

    // ── 6. Resposta ────────────────────────────────────────────────────────
    return res.status(200).json({ generated_text: generatedText });

  } catch (err) {
    return apiError(res, err);
  }
}
