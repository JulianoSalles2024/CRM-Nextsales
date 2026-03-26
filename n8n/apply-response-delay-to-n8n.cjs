'use strict';
const https = require('https');

const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTk5MTFjNS1iNmJhLTQyNWEtODJkYS0zOGMxZjc2NzdmZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjdmMDU2ZTgtYmI3Ni00MTI5LTliM2MtZDE0ZmUyODkwODRmIiwiaWF0IjoxNzc0MjE1NjcxfQ.-E-Mr6KfbNXdp5Te8Q16kpON81TDP9KKvRlzYyW0JbI';
const WF_ID = 'J6buNeTLHsOLrDzy';

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

// Delay code to append at end of Code - Calc Metrics (before return)
const DELAY_CODE = `
// ── Fase B: Response delay ────────────────────────────────────────────────
const agentForDelay = (() => {
  try {
    const raw = $('HTTP - Get Agent').first().json;
    return Array.isArray(raw) ? raw[0] : raw;
  } catch(e) { return {}; }
})();
const delaySec = parseInt(agentForDelay.response_delay_seconds || 0, 10);
if (delaySec > 0) {
  await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
}
`;

async function main() {
  console.log('Buscando WF-07...');
  const res = await apiCall('/api/v1/workflows/' + WF_ID, 'GET');
  if (res.status !== 200) { console.error('Erro GET:', res.status, res.raw); process.exit(1); }
  const wf = res.json;

  const node = wf.nodes.find(n => n.name === 'Code - Calc Metrics');
  if (!node) { console.error('Node "Code - Calc Metrics" nao encontrado'); process.exit(1); }

  if (node.parameters.jsCode.includes('Fase B')) {
    console.log('Fase B ja aplicada — nada a fazer.');
    return;
  }

  // Inject delay before the final return statement
  let code = node.parameters.jsCode;
  const returnIdx = code.lastIndexOf('return [');
  if (returnIdx === -1) { console.error('"return [" nao encontrado'); process.exit(1); }

  code = code.substring(0, returnIdx) + DELAY_CODE + '\n' + code.substring(returnIdx);
  node.parameters.jsCode = code;

  // Verify syntax (async context — n8n Code nodes support await)
  try { new (Object.getPrototypeOf(async function(){}).constructor)(code); console.log('Sintaxe JS: OK'); }
  catch(e) { console.error('ERRO de sintaxe:', e.message); process.exit(1); }

  // PUT
  const s = wf.settings || {};
  const cleanSettings = { executionOrder: s.executionOrder || 'v1' };
  ['saveManualExecutions','callerPolicy','errorWorkflow','timezone',
   'saveDataErrorExecution','saveDataSuccessExecution','saveExecutionProgress',
  ].forEach(k => { if (s[k] !== undefined) cleanSettings[k] = s[k]; });

  const body = JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: cleanSettings,
    staticData: wf.staticData || null,
  });

  console.log('Enviando para o n8n...');
  const upd = await apiCall('/api/v1/workflows/' + WF_ID, 'PUT', body);
  if (upd.status === 200) {
    const patched = upd.json.nodes.find(n => n.name === 'Code - Calc Metrics');
    console.log('OK — WF-07 atualizado');
    console.log('Fase B presente:', patched.parameters.jsCode.includes('Fase B'));
  } else {
    console.error('Erro PUT:', upd.status, upd.raw || JSON.stringify(upd.json).substring(0, 300));
  }
}

main().catch(console.error);
