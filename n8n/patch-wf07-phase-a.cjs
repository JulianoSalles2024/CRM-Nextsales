'use strict';
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'WF-07-AGENT-EXECUTOR-V17.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const node = data.nodes.find(n => n.name === 'Code - Build Prompt');

if (!node) { console.error('Node not found'); process.exit(1); }

const behaviorCode = `
// ── Fase A: Configurações de comportamento ───────────────────────────────
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

let code = node.parameters.jsCode;

// Remove previous broken patch if any
const prevPatchStart = code.indexOf('\n// ── Fase A:');
const fullPromptIdx = code.indexOf('// Full prompt');

if (prevPatchStart > -1 && prevPatchStart < fullPromptIdx) {
  // Remove everything from the broken patch up to (but not including) // Full prompt
  code = code.substring(0, prevPatchStart) + code.substring(fullPromptIdx);
  console.log('Removed previous broken patch');
}

// Insert behavior code before "// Full prompt"
const insertAt = code.indexOf('// Full prompt');
if (insertAt === -1) { console.error('"// Full prompt" marker not found'); process.exit(1); }

code = code.substring(0, insertAt) + behaviorCode + code.substring(insertAt);

// Now patch the fullPrompt string to include behaviorBlock and datetimeBlock after systemPrompt
// The current string starts with: `${systemPrompt}\n\n━━━ CONTEXTO...
code = code.replace(
  '`${systemPrompt}\n\n━━━ CONTEXTO',
  '`${systemPrompt}${behaviorBlock}${datetimeBlock}\n\n━━━ CONTEXTO'
);

node.parameters.jsCode = code;
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('OK — WF-07 patched with Phase A behavior settings');

// Verify
const check = code.indexOf('Fase A');
console.log('Fase A marker present:', check > -1);
const checkBlock = code.indexOf('behaviorBlock');
console.log('behaviorBlock injected into fullPrompt:', code.includes('${behaviorBlock}${datetimeBlock}'));
