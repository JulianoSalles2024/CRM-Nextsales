'use strict';
const https = require('https');

const KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTk5MTFjNS1iNmJhLTQyNWEtODJkYS0zOGMxZjc2NzdmZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjdmMDU2ZTgtYmI3Ni00MTI5LTliM2MtZDE0ZmUyODkwODRmIiwiaWF0IjoxNzc0MjE1NjcxfQ.-E-Mr6KfbNXdp5Te8Q16kpON81TDP9KKvRlzYyW0JbI';
const WF_ID = 'J6buNeTLHsOLrDzy'; // WF-07 live ID

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
  // ── 1. GET WF-07 ───────────────────────────────────────────────────────────
  console.log('1. Buscando WF-07 do servidor...');
  const getRes = await apiRequest('GET', '/api/v1/workflows/' + WF_ID);
  if (getRes.status !== 200) {
    console.error('GET falhou:', getRes.status, getRes.body.slice(0, 300));
    process.exit(1);
  }
  const wf = JSON.parse(getRes.body);
  console.log('   Workflow:', wf.name, '| Nodes:', wf.nodes.length);

  // ── 2. Localizar Code - Build Prompt ───────────────────────────────────────
  const idx = wf.nodes.findIndex(function(n) { return n.name === 'Code - Build Prompt'; });
  if (idx === -1) {
    console.error('Node "Code - Build Prompt" não encontrado. Nodes disponíveis:');
    wf.nodes.forEach(function(n) { console.log('  -', n.name); });
    process.exit(1);
  }
  console.log('2. Node encontrado — ID:', wf.nodes[idx].id);

  // ── 3. String replace no jsCode ────────────────────────────────────────────
  const oldCode = wf.nodes[idx].parameters.jsCode;

  // Padrão exato extraído do live server V18 (else-block com var assignment)
  const OLD_SNIPPET = `   webhookData.content_type === 'followup'  ? 'INSTRUÇÃO INTERNA: Execute o follow-up agendado com este lead.' :`;

  const NEW_SNIPPET = `   webhookData.content_type === 'followup'  ? \`INSTRUÇÃO INTERNA: Tentativa de follow-up #\${followupN} sem resposta do lead. NÃO repita a abertura anterior. Use um ângulo diferente — mais curto, mais direto, ou referenciando um benefício específico do produto.\` :`;

  // Precisamos também injetar a declaração de followupN antes do bloco else
  const OLD_ELSE = `} else {\n  userMessage = webhookData.input_text`;
  const NEW_ELSE  = `} else {\n  const followupN = (webhookData._followup_count || 0) + 1;\n  userMessage = webhookData.input_text`;

  if (!oldCode.includes(OLD_SNIPPET)) {
    console.error('Padrão antigo não encontrado. Trecho final do código:');
    console.error(oldCode.slice(-600));
    process.exit(1);
  }

  let newCode = oldCode.replace(OLD_SNIPPET, NEW_SNIPPET);
  newCode = newCode.replace(OLD_ELSE, NEW_ELSE);

  if (newCode === oldCode) {
    console.error('Substituição não produziu mudanças. Abortando.');
    process.exit(1);
  }
  wf.nodes[idx].parameters.jsCode = newCode;
  console.log('3. Code - Build Prompt atualizado');

  // Verificar que a substituição contém o novo bloco
  const updatedCode = wf.nodes[idx].parameters.jsCode;
  console.log('   followupN declarado:', updatedCode.includes('const followupN') ? 'SIM' : 'NÃO');
  console.log('   Texto antigo removido:', !updatedCode.includes('Execute o follow-up agendado') ? 'SIM' : 'NÃO');

  // ── 4. Nome atualizado ──────────────────────────────────────────────────────
  wf.name = 'WF-07 — Agent Executor V19 (followup-fix)';

  // ── 5. PUT ─────────────────────────────────────────────────────────────────
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

  console.log('4. Enviando PUT para WF-07...');
  const putRes = await apiRequest('PUT', '/api/v1/workflows/' + WF_ID, putBody);
  console.log('   Status HTTP:', putRes.status);

  if (putRes.status === 200) {
    const result = JSON.parse(putRes.body);
    const buildNode = result.nodes.find(function(n) { return n.name === 'Code - Build Prompt'; });
    console.log('');
    console.log('✅ WF-07 ATUALIZADO');
    console.log('   Nome:', result.name);
    console.log('   followupN declarado:', buildNode && buildNode.parameters.jsCode.includes('const followupN') ? 'SIM' : 'NÃO');
    console.log('   Texto antigo eliminado:', buildNode && !buildNode.parameters.jsCode.includes('Execute o follow-up agendado') ? 'SIM' : 'NÃO');
  } else {
    console.error('❌ PUT falhou:', putRes.body.slice(0, 800));
    process.exit(1);
  }
}

main().catch(function(err) { console.error('Erro:', err.message); process.exit(1); });
