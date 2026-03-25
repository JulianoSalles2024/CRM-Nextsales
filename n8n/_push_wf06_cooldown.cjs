'use strict';
const https = require('https');

const KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTk5MTFjNS1iNmJhLTQyNWEtODJkYS0zOGMxZjc2NzdmZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjdmMDU2ZTgtYmI3Ni00MTI5LTliM2MtZDE0ZmUyODkwODRmIiwiaWF0IjoxNzc0MjE1NjcxfQ.-E-Mr6KfbNXdp5Te8Q16kpON81TDP9KKvRlzYyW0JbI';
const SVC    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoa2hhbXdyZnd0YWN3eWR1a3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMyNjcxMywiZXhwIjoyMDgwOTAyNzEzfQ.slNbow0lzBpryTaPPNNPDOV5x_uBqRHQZR38RRk92sY';
const WF06_ID = 'oeOYbr_dHo6fYhQBp8pY2'; // WF-06 · Roteador de Agentes Comerciais (ATIVO)

function apiRequest(method, path, body) {
  return new Promise(function(resolve, reject) {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'n8n.julianosalles.com.br',
      path: path,
      method: method,
      rejectUnauthorized: false,
      headers: { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' }
    };
    if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() { resolve({ status: res.statusCode, body: data }); });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  // ── 1. GET WF-06 ativo diretamente ─────────────────────────────────────────
  console.log('1. Buscando WF-06 ativo (ID: ' + WF06_ID + ')...');
  const getRes = await apiRequest('GET', '/api/v1/workflows/' + WF06_ID);
  if (getRes.status !== 200) {
    console.error('GET falhou:', getRes.status, getRes.body.slice(0, 300));
    process.exit(1);
  }
  const wf = JSON.parse(getRes.body);
  console.log('   Nome:', wf.name, '| Nodes:', wf.nodes.length, '| Ativo:', wf.active);

  // ── 3. Modificar Code - Build WF07 Payload ─────────────────────────────────
  const payloadNodeIdx = wf.nodes.findIndex(function(n) { return n.name === 'Code - Build WF07 Payload'; });
  if (payloadNodeIdx === -1) {
    console.error('Node "Code - Build WF07 Payload" não encontrado');
    process.exit(1);
  }

  const oldPayloadCode = wf.nodes[payloadNodeIdx].parameters.jsCode;
  // Adicionar _followup_count: 0 ao return do payload
  // Substituição exata — linha final do return no payload node
  const newPayloadCode = oldPayloadCode.replace(
    "    content_type: 'proactive'\n  }\n}];",
    "    content_type: 'proactive',\n    _followup_count: 0\n  }\n}];"
  );

  if (newPayloadCode === oldPayloadCode) {
    console.warn('   AVISO: padrão de substituição não encontrado no payload node — verificando código atual...');
    console.warn('   Trecho atual:', oldPayloadCode.slice(-200));
  } else {
    wf.nodes[payloadNodeIdx].parameters.jsCode = newPayloadCode;
    console.log('3. Code - Build WF07 Payload: _followup_count: 0 adicionado');
  }

  // ── 4. Adicionar nó HTTP - Patch Memory ────────────────────────────────────
  const triggerNode = wf.nodes.find(function(n) { return n.name === 'HTTP - Trigger WF-07'; });
  if (!triggerNode) {
    console.error('Node "HTTP - Trigger WF-07" não encontrado');
    process.exit(1);
  }

  const patchNode = {
    id:          'wf06-node-020',
    name:        'HTTP - Patch Memory Cooldown',
    type:        'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position:    [ triggerNode.position[0] + 240, triggerNode.position[1] ],
    continueOnFail: true,
    parameters: {
      url:         'https://fhkhamwrfwtacwydukvb.supabase.co/rest/v1/agent_lead_memory',
      method:      'PATCH',
      sendQuery:   true,
      queryParameters: {
        parameters: [
          { name: 'lead_id',  value: "=eq.{{ $('Code - Build WF07 Payload').first().json.lead_id }}" },
          { name: 'agent_id', value: "=eq.{{ $('Code - Build WF07 Payload').first().json.agent_id }}" }
        ]
      },
      sendBody:    true,
      specifyBody: 'json',
      jsonBody:    '={ "next_action_at": null, "last_action_at": "{{ new Date().toISOString() }}" }',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey',        value: SVC },
          { name: 'Authorization', value: 'Bearer ' + SVC },
          { name: 'Content-Type',  value: 'application/json' },
          { name: 'Prefer',        value: 'return=minimal' }
        ]
      },
      options: {}
    }
  };
  wf.nodes.push(patchNode);
  console.log('4. Node "HTTP - Patch Memory Cooldown" adicionado');

  // ── 5. Redirecionar conexão: Trigger WF-07 → Patch Memory → Loop Leads ──────
  // Antes: HTTP - Trigger WF-07 → Loop - Leads
  // Depois: HTTP - Trigger WF-07 → HTTP - Patch Memory Cooldown → Loop - Leads

  // Encontrar o que Trigger WF-07 atualmente aponta
  const triggerConnections = wf.connections['HTTP - Trigger WF-07'];
  const currentTarget = triggerConnections && triggerConnections.main && triggerConnections.main[0] && triggerConnections.main[0][0]
    ? triggerConnections.main[0][0].node
    : 'Loop - Leads';

  // Trigger agora aponta para Patch
  wf.connections['HTTP - Trigger WF-07'] = {
    main: [[ { node: 'HTTP - Patch Memory Cooldown', type: 'main', index: 0 } ]]
  };
  // Patch aponta para onde Trigger apontava antes (Loop - Leads)
  wf.connections['HTTP - Patch Memory Cooldown'] = {
    main: [[ { node: currentTarget, type: 'main', index: 0 } ]]
  };
  console.log('5. Conexões atualizadas: Trigger → Patch → ' + currentTarget);

  // ── 6. Nome e PUT ───────────────────────────────────────────────────────────
  // Preserva o nome existente, apenas acrescenta tag de versão se não tiver
  if (!wf.name.includes('cooldown')) {
    wf.name = wf.name + ' (cooldown)';
  }

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

  console.log('6. Enviando PUT para WF-06...');
  const putRes = await apiRequest('PUT', '/api/v1/workflows/' + WF06_ID, putBody);
  console.log('   Status HTTP:', putRes.status);

  if (putRes.status === 200) {
    const result = JSON.parse(putRes.body);
    const patchNodeResult = result.nodes.find(function(n) { return n.name === 'HTTP - Patch Memory Cooldown'; });
    const payloadNodeResult = result.nodes.find(function(n) { return n.name === 'Code - Build WF07 Payload'; });
    console.log('');
    console.log('✅ WF-06 ATUALIZADO');
    console.log('   Nome:', result.name);
    console.log('   Nodes totais:', result.nodes.length);
    console.log('   Patch node presente:', patchNodeResult ? 'SIM' : 'NÃO');
    console.log('   Payload node _followup_count:', payloadNodeResult && payloadNodeResult.parameters.jsCode.includes('_followup_count') ? 'SIM' : 'NÃO');
  } else {
    console.error('❌ PUT falhou:', putRes.body.slice(0, 800));
    process.exit(1);
  }
}

main().catch(function(err) { console.error('Erro:', err.message); process.exit(1); });
