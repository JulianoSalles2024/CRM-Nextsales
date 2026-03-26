const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V10.json'));

// Fix Upsert Performance: build jsonBody as raw string with {{ }} (template mode, no =)
const perfNode = d.nodes.find(n => n.name === 'HTTP - Upsert Performance');
if (perfNode) {
  delete perfNode.parameters.bodyParameters;
  perfNode.parameters.specifyBody = 'json';
  // Use {{ }} template syntax (NOT ={{ }}) — this is evaluated in n8n template mode
  perfNode.parameters.jsonBody = '{"agent_id":"{{ $(\'Webhook\').first().json.body.agent_id }}","company_id":"{{ $(\'Webhook\').first().json.body.company_id }}","period_date":"{{ new Date().toISOString().slice(0,10) }}","approaches":{{ $("Webhook").first().json.body.content_type === "proactive" ? 1 : 0 }},"responses":{{ ["text","audio"].includes($("Webhook").first().json.body.content_type) ? 1 : 0 }},"qualified":0,"meetings":0,"sales":0,"escalations":0,"revenue":0,"tokens_used":0}';
  perfNode.continueOnFail = true;
  console.log('[OK] Upsert Performance jsonBody fixed (template mode)');
  console.log('  Preview:', perfNode.parameters.jsonBody.slice(0, 80));
}

d.name = 'WF-07-AGENT-EXECUTOR-V11';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V11.json', JSON.stringify(d, null, 2));
console.log('\nWF-07-AGENT-EXECUTOR-V11.json saved!');
