const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/wf07-v7.json'));

// Fix 1: alwaysOutputData on 3 nodes that may return empty arrays
['HTTP - Get Memory', 'HTTP - Get Playbook', 'HTTP - Get Messages'].forEach(name => {
  const n = d.nodes.find(x => x.name === name);
  if (n) { n.alwaysOutputData = true; n.continueOnFail = true; }
});

// Fix 2: Nodes that come AFTER AI Agent — replace .item.json with .first().json
// (after AI Agent sub-flow, item pairing is broken for non-direct predecessors)
const postAINodes = ['HTTP - Send WhatsApp', 'HTTP - Insert Message', 'HTTP - Insert Run', 'HTTP - Upsert Performance'];
postAINodes.forEach(name => {
  const n = d.nodes.find(x => x.name === name);
  if (!n || !n.parameters) return;
  ['jsonBody', 'url', 'specifyBody'].forEach(field => {
    if (n.parameters[field]) {
      n.parameters[field] = n.parameters[field].replace(/\.item\.json/g, '.first().json');
    }
  });
});

// Fix 3: AI Agent — use first() for its own text/systemMessage parameters
const aiNode = d.nodes.find(n => n.name === 'AI Agent');
if (aiNode && aiNode.parameters) {
  const p = aiNode.parameters;
  if (p.text) p.text = p.text.replace(/\.item\.json/g, '.first().json');
  if (p.options && p.options.systemMessage) {
    p.options.systemMessage = p.options.systemMessage.replace(/\.item\.json/g, '.first().json');
  }
}

// Fix 4: HTTP - Insert Run — ensure system_prompt is hardcoded "dynamic"
const runNode = d.nodes.find(n => n.name === 'HTTP - Insert Run');
if (runNode && runNode.parameters.jsonBody) {
  const body = JSON.parse(runNode.parameters.jsonBody);
  if (body.system_prompt && body.system_prompt.includes('{{')) {
    body.system_prompt = 'dynamic';
    runNode.parameters.jsonBody = JSON.stringify(body);
  }
}

// Save V3
d.name = 'WF-07-AGENT-EXECUTOR-V3';
const out = JSON.stringify(d, null, 2);
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V3.json', out);

// Verification
const check = JSON.parse(out);
console.log('=== FIXES APPLIED ===');

check.nodes.forEach(n => {
  if (n.alwaysOutputData) console.log('[OK] alwaysOutputData:', n.name);
});

postAINodes.forEach(name => {
  const n = check.nodes.find(x => x.name === name);
  if (n) {
    const str = JSON.stringify(n.parameters);
    const hasItem = str.includes('.item.json');
    console.log(`[${hasItem ? 'WARN' : 'OK'}] ${name}: .item.json = ${hasItem}`);
  }
});

const rn = check.nodes.find(n => n.name === 'HTTP - Insert Run');
const bodyObj = JSON.parse(rn.parameters.jsonBody);
console.log('[OK] Insert Run system_prompt:', bodyObj.system_prompt);

const ai = check.nodes.find(n => n.name === 'AI Agent');
console.log('[OK] AI Agent text:', ai.parameters.text);
console.log('[OK] AI Agent systemMessage:', ai.parameters.options?.systemMessage?.slice(0,50));

console.log('\nWF-07-AGENT-EXECUTOR-V3.json saved!');
