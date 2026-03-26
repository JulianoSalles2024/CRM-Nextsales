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

// Split logic injected before the return statement in Code - Calc Metrics
const SPLIT_CODE = `
// ── Fase D: Split responses ────────────────────────────────────────────────
let outputToSend = agentOutput;

if (agentForDelay.split_responses === true) {
  const MAX_CHARS = 400;
  const rawParts = agentOutput.split(/\\n\\n+/).map(p => p.trim()).filter(Boolean);

  // Further split parts exceeding MAX_CHARS at sentence boundary
  const parts = [];
  for (const part of rawParts) {
    if (part.length <= MAX_CHARS) {
      parts.push(part);
    } else {
      let remaining = part;
      while (remaining.length > MAX_CHARS) {
        const chunk = remaining.substring(0, MAX_CHARS);
        const lastBreak = Math.max(
          chunk.lastIndexOf('. '),
          chunk.lastIndexOf('? '),
          chunk.lastIndexOf('! '),
          chunk.lastIndexOf('\\n')
        );
        const cutAt = lastBreak > 50 ? lastBreak + 1 : MAX_CHARS;
        parts.push(remaining.substring(0, cutAt).trim());
        remaining = remaining.substring(cutAt).trim();
      }
      if (remaining) parts.push(remaining);
    }
  }

  if (parts.length > 1) {
    const instanceId = encodeURIComponent($('HTTP - Get Connection').first().json.external_id);
    const phone = ($('Webhook').first().json.body.contact_identifier || $('HTTP - Get Lead').first().json.phone || '').replace(/\\D/g, '');
    const evoUrl = 'https://easypanel.julianosalles.com.br/message/sendText/' + instanceId;
    const evoKey = 'LZLQMWZUSZSRPEIJLMVXBDPRQYVUZBCI';

    for (let i = 0; i < parts.length - 1; i++) {
      // Proporcional: 40ms/char, min 1000ms, max 4000ms
      const delayMs = Math.min(Math.max(parts[i].length * 40, 1000), 4000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await $helpers.httpRequest({
        method: 'POST',
        url: evoUrl,
        headers: { apikey: evoKey, 'Content-Type': 'application/json' },
        body: { number: phone, text: parts[i] },
        json: true,
      });
    }

    // Delay before last part (HTTP - Send WhatsApp will send it)
    const lastDelay = Math.min(Math.max(parts[parts.length - 2].length * 40, 1000), 4000);
    await new Promise(resolve => setTimeout(resolve, lastDelay));
    outputToSend = parts[parts.length - 1];
  }
}

`;

async function main() {
  console.log('Buscando WF-07...');
  const res = await apiCall('/api/v1/workflows/' + WF_ID, 'GET');
  if (res.status !== 200) { console.error('Erro GET:', res.status, res.raw); process.exit(1); }
  const wf = res.json;

  const node = wf.nodes.find(n => n.name === 'Code - Calc Metrics');
  if (!node) { console.error('Node "Code - Calc Metrics" nao encontrado'); process.exit(1); }

  if (node.parameters.jsCode.includes('Fase D')) {
    console.log('Fase D ja aplicada — nada a fazer.');
    return;
  }

  let code = node.parameters.jsCode;

  // Inject split code before the final return
  const returnIdx = code.lastIndexOf('return [');
  if (returnIdx === -1) { console.error('"return [" nao encontrado'); process.exit(1); }

  code = code.substring(0, returnIdx) + SPLIT_CODE + code.substring(returnIdx);

  // Override output in return: spread AI Agent json but override output with outputToSend
  code = code.replace(
    '...$\'AI Agent\'.first().json,',
    '...$\'AI Agent\'.first().json,\n    output: outputToSend,'
  );

  // Fallback if replace didn't match (different quote style)
  if (!code.includes('output: outputToSend')) {
    code = code.replace(
      "...$('AI Agent').first().json,",
      "...$('AI Agent').first().json,\n    output: outputToSend,"
    );
  }

  node.parameters.jsCode = code;

  // Verify syntax
  try {
    new (Object.getPrototypeOf(async function(){}).constructor)(code);
    console.log('Sintaxe JS: OK');
  } catch(e) {
    console.error('ERRO de sintaxe:', e.message);
    process.exit(1);
  }

  // Verify key changes
  console.log('Fase D presente:', code.includes('Fase D'));
  console.log('output: outputToSend presente:', code.includes('output: outputToSend'));

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
    console.log('OK — WF-07 atualizado com split_responses');
  } else {
    console.error('Erro PUT:', upd.status, upd.raw || JSON.stringify(upd.json).substring(0, 300));
  }
}

main().catch(console.error);
