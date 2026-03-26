const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V7.json'));

// Fix: HTTP - Get Connection is on a parallel branch from HTTP - Get Agent
// After AI Agent sub-flow, parallel branch results are inaccessible
// Solution: put Get Connection INLINE before Get Lead (serial chain)
// New chain: Get Agent → Get Connection → Get Lead → Get Memory → ...

// Current connections from Get Agent:
// [[{node: "HTTP - Get Lead"}, {node: "HTTP - Get Connection"}]]  (parallel fan-out)
//
// New connections from Get Agent:
// [[{node: "HTTP - Get Connection"}]]  (only Get Connection)
// And Get Connection → Get Lead

const conn = d.connections;

// Step 1: Get Agent now only connects to Get Connection
conn['HTTP - Get Agent'] = {
  main: [[
    { node: 'HTTP - Get Connection', type: 'main', index: 0 }
  ]]
};

// Step 2: Get Connection now connects to Get Lead
conn['HTTP - Get Connection'] = {
  main: [[
    { node: 'HTTP - Get Lead', type: 'main', index: 0 }
  ]]
};

// Step 3: Get Lead already connects to Get Memory (unchanged)
// Verify Get Lead → Get Memory still exists
if (!conn['HTTP - Get Lead']) {
  conn['HTTP - Get Lead'] = { main: [[{ node: 'HTTP - Get Memory', type: 'main', index: 0 }]] };
}

d.name = 'WF-07-AGENT-EXECUTOR-V8';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V8.json', JSON.stringify(d, null, 2));

// Verify
const check = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V8.json'));
console.log('=== CONNECTION CHAIN ===');
const chain = ['HTTP - Get Agent', 'HTTP - Get Connection', 'HTTP - Get Lead', 'HTTP - Get Memory', 'HTTP - Get Playbook', 'HTTP - Get Messages', 'Code - Build Prompt', 'AI Agent', 'HTTP - Send WhatsApp'];
chain.forEach(name => {
  const c = check.connections[name];
  const next = c?.main?.[0]?.map(x => x.node).join(', ') || '(end)';
  console.log(`  ${name} → ${next}`);
});

console.log('\nWF-07-AGENT-EXECUTOR-V8.json saved!');
