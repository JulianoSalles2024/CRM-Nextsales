const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V6.json'));

// Fix: remove leading '=' from jsonBody in HTTP nodes that use {{ }} template syntax
// In n8n, '=' prefix = expression mode ({{ }} not evaluated)
//         no '=' prefix = template mode ({{ }} ARE evaluated)
const httpNodes = [
  'HTTP - Send WhatsApp',
  'HTTP - Insert Message',
  'HTTP - Insert Run',
  'HTTP - Upsert Performance'
];

httpNodes.forEach(name => {
  const n = d.nodes.find(x => x.name === name);
  if (!n || !n.parameters) return;
  if (n.parameters.jsonBody && n.parameters.jsonBody.startsWith('=')) {
    n.parameters.jsonBody = n.parameters.jsonBody.slice(1); // remove leading '='
    console.log(`[OK] Removed '=' from jsonBody: ${name}`);
  } else {
    console.log(`[--] No '=' in jsonBody: ${name}`);
  }
});

// Also check/fix specifyBody on Send WhatsApp (uses specifyBody: 'json')
const waNode = d.nodes.find(n => n.name === 'HTTP - Send WhatsApp');
if (waNode && waNode.parameters.jsonBody && waNode.parameters.jsonBody.startsWith('=')) {
  waNode.parameters.jsonBody = waNode.parameters.jsonBody.slice(1);
  console.log('[OK] Also fixed Send WhatsApp jsonBody');
}

d.name = 'WF-07-AGENT-EXECUTOR-V7';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V7.json', JSON.stringify(d, null, 2));

// Verify
const check = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V7.json'));
httpNodes.forEach(name => {
  const n = check.nodes.find(x => x.name === name);
  if (n && n.parameters.jsonBody) {
    const starts = n.parameters.jsonBody.slice(0, 3);
    console.log(`  ${name}: starts with "${starts}" [${n.parameters.jsonBody.startsWith('=') ? 'STILL HAS =' : 'OK'}]`);
  }
});

console.log('\nWF-07-AGENT-EXECUTOR-V7.json saved!');
