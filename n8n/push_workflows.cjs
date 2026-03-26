'use strict';
const fs = require('fs');
const https = require('https');

const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTk5MTFjNS1iNmJhLTQyNWEtODJkYS0zOGMxZjc2NzdmZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjdmMDU2ZTgtYmI3Ni00MTI5LTliM2MtZDE0ZmUyODkwODRmIiwiaWF0IjoxNzc0MjE1NjcxfQ.-E-Mr6KfbNXdp5Te8Q16kpON81TDP9KKvRlzYyW0JbI';
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoa2hhbXdyZnd0YWN3eWR1a3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMyNjcxMywiZXhwIjoyMDgwOTAyNzEzfQ.slNbow0lzBpryTaPPNNPDOV5x_uBqRHQZR38RRk92sY';
const SUPABASE = 'https://fhkhamwrfwtacwydukvb.supabase.co';

function apiPut(id, body) {
  return new Promise(function(resolve, reject) {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'n8n.julianosalles.com.br',
      path: '/api/v1/workflows/' + id,
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': N8N_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, function(res) {
      let d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() { resolve({ status: res.statusCode, body: d.substring(0, 500) }); });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── WF-04: add exhausted-followup parallel pipeline ──────────────────────────
const wf04 = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/_live_wf04.json', 'utf8'));

const hdrs = [
  { name: 'apikey',         value: SVC },
  { name: 'Authorization',  value: 'Bearer ' + SVC },
  { name: 'Content-Type',   value: 'application/json' }
];
const hdrsP = hdrs.concat([{ name: 'Prefer', value: 'return=minimal' }]);

const UNPACK = wf04.nodes.find(function(n) { return n.name.includes('Unpack'); }).parameters.jsCode;

const unpackRef = "Code - Unpack Exhausted";

wf04.nodes.push(
  { id:'wf04-ex-01', name:'HTTP - RPC get_exhausted_followup',
    type:'n8n-nodes-base.httpRequest', typeVersion:4.2, position:[460,640],
    parameters:{ method:'POST', url: SUPABASE + '/rest/v1/rpc/get_exhausted_followup_conversations',
      sendHeaders:true, headerParameters:{parameters:hdrs},
      sendBody:true, specifyBody:'json', jsonBody:'={}', options:{} } },

  { id:'wf04-ex-02', name: unpackRef,
    type:'n8n-nodes-base.code', typeVersion:2, position:[680,640],
    parameters:{ mode:'runOnceForAllItems', jsCode: UNPACK } },

  { id:'wf04-ex-03', name:'IF - Has Exhausted?',
    type:'n8n-nodes-base.if', typeVersion:2, position:[900,640],
    parameters:{ conditions:{ options:{caseSensitive:true,leftValue:'',typeValidation:'loose'},
      conditions:[{id:'cond-ex-01', leftValue:'={{ $json.conversation_id }}',
        rightValue:'', operator:{type:'string',operation:'notEmpty',singleValue:true}}],
      combinator:'and' } } },

  { id:'wf04-ex-04', name:'No Op (exhausted skip)',
    type:'n8n-nodes-base.noOp', typeVersion:1, position:[1120,800], parameters:{} },

  { id:'wf04-ex-05', name:'HTTP - Resolve (Exhausted)',
    type:'n8n-nodes-base.httpRequest', typeVersion:4.2, position:[1120,640],
    parameters:{ method:'PATCH',
      url: '=' + SUPABASE + '/rest/v1/conversations?id=eq.{{ $json.conversation_id }}',
      sendHeaders:true, headerParameters:{parameters:hdrsP},
      sendBody:true, specifyBody:'json', jsonBody:'={"status":"resolved"}', options:{} } },

  { id:'wf04-ex-06', name:'HTTP - Msg (Exhausted)',
    type:'n8n-nodes-base.httpRequest', typeVersion:4.2, position:[1340,640],
    parameters:{ method:'POST', url: SUPABASE + '/rest/v1/messages',
      sendHeaders:true, headerParameters:{parameters:hdrsP},
      sendBody:true, specifyBody:'json',
      jsonBody: JSON.stringify({
        company_id:      "={{ $('" + unpackRef + "').item.json.company_id }}",
        conversation_id: "={{ $('" + unpackRef + "').item.json.conversation_id }}",
        direction:       null,
        sender_type:     'system',
        content:         'Conversa encerrada automaticamente após o último passo de follow-up sem resposta.',
        content_type:    'text',
        status:          null
      }),
      options:{} } },

  { id:'wf04-ex-07', name:'IF - Has Lead? (Exhausted)',
    type:'n8n-nodes-base.if', typeVersion:2, position:[1560,640],
    parameters:{ conditions:{ options:{caseSensitive:true,leftValue:'',typeValidation:'loose'},
      conditions:[{id:'cond-ex-02',
        leftValue: "={{ $('" + unpackRef + "').item.json.lead_id }}",
        rightValue:'', operator:{type:'string',operation:'notEmpty',singleValue:true}}],
      combinator:'and' } } },

  { id:'wf04-ex-08', name:'HTTP - Mark Lost (Exhausted)',
    type:'n8n-nodes-base.httpRequest', typeVersion:4.2, position:[1780,540],
    parameters:{ method:'PATCH',
      url: "={{ '" + SUPABASE + "/rest/v1/leads?id=eq.' + $('" + unpackRef + "').item.json.lead_id }}",
      sendHeaders:true, headerParameters:{parameters:hdrsP},
      sendBody:true, specifyBody:'json',
      jsonBody:'={"status":"PERDIDO","lost_at":"{{ new Date().toISOString() }}"}',
      options:{} } },

  { id:'wf04-ex-09', name:'No Op (exhausted no lead)',
    type:'n8n-nodes-base.noOp', typeVersion:1, position:[1780,760], parameters:{} }
);

const schedName = wf04.nodes.find(function(n) { return n.type.includes('scheduleTrigger'); }).name;
wf04.connections[schedName].main[0].push({ node:'HTTP - RPC get_exhausted_followup', type:'main', index:0 });
wf04.connections['HTTP - RPC get_exhausted_followup'] = { main:[[{node:unpackRef,type:'main',index:0}]] };
wf04.connections[unpackRef]                           = { main:[[{node:'IF - Has Exhausted?',type:'main',index:0}]] };
wf04.connections['IF - Has Exhausted?']               = { main:[[{node:'HTTP - Resolve (Exhausted)',type:'main',index:0}],[{node:'No Op (exhausted skip)',type:'main',index:0}]] };
wf04.connections['HTTP - Resolve (Exhausted)']        = { main:[[{node:'HTTP - Msg (Exhausted)',type:'main',index:0}]] };
wf04.connections['HTTP - Msg (Exhausted)']            = { main:[[{node:'IF - Has Lead? (Exhausted)',type:'main',index:0}]] };
wf04.connections['IF - Has Lead? (Exhausted)']        = { main:[[{node:'HTTP - Mark Lost (Exhausted)',type:'main',index:0}],[{node:'No Op (exhausted no lead)',type:'main',index:0}]] };

// ── WF-07: add encerrar_conversa toolCode ─────────────────────────────────────
const wf07 = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/_live_wf07.json', 'utf8'));

const toolCode = [
  "const conversationId = $('Webhook').first().json.body.conversation_id;",
  "try {",
  "  await $helpers.httpRequest({",
  "    method: 'PATCH',",
  "    url: '" + SUPABASE + "/rest/v1/conversations?id=eq.' + conversationId,",
  "    headers: {",
  "      apikey: '" + SVC + "',",
  "      Authorization: 'Bearer " + SVC + "',",
  "      'Content-Type': 'application/json',",
  "      Prefer: 'return=minimal'",
  "    },",
  "    body: { status: 'resolved' },",
  "    json: true",
  "  });",
  "  return JSON.stringify({ success: true, message: 'Conversa encerrada com sucesso.' });",
  "} catch(e) {",
  "  return JSON.stringify({ success: false, error: e.message });",
  "}"
].join('\n');

wf07.nodes.push({
  id: 'wf07-tool-encerrar-v1',
  name: 'encerrar_conversa',
  type: '@n8n/n8n-nodes-langchain.toolCode',
  typeVersion: 1.1,
  position: [2700, 528],
  parameters: {
    name: 'encerrar_conversa',
    description: 'Encerra a conversa no sistema (status = resolved). Use SOMENTE quando o atendimento for concluído naturalmente: lead sem interesse confirmado, convertido, ou que pediu para não ser mais contatado. NÃO use se ainda houver possibilidade de retomada.',
    jsCode: toolCode,
    schemaType: 'manual',
    inputSchema: '{"type":"object","properties":{},"required":[]}'
  }
});

wf07.connections['encerrar_conversa'] = { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] };

// Patch prompt
const promptNode = wf07.nodes.find(function(n) { return n.name === 'Code - Build Prompt'; });
const original = promptNode.parameters.jsCode;
const patched = original.replace(
  '- transferir_para_closer: ',
  '- encerrar_conversa: use para encerrar a conversa quando o atendimento for concluído naturalmente — lead confirmou sem interesse, foi convertido ou pediu para não ser mais contatado. Não use se ainda houver possibilidade de retomada.\n- transferir_para_closer: '
);
if (patched === original) {
  console.error('WARN: prompt patch point not found — tool added but prompt not updated');
} else {
  promptNode.parameters.jsCode = patched;
  console.log('WF-07 prompt patched OK');
}

// ── Push both ──
Promise.all([
  apiPut('HDavqTNss64fFmJTIPpBQ', { name: wf04.name, nodes: wf04.nodes, connections: wf04.connections, settings: { executionOrder: wf04.settings.executionOrder } }),
  apiPut('J6buNeTLHsOLrDzy',      { name: wf07.name, nodes: wf07.nodes, connections: wf07.connections, settings: { executionOrder: wf07.settings.executionOrder } })
]).then(function(results) {
  const r04 = results[0], r07 = results[1];
  console.log('WF-04 push:', r04.status);
  if (r04.status !== 200) console.log('WF-04 error:', r04.body);
  console.log('WF-07 push:', r07.status);
  if (r07.status !== 200) console.log('WF-07 error:', r07.body);
}).catch(console.error);
