'use strict';
const https = require('https');

const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTk5MTFjNS1iNmJhLTQyNWEtODJkYS0zOGMxZjc2NzdmZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjdmMDU2ZTgtYmI3Ni00MTI5LTliM2MtZDE0ZmUyODkwODRmIiwiaWF0IjoxNzc0MjE1NjcxfQ.-E-Mr6KfbNXdp5Te8Q16kpON81TDP9KKvRlzYyW0JbI';
const WF_ID = 'J6buNeTLHsOLrDzy'; // WF-07 — Agent Executor V17

function apiCall(path, method, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
    const opts = {
      hostname: 'n8n.julianosalles.com.br', path, method,
      rejectUnauthorized: false,
      headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json' },
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, raw: d.substring(0, 500) }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const BEHAVIOR_CODE = `
// ── Fase A: Configurações de comportamento ────────────────────────────────
const agentTz = agent.timezone || 'America/Sao_Paulo';
const nowLocal = new Date().toLocaleString('pt-BR', { timeZone: agentTz, dateStyle: 'long', timeStyle: 'short' });

const behaviorLines = [];
if (agent.use_emojis === false) {
  behaviorLines.push('- NÃO use emojis em nenhuma hipótese nas respostas.');
} else {
  behaviorLines.push('- Você PODE usar emojis de forma moderada e natural.');
}
if (agent.sign_messages === true) {
  behaviorLines.push('- Ao final de cada mensagem, assine com "- ' + (agent.name || 'Agente') + '".');
}
if (agent.restrict_topics === true) {
  behaviorLines.push('- RESTRIÇÃO ESTRITA DE TEMAS: responda APENAS sobre assuntos diretamente relacionados à sua missão e nicho. Recuse educadamente qualquer pergunta fora do escopo comercial.');
}
const behaviorBlock = '\\n━━━ COMPORTAMENTO ━━━\\n' + behaviorLines.join('\\n');
const datetimeBlock = '\\n━━━ DATA E HORA ATUAL ━━━\\n' + nowLocal + ' (' + agentTz + ')';

`;

async function main() {
  // 1. Fetch current workflow
  console.log('Buscando WF-07 do n8n...');
  const res = await apiCall('/api/v1/workflows/' + WF_ID, 'GET');
  if (res.status !== 200) {
    console.error('Erro ao buscar workflow:', res.status, res.raw || JSON.stringify(res.json));
    process.exit(1);
  }
  const wf = res.json;
  console.log('Workflow obtido:', wf.name);

  // 2. Find Code - Build Prompt node
  const node = wf.nodes.find(n => n.name === 'Code - Build Prompt');
  if (!node) { console.error('Node "Code - Build Prompt" nao encontrado'); process.exit(1); }

  let code = node.parameters.jsCode;

  if (code.includes('Fase A')) {
    console.log('Fase A ja aplicada — nada a fazer.');
    return;
  }

  // 3. Inject behavior code before "// Full prompt"
  const marker = '// Full prompt';
  const insertAt = code.indexOf(marker);
  if (insertAt === -1) { console.error('"// Full prompt" nao encontrado no codigo'); process.exit(1); }

  code = code.substring(0, insertAt) + BEHAVIOR_CODE + code.substring(insertAt);

  // 4. Patch the fullPrompt template literal to include behaviorBlock + datetimeBlock
  code = code.replace(
    '`${systemPrompt}\n\n━━━ CONTEXTO',
    '`${systemPrompt}${behaviorBlock}${datetimeBlock}\n\n━━━ CONTEXTO'
  );

  if (!code.includes('${behaviorBlock}')) {
    console.error('Falhou ao injetar behaviorBlock no fullPrompt — verificar manualmente');
    process.exit(1);
  }

  // 5. Update node
  node.parameters.jsCode = code;

  // 6. PUT workflow back — only allowed fields
  const s = wf.settings || {};
  const cleanSettings = { executionOrder: s.executionOrder || 'v1' };
  ['saveManualExecutions','callerPolicy','errorWorkflow','timezone',
   'saveDataErrorExecution','saveDataSuccessExecution','saveExecutionProgress'
  ].forEach(k => { if (s[k] !== undefined) cleanSettings[k] = s[k]; });

  const body = JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: cleanSettings,
    staticData: wf.staticData || null,
  });

  console.log('Enviando atualização para o n8n...');
  const upd = await apiCall('/api/v1/workflows/' + WF_ID, 'PUT', body);
  if (upd.status === 200) {
    console.log('OK — WF-07 atualizado com Fase A no n8n');
    const patchedNode = upd.json.nodes.find(n => n.name === 'Code - Build Prompt');
    console.log('Fase A presente:', patchedNode.parameters.jsCode.includes('Fase A'));
    console.log('behaviorBlock no fullPrompt:', patchedNode.parameters.jsCode.includes('${behaviorBlock}'));
  } else {
    console.error('Erro ao atualizar:', upd.status, upd.raw || JSON.stringify(upd.json).substring(0, 300));
  }
}

main().catch(console.error);
