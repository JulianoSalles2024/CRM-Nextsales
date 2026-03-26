const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V9.json'));

// Fix 1: Upsert Performance — continueOnFail so 409 doesn't stop flow
const perfNode = d.nodes.find(n => n.name === 'HTTP - Upsert Performance');
if (perfNode) {
  perfNode.continueOnFail = true;
  // Switch back to jsonBody for proper JSON upsert with Prefer header
  delete perfNode.parameters.bodyParameters;
  delete perfNode.parameters.specifyBody;
  perfNode.parameters.specifyBody = 'json';
  perfNode.parameters.jsonBody = JSON.stringify({
    agent_id: "={{ $('Webhook').first().json.body.agent_id }}",
    company_id: "={{ $('Webhook').first().json.body.company_id }}",
    period_date: "={{ new Date().toISOString().slice(0,10) }}",
    approaches: "={{ $('Webhook').first().json.body.content_type === 'proactive' ? 1 : 0 }}",
    responses: "={{ ['text','audio'].includes($('Webhook').first().json.body.content_type) ? 1 : 0 }}",
    qualified: 0,
    meetings: 0,
    sales: 0,
    escalations: 0,
    revenue: 0,
    tokens_used: 0
  });
  // Make sure Prefer header exists
  const headers = perfNode.parameters.headerParameters?.parameters || [];
  const hasPrefer = headers.some(h => h.name === 'Prefer');
  if (!hasPrefer) {
    headers.push({ name: 'Prefer', value: 'resolution=merge-duplicates' });
    if (!perfNode.parameters.headerParameters) perfNode.parameters.headerParameters = { parameters: [] };
    perfNode.parameters.headerParameters.parameters = headers;
  }
  console.log('[OK] HTTP - Upsert Performance: continueOnFail=true + proper upsert');
}

// Also add continueOnFail to Insert Run and Insert Message just in case
['HTTP - Insert Run', 'HTTP - Insert Message', 'HTTP - Send WhatsApp'].forEach(name => {
  const n = d.nodes.find(x => x.name === name);
  if (n) { n.continueOnFail = true; console.log(`[OK] ${name}: continueOnFail=true`); }
});

d.name = 'WF-07-AGENT-EXECUTOR-V10';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V10.json', JSON.stringify(d, null, 2));
console.log('\nWF-07-AGENT-EXECUTOR-V10.json saved!');
