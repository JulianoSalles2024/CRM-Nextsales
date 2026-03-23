'use strict';
/**
 * build-wf07-v17.cjs
 * Gera WF-07-AGENT-EXECUTOR-V17.json a partir do V16.
 *
 * Mudanças em relação ao V16:
 *  1. Tool 'escalar_para_humano' → chama RPC escalate_to_human (não PATCH direto)
 *  2. Branch de pipeline adicionado após HTTP - Insert Message (paralelo):
 *     HTTP - Get Stage WF07
 *     → Code - Check Triggers WF07
 *     → IF - Trigger Detected WF07
 *        TRUE  → HTTP - Get Next Stage WF07
 *        FALSE → Code - Build Stage Analysis WF07
 *                → HTTP - Call OpenAI Stage WF07
 *                → Code - Parse Stage Decision WF07
 *                → IF - AI Says Advance WF07
 *                   TRUE → HTTP - Get Next Stage WF07  (fan-in com TRUE acima)
 *     → Code - Extract Next Stage WF07
 *     → IF - Has Next Stage WF07
 *        TRUE → IF - Requires Approval WF07
 *                TRUE  → HTTP - Insert Approval Notification WF07
 *                FALSE → HTTP - Auto Move Lead WF07
 *                        → HTTP - Insert Move Notification WF07
 */

const fs = require('fs');
const path = require('path');

const SB_API   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoa2hhbXdyZnd0YWN3eWR1a3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMyNjcxMywiZXhwIjoyMDgwOTAyNzEzfQ.slNbow0lzBpryTaPPNNPDOV5x_uBqRHQZR38RRk92sY';
const SB_URL   = 'https://fhkhamwrfwtacwydukvb.supabase.co';
const SB_HDRS  = [
  { name: 'apikey',         value: SB_API },
  { name: 'Authorization',  value: 'Bearer ' + SB_API },
  { name: 'Content-Type',   value: 'application/json' },
];
const SB_HDRS_PREFER = [...SB_HDRS, { name: 'Prefer', value: 'return=minimal' }];

// OpenAI key placeholder (substituir no n8n após importar)
const OPENAI_KEY = 'OPENAI_API_KEY_PLACEHOLDER';

// ── Load V16 ───────────────────────────────────────────────────────────────
const v16 = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'WF-07-AGENT-EXECUTOR-V16.json'), 'utf8'
));

const nodes = JSON.parse(JSON.stringify(v16.nodes));
const connections = JSON.parse(JSON.stringify(v16.connections));

// ── Helper: make n8n-compatible UUID ──────────────────────────────────────
let _seq = 1;
function uid() {
  const s = String(_seq++).padStart(4, '0');
  return `b7c8d9e0-f1a2-3456-bcde-f01234${s}v17`.replace('v17', '7890');
}
// Actually let's use deterministic IDs based on node name
function stableId(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const h = Math.abs(hash).toString(16).padStart(8, '0');
  return `${h.slice(0,8)}-${h.slice(0,4)}-4${h.slice(1,4)}-a${h.slice(2,5)}-${h.slice(0,12).padEnd(12,'0')}`;
}

// ── 1. Fix escalar_para_humano tool ───────────────────────────────────────
const escalNode = nodes.find(n => n.name === 'escalar_para_humano');
if (escalNode) {
  // Change from PATCH conversations to POST RPC escalate_to_human
  escalNode.parameters.method = 'POST';
  escalNode.parameters.url    = `${SB_URL}/rest/v1/rpc/escalate_to_human`;
  // Remove old body params, use json body instead
  delete escalNode.parameters.bodyParameters;
  escalNode.parameters.specifyBody = 'json';
  escalNode.parameters.jsonBody = `=({\n  "p_conversation_id": "{{ $('Webhook').first().json.body.conversation_id }}",\n  "p_company_id":      "{{ $('Webhook').first().json.body.company_id }}",\n  "p_reason":          "{{ $fromAI(\\"reason\\", \\"Motivo da escalada para humano. Ex: Lead pediu proposta formal\\") }}"\n})`;
  escalNode.parameters.description = 'Escala o atendimento para um humano. Remove o agente IA da conversa, coloca status in_progress e cria notificação para o vendedor. Use quando: lead pedir falar com humano, pedido de contrato/proposta formal, ou keywords de escalação detectadas.';
}

// ── 2. New pipeline nodes ─────────────────────────────────────────────────
// Positions: pipeline branch starts below HTTP - Insert Message [2940,300]
// We'll put the branch at y=560 and continue rightward

const newNodes = [

  // ── 2.1 HTTP - Get Stage WF07 ──────────────────────────────────────
  {
    id: stableId('HTTP - Get Stage WF07'),
    name: 'HTTP - Get Stage WF07',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [2940, 560],
    parameters: {
      url: `${SB_URL}/rest/v1/board_stages`,
      sendQuery: true,
      queryParameters: { parameters: [
        { name: 'id',     value: "=eq.{{ $('HTTP - Get Lead').first().json.column_id }}" },
        { name: 'select', value: 'id,name,board_id,auto_triggers,auto_playbook_id,requires_approval,ai_prompt,order' },
        { name: 'limit',  value: '1' },
      ]},
      sendHeaders: true,
      headerParameters: { parameters: SB_HDRS.slice(0,2) },
      options: { response: { response: { neverError: true } } },
    },
  },

  // ── 2.2 Code - Check Triggers WF07 ────────────────────────────────
  {
    id: stableId('Code - Check Triggers WF07'),
    name: 'Code - Check Triggers WF07',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [3220, 560],
    parameters: {
      jsCode: `// ── Cadência: detecta gatilhos (keywords) configurados no estágio ──
// Adaptado do WF-05 para o contexto do WF-07 (agentes IA SDR/Closer)
const webhookBody  = $('Webhook').first().json.body;
const content_text = (webhookBody.input_text || '').toLowerCase();

const stageRaw          = $('HTTP - Get Stage WF07').first().json;
const stageData         = Array.isArray(stageRaw) ? stageRaw[0] : stageRaw;
const auto_triggers     = Array.isArray(stageData.auto_triggers) ? stageData.auto_triggers : [];
const requires_approval = stageData.requires_approval ?? false;
const auto_playbook_id  = stageData.auto_playbook_id  ?? null;
const stage_name        = stageData.name || 'estágio atual';

const lead_id     = webhookBody.lead_id;
const company_id  = webhookBody.company_id;

const leadRaw     = $('HTTP - Get Lead').first().json;
const leadData    = Array.isArray(leadRaw) ? leadRaw[0] : leadRaw;
const current_column_id = leadData.column_id;
const lead_name   = leadData.name || '';

let matched_trigger = null;
for (const trigger of auto_triggers) {
  const keyword = (typeof trigger === 'object'
    ? (trigger.keyword || '')
    : (trigger || '')
  ).toLowerCase().trim();
  if (keyword && content_text.includes(keyword)) {
    matched_trigger = keyword;
    break;
  }
}

return [{
  json: {
    trigger_detected:   !!matched_trigger,
    matched_trigger,
    requires_approval,
    auto_playbook_id,
    current_column_id,
    lead_id,
    lead_name,
    stage_name,
    company_id,
    content_text: webhookBody.input_text || '',
  }
}];`,
    },
  },

  // ── 2.3 IF - Trigger Detected WF07 ────────────────────────────────
  {
    id: stableId('IF - Trigger Detected WF07'),
    name: 'IF - Trigger Detected WF07',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [3500, 560],
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{
          id: 'cond-trigger-wf07',
          leftValue: '={{ $json.trigger_detected }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'true' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  },

  // ── 2.4 HTTP - Get Next Stage WF07 ────────────────────────────────
  // Recebe de: IF-Trigger TRUE (main[0]) E IF-AI-Advance TRUE (main[0])
  {
    id: stableId('HTTP - Get Next Stage WF07'),
    name: 'HTTP - Get Next Stage WF07',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [3780, 460],
    parameters: {
      method: 'POST',
      url: `${SB_URL}/rest/v1/rpc/get_next_stage`,
      sendHeaders: true,
      headerParameters: { parameters: SB_HDRS },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={\n  "p_current_stage_id": "{{ $\'Code - Check Triggers WF07\'.first().json.current_column_id }}"\n}',
      options: { response: { response: { neverError: true } } },
    },
  },

  // ── 2.5 Code - Build Stage Analysis WF07 ──────────────────────────
  {
    id: stableId('Code - Build Stage Analysis WF07'),
    name: 'Code - Build Stage Analysis WF07',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [3780, 660],
    parameters: {
      jsCode: `// ── Cadência Híbrida: análise de IA quando nenhum keyword foi detectado ──
// Adaptado do WF-05 para o contexto do WF-07 (usa mensagens já carregadas)
const content_text = $('Code - Check Triggers WF07').first().json.content_text || '';
const stage_name   = $('Code - Check Triggers WF07').first().json.stage_name   || 'estágio atual';

// Histórico de mensagens (já carregado pelo HTTP - Get Messages no início do WF-07)
let messages = [];
try {
  messages = $('HTTP - Get Messages').all().map(m => m.json);
} catch(e) {}

const recentMsgs = messages.slice(0, 8).reverse().map(m => {
  const who = m.direction === 'inbound' ? 'Lead' : 'Agente';
  return who + ': ' + (m.content || '').trim();
}).filter(l => l).join('\\n');

const systemPrompt =
  'Você é um especialista em análise de conversas de vendas. ' +
  'Analise o histórico abaixo e determine se o lead demonstrou interesse, ' +
  'engajamento ou intenção suficiente para avançar no funil comercial. ' +
  'O lead está no estágio: "' + stage_name + '". ' +
  'Responda APENAS com uma palavra: SIM (deve avançar) ou NAO (deve permanecer).';

const userMsg =
  'Histórico da conversa:\\n' + (recentMsgs || '(sem histórico)') +
  '\\n\\nÚltima mensagem do lead: "' + content_text + '"' +
  '\\n\\nO lead deve avançar de estágio?';

return [{ json: {
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userMsg },
  ],
  max_tokens: 10,
  temperature: 0.1,
} }];`,
    },
  },

  // ── 2.6 HTTP - Call OpenAI Stage WF07 ─────────────────────────────
  {
    id: stableId('HTTP - Call OpenAI Stage WF07'),
    name: 'HTTP - Call OpenAI Stage WF07',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [4060, 660],
    parameters: {
      method: 'POST',
      url: 'https://api.openai.com/v1/chat/completions',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'Authorization', value: 'Bearer ' + OPENAI_KEY },
        { name: 'Content-Type',  value: 'application/json' },
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json) }}',
      options: { response: { response: { neverError: true } } },
    },
  },

  // ── 2.7 Code - Parse Stage Decision WF07 ──────────────────────────
  {
    id: stableId('Code - Parse Stage Decision WF07'),
    name: 'Code - Parse Stage Decision WF07',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [4340, 660],
    parameters: {
      jsCode: `// Extrai SIM/NAO da resposta do OpenAI
const response = $input.first().json;
const content  = ((response && response.choices && response.choices[0] &&
  response.choices[0].message && response.choices[0].message.content) || '')
  .trim().toUpperCase();
const should_advance = content.startsWith('SIM');
return [{ json: { should_advance, ai_decision: content } }];`,
    },
  },

  // ── 2.8 IF - AI Says Advance WF07 ─────────────────────────────────
  {
    id: stableId('IF - AI Says Advance WF07'),
    name: 'IF - AI Says Advance WF07',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [4620, 660],
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{
          id: 'cond-ai-advance-wf07',
          leftValue: '={{ $json.should_advance }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'true' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  },

  // ── 2.9 Code - Extract Next Stage WF07 ────────────────────────────
  {
    id: stableId('Code - Extract Next Stage WF07'),
    name: 'Code - Extract Next Stage WF07',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [4060, 460],
    parameters: {
      jsCode: `// RPC get_next_stage retorna jsonb: { next_stage_id: 'uuid' }
const raw = $input.first().json;
const next_stage_id = (raw && raw.next_stage_id) ? raw.next_stage_id : null;
return [{ json: { next_stage_id, has_next_stage: !!next_stage_id } }];`,
    },
  },

  // ── 2.10 IF - Has Next Stage WF07 ─────────────────────────────────
  {
    id: stableId('IF - Has Next Stage WF07'),
    name: 'IF - Has Next Stage WF07',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [4340, 460],
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{
          id: 'cond-has-next-wf07',
          leftValue: '={{ $json.has_next_stage }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'true' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  },

  // ── 2.11 IF - Requires Approval WF07 ──────────────────────────────
  {
    id: stableId('IF - Requires Approval WF07'),
    name: 'IF - Requires Approval WF07',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [4620, 460],
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{
          id: 'cond-approval-wf07',
          leftValue: "={{ $('Code - Check Triggers WF07').first().json.requires_approval }}",
          rightValue: true,
          operator: { type: 'boolean', operation: 'true' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  },

  // ── 2.12 HTTP - Insert Approval Notification WF07 ─────────────────
  {
    id: stableId('HTTP - Insert Approval Notification WF07'),
    name: 'HTTP - Insert Approval Notification WF07',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [4900, 360],
    parameters: {
      method: 'POST',
      url: `${SB_URL}/rest/v1/notifications`,
      sendHeaders: true,
      headerParameters: { parameters: SB_HDRS_PREFER },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `=({
  "company_id": "{{ $('Code - Check Triggers WF07').first().json.company_id }}",
  "type":       "stage_approval",
  "title":      "Lead pronto para avançar de estágio",
  "body":       "{{ $('Code - Check Triggers WF07').first().json.matched_trigger ? 'Gatilho: \\"' + $('Code - Check Triggers WF07').first().json.matched_trigger + '\\"' : 'Análise de IA' }} — {{ $('Code - Check Triggers WF07').first().json.lead_name }}",
  "lead_id":    "{{ $('Code - Check Triggers WF07').first().json.lead_id }}",
  "metadata":   {
    "suggested_column_id": "{{ $('Code - Extract Next Stage WF07').first().json.next_stage_id }}",
    "trigger_text":        "{{ $('Code - Check Triggers WF07').first().json.matched_trigger || 'análise de IA' }}",
    "auto_playbook_id":    "{{ $('Code - Check Triggers WF07').first().json.auto_playbook_id }}"
  }
})`,
      options: {},
    },
  },

  // ── 2.13 HTTP - Auto Move Lead WF07 ───────────────────────────────
  {
    id: stableId('HTTP - Auto Move Lead WF07'),
    name: 'HTTP - Auto Move Lead WF07',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [4900, 560],
    parameters: {
      method: 'PATCH',
      url: `${SB_URL}/rest/v1/leads`,
      sendQuery: true,
      queryParameters: { parameters: [
        { name: 'id',         value: "=eq.{{ $('Code - Check Triggers WF07').first().json.lead_id }}" },
        { name: 'company_id', value: "=eq.{{ $('Code - Check Triggers WF07').first().json.company_id }}" },
      ]},
      sendHeaders: true,
      headerParameters: { parameters: SB_HDRS_PREFER },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={\n  "column_id": "{{ $(\'Code - Extract Next Stage WF07\').first().json.next_stage_id }}"\n}',
      options: {},
    },
  },

  // ── 2.14 HTTP - Insert Move Notification WF07 ─────────────────────
  {
    id: stableId('HTTP - Insert Move Notification WF07'),
    name: 'HTTP - Insert Move Notification WF07',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [5180, 560],
    parameters: {
      method: 'POST',
      url: `${SB_URL}/rest/v1/notifications`,
      sendHeaders: true,
      headerParameters: { parameters: SB_HDRS_PREFER },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `=({
  "company_id": "{{ $('Code - Check Triggers WF07').first().json.company_id }}",
  "type":       "info",
  "title":      "Lead avançou de estágio automaticamente",
  "body":       "{{ $('Code - Check Triggers WF07').first().json.lead_name }} avançou via {{ $('Code - Check Triggers WF07').first().json.matched_trigger ? 'gatilho: \\"' + $('Code - Check Triggers WF07').first().json.matched_trigger + '\\"' : 'análise de IA' }}",
  "lead_id":    "{{ $('Code - Check Triggers WF07').first().json.lead_id }}",
  "metadata":   {
    "new_column_id":    "{{ $('Code - Extract Next Stage WF07').first().json.next_stage_id }}",
    "trigger_text":     "{{ $('Code - Check Triggers WF07').first().json.matched_trigger || 'análise de IA' }}",
    "auto_playbook_id": "{{ $('Code - Check Triggers WF07').first().json.auto_playbook_id }}"
  }
})`,
      options: {},
    },
  },
];

// ── 3. Add nodes to list ───────────────────────────────────────────────────
nodes.push(...newNodes);

// ── 4. Update connections ─────────────────────────────────────────────────

// 4a. HTTP - Insert Message → também dispara HTTP - Get Stage WF07 (paralelo)
// (mantém conexão existente para HTTP - Insert Run)
connections['HTTP - Insert Message'].main[0].push({
  node: 'HTTP - Get Stage WF07',
  type: 'main',
  index: 0,
});

// 4b. Pipeline branch connections
connections['HTTP - Get Stage WF07'] = {
  main: [[{ node: 'Code - Check Triggers WF07', type: 'main', index: 0 }]],
};

connections['Code - Check Triggers WF07'] = {
  main: [[{ node: 'IF - Trigger Detected WF07', type: 'main', index: 0 }]],
};

// IF - Trigger Detected WF07:
//   TRUE  (main[0]) → HTTP - Get Next Stage WF07
//   FALSE (main[1]) → Code - Build Stage Analysis WF07
connections['IF - Trigger Detected WF07'] = {
  main: [
    [{ node: 'HTTP - Get Next Stage WF07', type: 'main', index: 0 }],
    [{ node: 'Code - Build Stage Analysis WF07', type: 'main', index: 0 }],
  ],
};

// HTTP - Get Next Stage WF07 → Code - Extract Next Stage WF07
connections['HTTP - Get Next Stage WF07'] = {
  main: [[{ node: 'Code - Extract Next Stage WF07', type: 'main', index: 0 }]],
};

// Code - Build Stage Analysis WF07 → HTTP - Call OpenAI Stage WF07
connections['Code - Build Stage Analysis WF07'] = {
  main: [[{ node: 'HTTP - Call OpenAI Stage WF07', type: 'main', index: 0 }]],
};

connections['HTTP - Call OpenAI Stage WF07'] = {
  main: [[{ node: 'Code - Parse Stage Decision WF07', type: 'main', index: 0 }]],
};

connections['Code - Parse Stage Decision WF07'] = {
  main: [[{ node: 'IF - AI Says Advance WF07', type: 'main', index: 0 }]],
};

// IF - AI Says Advance WF07:
//   TRUE  (main[0]) → HTTP - Get Next Stage WF07 (fan-in: já recebe do keyword TRUE)
//   FALSE (main[1]) → (sem conexão — fim da branch)
connections['IF - AI Says Advance WF07'] = {
  main: [
    [{ node: 'HTTP - Get Next Stage WF07', type: 'main', index: 0 }],
    [],
  ],
};

// Code - Extract Next Stage WF07 → IF - Has Next Stage WF07
connections['Code - Extract Next Stage WF07'] = {
  main: [[{ node: 'IF - Has Next Stage WF07', type: 'main', index: 0 }]],
};

// IF - Has Next Stage WF07:
//   TRUE  (main[0]) → IF - Requires Approval WF07
//   FALSE (main[1]) → (fim — não há próximo estágio)
connections['IF - Has Next Stage WF07'] = {
  main: [
    [{ node: 'IF - Requires Approval WF07', type: 'main', index: 0 }],
    [],
  ],
};

// IF - Requires Approval WF07:
//   TRUE  (main[0]) → HTTP - Insert Approval Notification WF07
//   FALSE (main[1]) → HTTP - Auto Move Lead WF07
connections['IF - Requires Approval WF07'] = {
  main: [
    [{ node: 'HTTP - Insert Approval Notification WF07', type: 'main', index: 0 }],
    [{ node: 'HTTP - Auto Move Lead WF07',               type: 'main', index: 0 }],
  ],
};

connections['HTTP - Insert Approval Notification WF07'] = { main: [[]] };

connections['HTTP - Auto Move Lead WF07'] = {
  main: [[{ node: 'HTTP - Insert Move Notification WF07', type: 'main', index: 0 }]],
};

connections['HTTP - Insert Move Notification WF07'] = { main: [[]] };

// ── 5. Build final workflow ────────────────────────────────────────────────
const v17 = {
  ...v16,
  name: 'WF-07 — Agent Executor V17 (pipeline+handoff)',
  nodes,
  connections,
};

const outPath = path.join(__dirname, 'WF-07-AGENT-EXECUTOR-V17.json');
fs.writeFileSync(outPath, JSON.stringify(v17, null, 2), 'utf8');
console.log('✅  WF-07-AGENT-EXECUTOR-V17.json gerado em:', outPath);
console.log('');
console.log('⚠️  IMPORTANTE após importar no n8n:');
console.log('   1. Editar nó "HTTP - Call OpenAI Stage WF07"');
console.log('   2. No header Authorization, substituir OPENAI_API_KEY_PLACEHOLDER pela sua chave real');
console.log('   3. Ativar o workflow (substituindo o V16)');
