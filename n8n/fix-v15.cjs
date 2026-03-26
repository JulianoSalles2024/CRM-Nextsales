const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, 'WF-07-AGENT-EXECUTOR-V15.json');
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

// Fix HTTP - Send LangSmith jsonBody — use proper n8n expression object literal
const ls = wf.nodes.find(n => n.name === 'HTTP - Send LangSmith');

const ref = (node, field) => `$('${node}').first().json.${field}`;

ls.parameters.jsonBody = [
  '=({',
  `  id: ${'$'}('Code - Calc Metrics').first().json._langsmith_run_id,`,
  `  name: 'NextSales Agent Run',`,
  `  run_type: 'chain',`,
  `  start_time: ${'$'}('Code - Calc Metrics').first().json._start_time,`,
  `  end_time: ${'$'}('Code - Calc Metrics').first().json._end_time,`,
  `  inputs: { input: ${'$'}('Webhook').first().json.body.input_text || '' },`,
  `  outputs: { output: ${'$'}('Code - Calc Metrics').first().json.output || '' },`,
  `  extra: {`,
  `    metadata: {`,
  `      agent_id: ${'$'}('Webhook').first().json.body.agent_id,`,
  `      company_id: ${'$'}('Webhook').first().json.body.company_id,`,
  `      lead_id: ${'$'}('Webhook').first().json.body.lead_id,`,
  `      model: 'gpt-4o-mini',`,
  `      tokens_input: ${'$'}('Code - Calc Metrics').first().json._tokens_input,`,
  `      tokens_output: ${'$'}('Code - Calc Metrics').first().json._tokens_output,`,
  `      cost_usd: ${'$'}('Code - Calc Metrics').first().json._cost_usd`,
  `    }`,
  `  },`,
  `  session_name: 'nextsales-agents'`,
  '})',
].join('\n');

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Fixed jsonBody (first 300 chars):');
console.log(ls.parameters.jsonBody.slice(0, 300));
