const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V8.json'));

// Fix HTTP - Insert Message: switch to keypair (n8n handles JSON escaping automatically)
const msgNode = d.nodes.find(n => n.name === 'HTTP - Insert Message');
if (msgNode) {
  delete msgNode.parameters.jsonBody;
  msgNode.parameters.specifyBody = 'keypair';
  msgNode.parameters.bodyParameters = {
    parameters: [
      { name: 'conversation_id', value: "={{ $('Webhook').first().json.body.conversation_id }}" },
      { name: 'direction', value: 'outbound' },
      { name: 'content', value: "={{ $('AI Agent').first().json.output }}" },
      { name: 'content_type', value: 'text' },
      { name: 'status', value: 'sent' }
    ]
  };
  console.log('[OK] HTTP - Insert Message → keypair');
}

// Fix HTTP - Insert Run: switch to keypair
const runNode = d.nodes.find(n => n.name === 'HTTP - Insert Run');
if (runNode) {
  delete runNode.parameters.jsonBody;
  runNode.parameters.specifyBody = 'keypair';
  runNode.parameters.bodyParameters = {
    parameters: [
      { name: 'agent_id', value: "={{ $('Webhook').first().json.body.agent_id }}" },
      { name: 'lead_id', value: "={{ $('Webhook').first().json.body.lead_id }}" },
      { name: 'company_id', value: "={{ $('Webhook').first().json.body.company_id }}" },
      { name: 'conversation_id', value: "={{ $('Webhook').first().json.body.conversation_id }}" },
      { name: 'run_type', value: "={{ $('Webhook').first().json.body.content_type === 'proactive' ? 'proactive' : $('Webhook').first().json.body.content_type === 'followup' ? 'followup' : 'response' }}" },
      { name: 'channel', value: 'whatsapp' },
      { name: 'input_text', value: "={{ $('Webhook').first().json.body.input_text || '' }}" },
      { name: 'output_text', value: "={{ $('AI Agent').first().json.output }}" },
      { name: 'system_prompt', value: 'dynamic' },
      { name: 'model_used', value: 'gpt-4o-mini' },
      { name: 'outcome', value: 'sent' }
    ]
  };
  console.log('[OK] HTTP - Insert Run → keypair');
}

// Fix HTTP - Upsert Performance: also switch to keypair
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
  console.log('[OK] HTTP - Upsert Performance → keypair');
}

// Fix HTTP - Send WhatsApp: the text field also has AI output — use keypair
const waNode = d.nodes.find(n => n.name === 'HTTP - Send WhatsApp');
if (waNode) {
  delete waNode.parameters.jsonBody;
  waNode.parameters.specifyBody = 'keypair';
  waNode.parameters.bodyParameters = {
    parameters: [
      { name: 'number', value: "={{ ($('HTTP - Get Lead').first().json.phone || '').replace(/\\D/g, '') }}" },
      { name: 'text', value: "={{ $('AI Agent').first().json.output }}" }
    ]
  };
  console.log('[OK] HTTP - Send WhatsApp → keypair');
}

d.name = 'WF-07-AGENT-EXECUTOR-V9';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V9.json', JSON.stringify(d, null, 2));
console.log('\nWF-07-AGENT-EXECUTOR-V9.json saved!');
