const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V11.json'));

// Fix Upsert Performance: back to keypair (V9 approach worked — it sent to Supabase)
// The 409 in V9 was because Prefer: resolution=merge-duplicates wasn't effective
// Fix: add Content-Type: application/json explicitly + Prefer header
const perfNode = d.nodes.find(n => n.name === 'HTTP - Upsert Performance');
if (perfNode) {
  delete perfNode.parameters.jsonBody;
  perfNode.parameters.specifyBody = 'keypair';
  perfNode.parameters.bodyParameters = {
    parameters: [
      { name: 'agent_id', value: "={{ $('Webhook').first().json.body.agent_id }}" },
      { name: 'company_id', value: "={{ $('Webhook').first().json.body.company_id }}" },
      { name: 'period_date', value: "={{ new Date().toISOString().slice(0,10) }}" },
      { name: 'approaches', value: "={{ $('Webhook').first().json.body.content_type === 'proactive' ? 1 : 0 }}" },
      { name: 'responses', value: "={{ ['text','audio'].includes($('Webhook').first().json.body.content_type) ? 1 : 0 }}" },
      { name: 'qualified', value: '0' },
      { name: 'meetings', value: '0' },
      { name: 'sales', value: '0' },
      { name: 'escalations', value: '0' },
      { name: 'revenue', value: '0' },
      { name: 'tokens_used', value: '0' }
    ]
  };
  // Ensure headers include Content-Type and Prefer
  const headers = perfNode.parameters.headerParameters?.parameters || [];
  const hasContentType = headers.some(h => h.name === 'Content-Type');
  const hasPrefer = headers.some(h => h.name === 'Prefer');
  if (!hasContentType) headers.push({ name: 'Content-Type', value: 'application/json' });
  if (!hasPrefer) headers.push({ name: 'Prefer', value: 'resolution=merge-duplicates' });
  // Update existing Prefer if wrong value
  headers.forEach(h => {
    if (h.name === 'Prefer') h.value = 'resolution=merge-duplicates';
  });
  perfNode.parameters.headerParameters = { parameters: headers };
  perfNode.continueOnFail = true;
  console.log('[OK] Upsert Performance: keypair + Content-Type + Prefer + continueOnFail');
  console.log('  Headers:', headers.map(h => `${h.name}: ${h.value}`).join(', '));
}

d.name = 'WF-07-AGENT-EXECUTOR-V12';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V12.json', JSON.stringify(d, null, 2));
console.log('\nWF-07-AGENT-EXECUTOR-V12.json saved!');
