/**
 * build-wf01-v14.cjs
 * Gera WF-01-WA-INBOUND V14 (auto-assign-sdr) a partir do V13.
 *
 * Gap corrigido: novas conversas sempre chegam com ai_agent_id = NULL.
 * O V13 roteava direto para WF-05 (legado) quando não havia agente.
 * O V14 tenta encontrar o SDR ativo da empresa, atribui à conversa
 * e dispara WF-07. Só faz fallback para WF-05 se não houver SDR ativo.
 *
 * Novos nós adicionados (após IF - Has AI Agent → FALSE):
 *   HTTP - Get SDR Agent   → busca ai_agents onde function_type=sdr & is_active=true
 *   IF - Has SDR Agent     → verifica se encontrou algum SDR
 *   HTTP - Assign SDR Agent → PATCH conversation para setar ai_agent_id
 *   HTTP - Trigger WF07 (SDR Auto) → dispara WF-07 com o SDR encontrado
 *
 * Conexões alteradas:
 *   IF - Has AI Agent [FALSE] → agora vai para HTTP - Get SDR Agent
 *                               (antes ia direto para HTTP - Trigger AI Agent)
 *   IF - Has SDR Agent [FALSE] → HTTP - Trigger AI Agent (fallback WF-05)
 */

'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'WF-01-WA-INBOUND - V13(agent-fork).json');
const DST = path.join(__dirname, 'WF-01-WA-INBOUND - V14(auto-assign-sdr).json');

const SUPABASE_URL  = 'https://fhkhamwrfwtacwydukvb.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoa2hhbXdyZnd0YWN3eWR1a3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMyNjcxMywiZXhwIjoyMDgwOTAyNzEzfQ.slNbow0lzBpryTaPPNNPDOV5x_uBqRHQZR38RRk92sY';
const WF07_WEBHOOK  = 'https://n8n.julianosalles.com.br/webhook/agent-executor';

// ── Helpers ─────────────────────────────────────────────────────────────────

const SUPABASE_HEADERS = {
  parameters: [
    { name: 'apikey',        value: SUPABASE_KEY },
    { name: 'Authorization', value: `Bearer ${SUPABASE_KEY}` },
    { name: 'Content-Type',  value: 'application/json' },
    { name: 'Prefer',        value: 'return=representation' },
  ],
};

// ── Novos nós ────────────────────────────────────────────────────────────────

const newNodes = [
  // ── 1. Busca o primeiro SDR ativo da empresa ─────────────────────────────
  {
    id:          'wf01v14-get-sdr-agent',
    name:        'HTTP - Get SDR Agent',
    type:        'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position:    [3680, 720],
    parameters:  {
      url:            `${SUPABASE_URL}/rest/v1/ai_agents`,
      sendQuery:      true,
      queryParameters: {
        parameters: [
          { name: 'company_id',    value: "=eq.{{ $('Code - Normalize to Canonical Event').first().json.company_id }}" },
          { name: 'function_type', value: 'eq.sdr' },
          { name: 'is_active',     value: 'eq.true' },
          { name: 'select',        value: 'id,name' },
          { name: 'limit',         value: '1' },
        ],
      },
      sendHeaders:     true,
      headerParameters: {
        parameters: [
          { name: 'apikey',        value: SUPABASE_KEY },
          { name: 'Authorization', value: `Bearer ${SUPABASE_KEY}` },
        ],
      },
      options: {},
    },
  },

  // ── 2. IF: existe SDR? ───────────────────────────────────────────────────
  {
    id:          'wf01v14-if-has-sdr',
    name:        'IF - Has SDR Agent',
    type:        'n8n-nodes-base.if',
    typeVersion: 2,
    position:    [3920, 720],
    parameters:  {
      conditions: {
        options:    { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [
          {
            id:         'sdr-exists-check',
            // Supabase retorna array; [0].id existe se achou algum
            leftValue:  "={{ ($json[0] && $json[0].id) ? $json[0].id : '' }}",
            rightValue: '',
            operator:   { type: 'string', operation: 'notEquals' },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
  },

  // ── 3. PATCH conversation: seta ai_agent_id ──────────────────────────────
  {
    id:          'wf01v14-assign-sdr',
    name:        'HTTP - Assign SDR Agent',
    type:        'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position:    [4160, 620],
    parameters:  {
      url:     `${SUPABASE_URL}/rest/v1/conversations`,
      method:  'PATCH',
      sendQuery: true,
      queryParameters: {
        parameters: [
          {
            name:  'id',
            value: "=eq.{{ $('HTTP - Check AI Agent').first().json.id }}",
          },
        ],
      },
      sendBody:   true,
      specifyBody: 'keypair',
      bodyParameters: {
        parameters: [
          {
            name:  'ai_agent_id',
            value: "={{ $('HTTP - Get SDR Agent').first().json[0].id }}",
          },
        ],
      },
      sendHeaders:     true,
      headerParameters: SUPABASE_HEADERS,
      options: {
        response: { response: { neverError: true } },
      },
    },
  },

  // ── 4. Dispara WF-07 com o SDR recém-atribuído ───────────────────────────
  {
    id:          'wf01v14-trigger-wf07-sdr',
    name:        'HTTP - Trigger WF07 (SDR Auto)',
    type:        'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position:    [4400, 620],
    parameters:  {
      url:        WF07_WEBHOOK,
      method:     'POST',
      sendBody:   true,
      specifyBody: 'keypair',
      bodyParameters: {
        parameters: [
          {
            name:  'conversation_id',
            value: "={{ $('HTTP - Check AI Agent').first().json.id }}",
          },
          {
            name:  'lead_id',
            value: "={{ $('HTTP - Check AI Agent').first().json.lead_id }}",
          },
          {
            name:  'agent_id',
            value: "={{ $('HTTP - Get SDR Agent').first().json[0].id }}",
          },
          {
            name:  'company_id',
            value: "={{ $('Code - Normalize to Canonical Event').first().json.company_id }}",
          },
          {
            name:  'contact_identifier',
            value: "={{ $('HTTP - Check AI Agent').first().json.contact_identifier }}",
          },
          {
            name:  'input_text',
            value: "={{ $('Code - Normalize to Canonical Event').first().json.content_text }}",
          },
          {
            name:  'content_type',
            value: 'inbound',
          },
        ],
      },
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
        ],
      },
      options: {
        timeout: 5000,
        response: { response: { neverError: true } },
      },
    },
  },
];

// ── Carrega V13 ──────────────────────────────────────────────────────────────
const wf = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// ── Mescla novos nós ─────────────────────────────────────────────────────────
wf.nodes.push(...newNodes);

// ── Atualiza metadados ───────────────────────────────────────────────────────
wf.name = 'WF-01-WA-INBOUND - V14(auto-assign-sdr)';

// ── Reconfigura conexões ─────────────────────────────────────────────────────
const C = wf.connections;

// 1) IF - Has AI Agent: FALSE branch → HTTP - Get SDR Agent
//    (antes apontava para HTTP - Trigger AI Agent)
C['IF - Has AI Agent'].main[1] = [
  { node: 'HTTP - Get SDR Agent', type: 'main', index: 0 },
];

// 2) HTTP - Get SDR Agent → IF - Has SDR Agent
C['HTTP - Get SDR Agent'] = {
  main: [[{ node: 'IF - Has SDR Agent', type: 'main', index: 0 }]],
};

// 3) IF - Has SDR Agent
//    TRUE  → HTTP - Assign SDR Agent
//    FALSE → HTTP - Trigger AI Agent (fallback WF-05)
C['IF - Has SDR Agent'] = {
  main: [
    [{ node: 'HTTP - Assign SDR Agent',   type: 'main', index: 0 }],
    [{ node: 'HTTP - Trigger AI Agent', type: 'main', index: 0 }],
  ],
};

// 4) HTTP - Assign SDR Agent → HTTP - Trigger WF07 (SDR Auto)
C['HTTP - Assign SDR Agent'] = {
  main: [[{ node: 'HTTP - Trigger WF07 (SDR Auto)', type: 'main', index: 0 }]],
};

// 5) HTTP - Trigger WF07 (SDR Auto) → sem saída (terminal)
C['HTTP - Trigger WF07 (SDR Auto)'] = { main: [[]] };

// ── Salva V14 ────────────────────────────────────────────────────────────────
fs.writeFileSync(DST, JSON.stringify(wf, null, 2), 'utf8');
console.log('✓ Gerado:', DST);

// ── Relatório de nós ─────────────────────────────────────────────────────────
console.log('\nNós novos adicionados:');
newNodes.forEach(n => console.log(' +', n.name));
console.log('\nConexões alteradas:');
console.log(' * IF - Has AI Agent [FALSE] → HTTP - Get SDR Agent');
console.log(' * IF - Has SDR Agent [TRUE]  → HTTP - Assign SDR Agent');
console.log(' * IF - Has SDR Agent [FALSE] → HTTP - Trigger AI Agent (fallback)');
console.log(' * HTTP - Assign SDR Agent    → HTTP - Trigger WF07 (SDR Auto)');
