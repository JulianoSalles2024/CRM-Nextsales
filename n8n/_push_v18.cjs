'use strict';
const https = require('https');

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTk5MTFjNS1iNmJhLTQyNWEtODJkYS0zOGMxZjc2NzdmZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjdmMDU2ZTgtYmI3Ni00MTI5LTliM2MtZDE0ZmUyODkwODRmIiwiaWF0IjoxNzc0MjE1NjcxfQ.-E-Mr6KfbNXdp5Te8Q16kpON81TDP9KKvRlzYyW0JbI';
const SVC  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoa2hhbXdyZnd0YWN3eWR1a3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMyNjcxMywiZXhwIjoyMDgwOTAyNzEzfQ.slNbow0lzBpryTaPPNNPDOV5x_uBqRHQZR38RRk92sY';
const WF_ID = 'J6buNeTLHsOLrDzy';

// jsonBody uses n8n expression syntax — kept as a JS string, no shell escaping needed
const JSON_BODY = [
  '={',
  '  "p_conversation_id": "{{ $(\'Webhook\').first().json.body.conversation_id }}",',
  '  "p_company_id":      "{{ $(\'Webhook\').first().json.body.company_id }}",',
  '  "p_reason":          "{{ $fromAI(\'reason\', \'Motivo natural do encerramento em português\') }}",',
  '  "p_outcome":         "{{ $fromAI(\'outcome\', \'Resultado: won | lost | neutral\') }}"',
  '}'
].join('\n');

const INPUT_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    reason: {
      type: 'string',
      description: 'Motivo natural do encerramento em português. Ex: Lead confirmou sem interesse, Venda concluída, Lead pediu para não ser contatado'
    },
    outcome: {
      type: 'string',
      enum: ['won', 'lost', 'neutral'],
      description: "'won' = lead convertido/comprou. 'lost' = desistiu/sem interesse. 'neutral' = encerrado sem julgamento de resultado."
    }
  },
  required: ['reason', 'outcome']
});

function apiRequest(method, path, body) {
  return new Promise(function(resolve, reject) {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'n8n.julianosalles.com.br',
      path: path,
      method: method,
      rejectUnauthorized: false,
      headers: {
        'X-N8N-API-KEY': KEY,
        'Content-Type': 'application/json'
      }
    };
    if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);

    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() { resolve({ status: res.statusCode, body: data }); });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  // ── 1. GET workflow ────────────────────────────────────────────────────────
  console.log('1. Buscando WF-07 do servidor...');
  const getRes = await apiRequest('GET', '/api/v1/workflows/' + WF_ID);
  if (getRes.status !== 200) {
    console.error('GET falhou:', getRes.status, getRes.body.slice(0, 300));
    process.exit(1);
  }
  const wf = JSON.parse(getRes.body);
  console.log('   workflow:', wf.name, '| nodes:', wf.nodes.length);

  // ── 2. Find node by name ───────────────────────────────────────────────────
  const idx = wf.nodes.findIndex(function(n) { return n.name === 'encerrar_conversa'; });
  if (idx === -1) {
    console.error('Node encerrar_conversa não encontrado');
    process.exit(1);
  }
  const oldNode = wf.nodes[idx];
  console.log('2. Node encontrado — ID:', oldNode.id, '| type atual:', oldNode.type);

  // ── 3. Build replacement node (keep same id + position from server) ────────
  const newNode = {
    id:          oldNode.id,
    name:        'encerrar_conversa',
    type:        '@n8n/n8n-nodes-langchain.toolHttpRequest',
    typeVersion: 1.1,
    position:    oldNode.position,
    parameters: {
      name:        'encerrar_conversa',
      description: 'Encerra a conversa com cleanup completo via RPC unificada: fecha conversa, cancela follow-ups pendentes, arquiva memória do agente e atualiza status do lead. Use SOMENTE quando o atendimento for concluído naturalmente. Informe o motivo (reason) e o resultado comercial (outcome). NÃO use se houver possibilidade de retomada.',
      method:      'POST',
      url:         'https://fhkhamwrfwtacwydukvb.supabase.co/rest/v1/rpc/close_conversation',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey',        value: SVC },
          { name: 'Authorization', value: 'Bearer ' + SVC },
          { name: 'Content-Type',  value: 'application/json' }
        ]
      },
      sendBody:    true,
      specifyBody: 'json',
      jsonBody:    JSON_BODY,
      schemaType:  'manual',
      inputSchema: INPUT_SCHEMA,
      options:     {}
    }
  };

  wf.nodes[idx] = newNode;
  wf.name = 'WF-07 — Agent Executor V18 (rpc-close)';

  // ── 4. Build PUT body — only fields the API accepts ───────────────────────
  // n8n API v1 PUT accepts: name, nodes, connections, settings
  // settings must not contain extra properties beyond what schema allows
  const allowedSettings = {
    executionOrder:       wf.settings.executionOrder,
    saveManualExecutions: wf.settings.saveManualExecutions,
    callerPolicy:         wf.settings.callerPolicy,
  };
  if (wf.settings.errorWorkflow !== undefined) {
    allowedSettings.errorWorkflow = wf.settings.errorWorkflow;
  }

  const putBody = {
    name:        wf.name,
    nodes:       wf.nodes,
    connections: wf.connections,
    settings:    allowedSettings
  };

  // ── 5. PUT ─────────────────────────────────────────────────────────────────
  console.log('3. Enviando PUT para o servidor...');
  const putRes = await apiRequest('PUT', '/api/v1/workflows/' + WF_ID, putBody);
  console.log('   Status HTTP:', putRes.status);

  if (putRes.status === 200) {
    const result = JSON.parse(putRes.body);
    const updatedNode = result.nodes.find(function(n) { return n.name === 'encerrar_conversa'; });
    console.log('');
    console.log('✅ SUCESSO');
    console.log('   Workflow:', result.name);
    console.log('   Node ID:', updatedNode.id);
    console.log('   Node type:', updatedNode.type);
    console.log('   Method:', updatedNode.parameters.method);
    console.log('   URL:', updatedNode.parameters.url);
    console.log('   schemaType:', updatedNode.parameters.schemaType);
  } else {
    console.error('❌ PUT falhou:', putRes.body.slice(0, 800));
  }
}

main().catch(function(err) { console.error('Erro:', err.message); process.exit(1); });
