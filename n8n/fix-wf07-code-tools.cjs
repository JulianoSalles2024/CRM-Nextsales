'use strict';
const https = require('https');

const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTk5MTFjNS1iNmJhLTQyNWEtODJkYS0zOGMxZjc2NzdmZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjdmMDU2ZTgtYmI3Ni00MTI5LTliM2MtZDE0ZmUyODkwODRmIiwiaWF0IjoxNzc0MjE1NjcxfQ.-E-Mr6KfbNXdp5Te8Q16kpON81TDP9KKvRlzYyW0JbI';
const SB_URL = 'https://fhkhamwrfwtacwydukvb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoa2hhbXdyZnd0YWN3eWR1a3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMyNjcxMywiZXhwIjoyMDgwOTAyNzEzfQ.slNbow0lzBpryTaPPNNPDOV5x_uBqRHQZR38RRk92sY';

function apiCall(path, method, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'n8n.julianosalles.com.br', path, method,
      rejectUnauthorized: false,
      headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json' }
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(d) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const SB_HEADERS = `{ apikey: "${SB_KEY}", Authorization: "Bearer ${SB_KEY}", "Content-Type": "application/json" }`;

const TOOLS = [
  {
    id:   'a1b2c3d4-e5f6-7890-abcd-ef1234560011',
    name: 'atualizar_memoria',
    pos:  [2100, 520],
    desc: 'Salva a memória comercial do lead após cada interação importante.',
    // With schemaType=manual, $input.first().json contains the object directly
    schema: JSON.stringify({
      type: 'object',
      properties: {
        stage:          { type: 'string', description: 'Estágio: new|approached|responded|qualifying|qualified|meeting_scheduled|proposal_sent|negotiating|closed_won|closed_lost|inactive' },
        interest_level: { type: 'string', description: 'Nível de interesse: low|medium|high|very_high' },
        notes:          { type: 'string', description: 'Anotações sobre o lead' },
        last_action:    { type: 'string', description: 'O que aconteceu na interação' },
        budget:         { type: 'number', description: 'Budget disponível em reais' },
        decision_maker: { type: 'boolean', description: 'É o decisor de compra?' },
      },
    }),
    code: `
const p = $input.first().json;
const agentId   = $('Webhook').first().json.body.agent_id;
const leadId    = $('Webhook').first().json.body.lead_id;
const companyId = $('Webhook').first().json.body.company_id;
const body = {
  p_agent_id:       agentId,
  p_lead_id:        leadId,
  p_company_id:     companyId,
  p_stage:          p.stage          || null,
  p_interest_level: p.interest_level || null,
  p_notes:          p.notes          || null,
  p_last_action:    p.last_action    || null,
  p_budget:         p.budget != null ? parseFloat(p.budget) : null,
  p_decision_maker: p.decision_maker != null ? Boolean(p.decision_maker) : null,
};
try {
  const data = await $helpers.httpRequest({
    method: 'POST',
    url: '${SB_URL}/rest/v1/rpc/update_memory_from_agent',
    headers: ${SB_HEADERS},
    json: true,
    body
  });
  return JSON.stringify({ success: true, data });
} catch(e) {
  return JSON.stringify({ success: false, error: e.message });
}
`.trim()
  },
  {
    id:   'a1b2c3d4-e5f6-7890-abcd-ef1234560012',
    name: 'agendar_followup',
    pos:  [2300, 520],
    desc: 'Agenda o próximo follow-up com o lead.',
    schema: JSON.stringify({
      type: 'object',
      properties: {
        next_action_at:   { type: 'string', description: 'Data/hora ISO 8601, ex: 2025-04-01T10:00:00Z' },
        next_action_type: { type: 'string', description: 'Tipo: followup|call|meeting|proposal' },
        next_action:      { type: 'string', description: 'O que fazer no próximo contato' },
      },
      required: ['next_action'],
    }),
    code: `
const p = $input.first().json;
const agentId = $('Webhook').first().json.body.agent_id;
const leadId  = $('Webhook').first().json.body.lead_id;
const url = '${SB_URL}/rest/v1/agent_lead_memory?agent_id=eq.' + agentId + '&lead_id=eq.' + leadId;
try {
  await $helpers.httpRequest({
    method: 'PATCH',
    url,
    headers: { apikey: "${SB_KEY}", Authorization: "Bearer ${SB_KEY}", "Content-Type": "application/json", Prefer: "return=minimal" },
    json: true,
    body: { next_action_at: p.next_action_at || null, next_action_type: p.next_action_type || "followup", next_action: p.next_action || null }
  });
  return JSON.stringify({ success: true });
} catch(e) {
  return JSON.stringify({ success: false, error: e.message });
}
`.trim()
  },
  {
    id:   'a1b2c3d4-e5f6-7890-abcd-ef1234560013',
    name: 'escalar_para_humano',
    pos:  [2500, 520],
    desc: 'Escala o atendimento para um humano. Use quando o lead pedir falar com pessoa, tiver objeção grave, ou quando não souber responder.',
    schema: JSON.stringify({
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Motivo da escalação' },
      },
      required: ['motivo'],
    }),
    code: `
const reason = String($input.first().json.motivo || "Escalado pelo agente de IA");
const conversationId = $('Webhook').first().json.body.conversation_id;
const companyId      = $('Webhook').first().json.body.company_id;
try {
  const data = await $helpers.httpRequest({
    method: 'POST',
    url: '${SB_URL}/rest/v1/rpc/escalate_to_human',
    headers: ${SB_HEADERS},
    json: true,
    body: { p_conversation_id: conversationId, p_company_id: companyId, p_reason: reason }
  });
  return JSON.stringify({ success: true, data });
} catch(e) {
  return JSON.stringify({ success: false, error: e.message });
}
`.trim()
  },
  {
    id:   'f6a7b8c9-d0e1-2345-fabc-def012345601',
    name: 'transferir_para_closer',
    pos:  [2700, 520],
    desc: 'Transfere o lead qualificado para o Closer. Use SOMENTE quando o lead tiver budget definido, for o decisor, e quiser avançar.',
    schema: JSON.stringify({
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Motivo da transferência' },
      },
      required: ['motivo'],
    }),
    code: `
const agentId        = $('Webhook').first().json.body.agent_id;
const leadId         = $('Webhook').first().json.body.lead_id;
const conversationId = $('Webhook').first().json.body.conversation_id;
const companyId      = $('Webhook').first().json.body.company_id;
try {
  const data = await $helpers.httpRequest({
    method: 'POST',
    url: '${SB_URL}/rest/v1/rpc/transfer_lead_to_closer',
    headers: ${SB_HEADERS},
    json: true,
    body: { p_sdr_agent_id: agentId, p_lead_id: leadId, p_conversation_id: conversationId, p_company_id: companyId }
  });
  return JSON.stringify({ success: true, data });
} catch(e) {
  return JSON.stringify({ success: false, error: e.message });
}
`.trim()
  }
];

async function main() {
  const r = await apiCall('/api/v1/workflows/J6buNeTLHsOLrDzy', 'GET');
  const wf = r.json;

  const TOOL_NAMES = TOOLS.map(t => t.name);
  wf.nodes = wf.nodes.filter(n => !TOOL_NAMES.includes(n.name));

  TOOLS.forEach(tool => {
    wf.nodes.push({
      id: tool.id,
      name: tool.name,
      type: '@n8n/n8n-nodes-langchain.toolCode',
      typeVersion: 1.1,
      position: tool.pos,
      parameters: {
        name:        tool.name,
        description: tool.desc,
        jsCode:      tool.code,
        schemaType:  'manual',
        inputSchema: tool.schema,
      }
    });
    console.log('Added Code Tool:', tool.name);
  });

  const s = wf.settings || {};
  const cs = { executionOrder: s.executionOrder || 'v1' };
  ['saveManualExecutions','callerPolicy','errorWorkflow','timezone','saveDataErrorExecution','saveDataSuccessExecution','saveExecutionProgress'].forEach(k => { if (s[k] !== undefined) cs[k] = s[k]; });

  const body = JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: cs, staticData: wf.staticData || null });
  const put = await apiCall('/api/v1/workflows/J6buNeTLHsOLrDzy', 'PUT', body);
  console.log('\nPUT:', put.status, put.json.id ? 'OK' : JSON.stringify(put.json).slice(0, 300));
}

main().catch(console.error);
