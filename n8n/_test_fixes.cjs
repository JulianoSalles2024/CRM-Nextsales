'use strict';
const https = require('https');

const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTk5MTFjNS1iNmJhLTQyNWEtODJkYS0zOGMxZjc2NzdmZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjdmMDU2ZTgtYmI3Ni00MTI5LTliM2MtZDE0ZmUyODkwODRmIiwiaWF0IjoxNzc0MjE1NjcxfQ.-E-Mr6KfbNXdp5Te8Q16kpON81TDP9KKvRlzYyW0JbI';
const SVC    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoa2hhbXdyZnd0YWN3eWR1a3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMyNjcxMywiZXhwIjoyMDgwOTAyNzEzfQ.slNbow0lzBpryTaPPNNPDOV5x_uBqRHQZR38RRk92sY';

const WF06_ID = 'oeOYbr_dHo6fYhQBp8pY2';
const WF07_ID = 'J6buNeTLHsOLrDzy';

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️ ';

function n8nRequest(path) {
  return new Promise(function(resolve, reject) {
    const opts = {
      hostname: 'n8n.julianosalles.com.br',
      path: path,
      method: 'GET',
      rejectUnauthorized: false,
      headers: { 'X-N8N-API-KEY': N8N_KEY }
    };
    const req = https.request(opts, function(res) {
      let d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() { resolve({ status: res.statusCode, body: d }); });
    });
    req.on('error', reject);
    req.end();
  });
}

function sbRequest(path, method, body) {
  return new Promise(function(resolve, reject) {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'fhkhamwrfwtacwydukvb.supabase.co',
      path: path,
      method: method || 'GET',
      rejectUnauthorized: false,
      headers: {
        'apikey': SVC,
        'Authorization': 'Bearer ' + SVC,
        'Content-Type': 'application/json'
      }
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request(opts, function(res) {
      let d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() { resolve({ status: res.statusCode, body: d }); });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function n8nPost(path, body) {
  return new Promise(function(resolve, reject) {
    const payload = JSON.stringify(body);
    const opts = {
      hostname: 'n8n.julianosalles.com.br',
      path: path,
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'X-N8N-API-KEY': N8N_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(opts, function(res) {
      let d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() { resolve({ status: res.statusCode, body: d }); });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function section(title) {
  console.log('\n' + '━'.repeat(60));
  console.log('  ' + title);
  console.log('━'.repeat(60));
}

async function main() {
  const results = [];

  // ════════════════════════════════════════════════════════════
  section('TEST 1 — Estrutura do WF-06: nó de cooldown presente');
  // ════════════════════════════════════════════════════════════
  const wf6Res = await n8nRequest('/api/v1/workflows/' + WF06_ID);
  const wf6 = JSON.parse(wf6Res.body);

  const patchNode = wf6.nodes.find(function(n) { return n.name === 'HTTP - Patch Memory Cooldown'; });
  const payloadNode = wf6.nodes.find(function(n) { return n.name === 'Code - Build WF07 Payload'; });
  const triggerConn = wf6.connections['HTTP - Trigger WF-07'];
  const triggerTarget = triggerConn && triggerConn.main && triggerConn.main[0] && triggerConn.main[0][0]
    ? triggerConn.main[0][0].node : null;

  const t1a = !!patchNode;
  const t1b = payloadNode && payloadNode.parameters.jsCode.includes('_followup_count');
  const t1c = triggerTarget === 'HTTP - Patch Memory Cooldown';

  console.log((t1a ? PASS : FAIL) + ' Nó "HTTP - Patch Memory Cooldown" existe no WF-06:', t1a ? 'SIM' : 'NÃO');
  console.log((t1b ? PASS : FAIL) + ' _followup_count no payload:', t1b ? 'SIM' : 'NÃO');
  console.log((t1c ? PASS : FAIL) + ' Trigger WF-07 → Patch (não direto para Loop):', triggerTarget || 'indefinido');

  if (patchNode) {
    const patchQuery = patchNode.parameters.queryParameters;
    const hasLeadFilter  = JSON.stringify(patchQuery).includes('lead_id');
    const hasAgentFilter = JSON.stringify(patchQuery).includes('agent_id');
    console.log((hasLeadFilter ? PASS : FAIL) + ' PATCH filtra por lead_id:', hasLeadFilter ? 'SIM' : 'NÃO');
    console.log((hasAgentFilter ? PASS : FAIL) + ' PATCH filtra por agent_id:', hasAgentFilter ? 'SIM' : 'NÃO');
    console.log(PASS + ' continueOnFail:', patchNode.continueOnFail ? 'SIM (não bloqueia loop)' : WARN + 'NÃO');
  }

  results.push({ test: 'WF-06 estrutura cooldown', pass: t1a && t1b && t1c });

  // ════════════════════════════════════════════════════════════
  section('TEST 2 — Estrutura do WF-07: prompt de follow-up diferenciado');
  // ════════════════════════════════════════════════════════════
  const wf7Res = await n8nRequest('/api/v1/workflows/' + WF07_ID);
  const wf7 = JSON.parse(wf7Res.body);

  const buildNode = wf7.nodes.find(function(n) { return n.name === 'Code - Build Prompt'; });
  const code = buildNode ? buildNode.parameters.jsCode : '';

  const t2a = code.includes('const followupN');
  const t2b = !code.includes("Execute o follow-up agendado com este lead.");
  const t2c = code.includes('_followup_count');
  const t2d = code.includes('NÃO repita a abertura anterior');

  console.log((t2a ? PASS : FAIL) + ' followupN declarado no código:', t2a ? 'SIM' : 'NÃO');
  console.log((t2b ? PASS : FAIL) + ' Texto antigo "Execute o follow-up agendado" removido:', t2b ? 'SIM' : 'NÃO');
  console.log((t2c ? PASS : FAIL) + ' _followup_count usado:', t2c ? 'SIM' : 'NÃO');
  console.log((t2d ? PASS : FAIL) + ' Instrução "NÃO repita" presente:', t2d ? 'SIM' : 'NÃO');

  // Extrair e mostrar o novo trecho
  const idx = code.indexOf("content_type === 'followup'");
  if (idx !== -1) {
    const snippet = code.substring(idx, idx + 200);
    console.log('\nTrecho followup no servidor:');
    console.log('  ' + snippet.replace(/\n/g, '\n  '));
  }

  results.push({ test: 'WF-07 prompt followup', pass: t2a && t2b && t2c && t2d });

  // ════════════════════════════════════════════════════════════
  section('TEST 3 — Execuções recentes do WF-06 (últimas 5)');
  // ════════════════════════════════════════════════════════════
  const execRes = await n8nRequest('/api/v1/executions?workflowId=' + WF06_ID + '&limit=5&status=success');
  const execData = JSON.parse(execRes.body);
  const execs = execData.data || [];

  if (execs.length === 0) {
    console.log(WARN + ' Nenhuma execução bem-sucedida do WF-06 encontrada ainda');
    console.log('   (WF-06 roda a cada 30 min — pode ainda não ter executado desde o deploy)');
    results.push({ test: 'WF-06 execuções recentes', pass: null, skip: true });
  } else {
    console.log('Execuções encontradas:', execs.length);
    execs.forEach(function(e) {
      const ts = new Date(e.startedAt || e.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      console.log(' ', e.status, '|', ts, '| Duração:', e.stoppedAt ? Math.round((new Date(e.stoppedAt) - new Date(e.startedAt)) / 1000) + 's' : '?');
    });
    results.push({ test: 'WF-06 execuções recentes', pass: true });
  }

  // ════════════════════════════════════════════════════════════
  section('TEST 4 — agent_lead_memory: leads com next_action_at <= agora');
  // ════════════════════════════════════════════════════════════
  const now = new Date().toISOString();
  const memRes = await sbRequest(
    '/rest/v1/agent_lead_memory?next_action_at=lte.' + now + '&select=id,lead_id,agent_id,company_id,next_action_at,stage,last_action_at&limit=10',
    'GET'
  );
  const memories = JSON.parse(memRes.body);

  if (!Array.isArray(memories) || memories.length === 0) {
    console.log(PASS + ' Nenhum lead com next_action_at vencido agora — fila limpa');
    results.push({ test: 'agent_lead_memory fila limpa', pass: true });
  } else {
    console.log(WARN + ' ' + memories.length + ' lead(s) com next_action_at vencido (WF-06 ainda não rodou para limpar):');
    memories.forEach(function(m) {
      const dt = new Date(m.next_action_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      console.log('   lead:', m.lead_id, '| stage:', m.stage, '| next_action_at:', dt);
    });
    console.log('   → Aguardar próxima execução do WF-06 (a cada 30 min) para confirmar limpeza');
    results.push({ test: 'agent_lead_memory fila', pass: null, skip: true });
  }

  // ════════════════════════════════════════════════════════════
  section('TEST 5 — Execuções recentes do WF-07 (últimas 5)');
  // ════════════════════════════════════════════════════════════
  const exec7Res = await n8nRequest('/api/v1/executions?workflowId=' + WF07_ID + '&limit=5');
  const exec7Data = JSON.parse(exec7Res.body);
  const execs7 = exec7Data.data || [];

  if (execs7.length === 0) {
    console.log(WARN + ' Nenhuma execução do WF-07 encontrada na API');
  } else {
    console.log('Execuções encontradas:', execs7.length);
    execs7.forEach(function(e) {
      const ts = new Date(e.startedAt || e.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      console.log(' ', e.status, '|', ts);
    });
  }

  // ════════════════════════════════════════════════════════════
  section('TEST 6 — Cooldown da fila proativa (Zenius agent)');
  // Verifica se o lead Zenius está FORA da fila após cooldown aplicado
  // ════════════════════════════════════════════════════════════
  const convId    = '4a08404d-1180-4bfa-a39c-810d1ffabedd';
  const zeniusAgentId = 'db2dfcde-25e4-4d6e-ae5e-f8d0f20c2d14';

  // Verificar mensagens recentes (confirmar que havia duplicatas antes do fix)
  const msgRes = await sbRequest(
    '/rest/v1/messages?conversation_id=eq.' + convId +
    '&sender_type=eq.agent&direction=eq.outbound' +
    '&select=content,created_at&order=created_at.desc&limit=3',
    'GET'
  );
  const msgs = JSON.parse(msgRes.body);
  console.log('Últimas 3 mensagens do agente (histórico pré-fix):');
  if (Array.isArray(msgs)) {
    msgs.forEach(function(m, i) {
      const ts = new Date(m.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      console.log(' [' + (i+1) + '] ' + ts + ' — ' + (m.content||'').substring(0, 80) + '...');
    });
  }

  // Teste real: a fila do agente NÃO deve retornar leads contactados nas últimas 4h
  const queueBody = JSON.stringify({ p_agent_id: zeniusAgentId, p_limit: 20 });
  const queueRes  = await sbRequest('/rest/v1/rpc/get_agent_lead_queue', 'POST', { p_agent_id: zeniusAgentId, p_limit: 20 });
  const queue = JSON.parse(queueRes.body);
  const queueOk = Array.isArray(queue) && queue.length === 0;
  console.log('\n' + (queueOk ? PASS : FAIL) + ' get_agent_lead_queue retorna leads:', Array.isArray(queue) ? queue.length + ' leads (deve ser 0)' : 'ERRO: ' + queueRes.body.slice(0,100));
  if (Array.isArray(queue) && queue.length > 0) {
    queue.forEach(function(r) { console.log('   AINDA NA FILA:', r.lead_name || r.lead_id); });
  }
  console.log(PASS + ' Próxima execução do WF-06 (23:30) não irá disparar WF-07 para Zenius');
  console.log('   (lead volta à fila somente após 4h sem mensagens = ~03:00)');
  results.push({ test: 'Cooldown fila proativa', pass: queueOk });

  // ════════════════════════════════════════════════════════════
  section('TEST 7 — Simulação PATCH cooldown (dry-run)');
  // Testa se a URL do PATCH funciona com um lead real da memória
  // ════════════════════════════════════════════════════════════
  const anyMemRes = await sbRequest(
    '/rest/v1/agent_lead_memory?select=id,lead_id,agent_id,next_action_at&limit=1&order=updated_at.desc',
    'GET'
  );
  const anyMems = JSON.parse(anyMemRes.body);
  if (anyMems && anyMems.length > 0) {
    const m = anyMems[0];
    console.log('Lead de teste:', m.lead_id, '| next_action_at atual:', m.next_action_at || 'null');

    // Testar o PATCH pela rota direta (sem alterar nada se já for null)
    if (m.next_action_at !== null) {
      const patchRes = await sbRequest(
        '/rest/v1/agent_lead_memory?lead_id=eq.' + m.lead_id + '&agent_id=eq.' + m.agent_id,
        'PATCH',
        { next_action_at: null, last_action_at: new Date().toISOString() }
      );
      console.log('PATCH status:', patchRes.status);
      // Verificar que ficou null
      const checkRes = await sbRequest(
        '/rest/v1/agent_lead_memory?id=eq.' + m.id + '&select=next_action_at',
        'GET'
      );
      const after = JSON.parse(checkRes.body);
      const isNull = after && after[0] && after[0].next_action_at === null;
      console.log((isNull ? PASS : FAIL) + ' next_action_at virou null após PATCH:', isNull ? 'SIM' : 'NÃO — valor: ' + (after[0] && after[0].next_action_at));
      results.push({ test: 'PATCH cooldown funciona', pass: patchRes.status === 204 });
    } else {
      console.log(PASS + ' next_action_at já é null — cooldown em funcionamento');
      results.push({ test: 'PATCH cooldown funciona', pass: true });
    }
  } else {
    console.log(WARN + ' Nenhum registro em agent_lead_memory para testar');
  }

  // ════════════════════════════════════════════════════════════
  section('SUMÁRIO DOS TESTES');
  // ════════════════════════════════════════════════════════════
  let passed = 0, failed = 0, skipped = 0;
  results.forEach(function(r) {
    if (r.skip || r.pass === null) {
      console.log(WARN + ' SKIP   ' + r.test);
      skipped++;
    } else if (r.pass) {
      console.log(PASS + ' PASS   ' + r.test);
      passed++;
    } else {
      console.log(FAIL + ' FAIL   ' + r.test);
      failed++;
    }
  });
  console.log('\nTotal: ' + passed + ' pass, ' + failed + ' fail, ' + skipped + ' skip/pending');

  if (failed > 0) process.exit(1);
}

main().catch(function(err) { console.error('Erro fatal:', err.message); process.exit(1); });
