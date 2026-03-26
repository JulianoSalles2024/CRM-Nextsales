const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/wf07-v7.json'));

// Fix 1: alwaysOutputData on 3 nodes
['HTTP - Get Memory', 'HTTP - Get Playbook', 'HTTP - Get Messages'].forEach(name => {
  const n = d.nodes.find(x => x.name === name);
  if (n) { n.alwaysOutputData = true; n.continueOnFail = true; }
});

// Fix 2: Code - Build Prompt — use .first().json instead of .item.json
const codeNode = d.nodes.find(n => n.name === 'Code - Build Prompt');
if (codeNode) {
  codeNode.parameters.jsCode = codeNode.parameters.jsCode
    .replace(/\$\('HTTP - Get Agent'\)\.item\.json/g, "$('HTTP - Get Agent').first().json")
    .replace(/\$\('HTTP - Get Lead'\)\.item\.json/g, "$('HTTP - Get Lead').first().json")
    .replace(/\$\('HTTP - Get Memory'\)\.item\.json/g, "$('HTTP - Get Memory').first().json")
    .replace(/\$\('HTTP - Get Playbook'\)\.item\.json/g, "$('HTTP - Get Playbook').first().json")
    .replace(/\$\('HTTP - Get Messages'\)\.item\.json/g, "$('HTTP - Get Messages').first().json")
    .replace(/\$\('Webhook'\)\.item\.json/g, "$('Webhook').first().json");
}

// Fix 3: AI Agent prompt — use first()
const aiNode = d.nodes.find(n => n.name === 'AI Agent');
if (aiNode && aiNode.parameters) {
  if (aiNode.parameters.text) {
    aiNode.parameters.text = aiNode.parameters.text.replace(/\.item\.json/g, '.first().json');
  }
  if (aiNode.parameters.options && aiNode.parameters.options.systemMessage) {
    aiNode.parameters.options.systemMessage = aiNode.parameters.options.systemMessage.replace(/\.item\.json/g, '.first().json');
  }
}

// Fix 4: All HTTP nodes after AI Agent — use first()
['HTTP - Send WhatsApp', 'HTTP - Insert Message', 'HTTP - Insert Run', 'HTTP - Upsert Performance'].forEach(name => {
  const n = d.nodes.find(x => x.name === name);
  if (n && n.parameters) {
    ['jsonBody', 'url'].forEach(field => {
      if (n.parameters[field]) {
        n.parameters[field] = n.parameters[field].replace(/\.item\.json/g, '.first().json');
      }
    });
  }
});

// Fix 5: HTTP - Insert Run — ensure system_prompt is "dynamic" (not a template expression)
const runNode = d.nodes.find(n => n.name === 'HTTP - Insert Run');
if (runNode && runNode.parameters.jsonBody) {
  // Replace any systemPrompt template reference with hardcoded "dynamic"
  runNode.parameters.jsonBody = runNode.parameters.jsonBody
    .replace(/"system_prompt":"[^"]*\{\{[^}]*\}\}[^"]*"/g, '"system_prompt":"dynamic"')
    .replace(/"system_prompt":"[^"]*\.first\(\)\.json\.systemPrompt[^"]*"/g, '"system_prompt":"dynamic"');
}

// Save as V3
d.name = 'WF-07-AGENT-EXECUTOR-V3';
const out = JSON.stringify(d, null, 2);
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V3.json', out);

// Verify
const check = JSON.parse(out);
check.nodes.forEach(n => {
  const str = JSON.stringify(n.parameters || {});
  if (str.includes('.item.json') && !n.name.includes('Sticky')) {
    console.log('WARNING .item.json still in:', n.name);
  }
  if (n.alwaysOutputData) console.log('alwaysOutputData:', n.name);
});

const runNodeCheck = check.nodes.find(n => n.name === 'HTTP - Insert Run');
console.log('\nInsert Run system_prompt:', JSON.stringify(runNodeCheck.parameters.jsonBody).match(/"system_prompt":"([^"]+)"/)?.[1]);
console.log('\nDone!');
