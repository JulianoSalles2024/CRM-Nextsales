const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V5.json'));

// Fix AI Agent expressions
// .first().json.X is invalid without $ prefix
// $json.X works because AI Agent receives Code - Build Prompt output as current item
const aiNode = d.nodes.find(n => n.name === 'AI Agent');
if (aiNode && aiNode.parameters) {
  aiNode.parameters.text = '={{ $json.userMessage }}';
  if (aiNode.parameters.options) {
    aiNode.parameters.options.systemMessage = '={{ $json.systemPrompt }}';
  }
  console.log('[OK] AI Agent text:', aiNode.parameters.text);
  console.log('[OK] AI Agent systemMessage:', aiNode.parameters.options?.systemMessage);
}

// Fix Code - Build Prompt return to use proper n8n format
// Must return array of items: [{ json: { ... } }]
const codeNode = d.nodes.find(n => n.name === 'Code - Build Prompt');
if (codeNode) {
  const js = codeNode.parameters.jsCode;
  // Check current return statement
  const returnIdx = js.lastIndexOf('return {');
  if (returnIdx !== -1) {
    const before = js.slice(0, returnIdx);
    codeNode.parameters.jsCode = before + 'return [{ json: { systemPrompt: fullPrompt, userMessage, webhookData } }];';
    console.log('[OK] Code - Build Prompt return fixed to array format');
  } else if (js.includes('return [{ json:')) {
    console.log('[OK] Code - Build Prompt already uses array format');
  }
}

d.name = 'WF-07-AGENT-EXECUTOR-V6';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V6.json', JSON.stringify(d, null, 2));

// Final check
const check = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V6.json'));
const ai = check.nodes.find(n => n.name === 'AI Agent');
const code = check.nodes.find(n => n.name === 'Code - Build Prompt');
console.log('\n=== V6 VERIFICATION ===');
console.log('AI Agent text:', ai.parameters.text);
console.log('AI Agent systemMessage:', ai.parameters.options?.systemMessage);
console.log('Code return format:', code.parameters.jsCode.slice(code.parameters.jsCode.lastIndexOf('return'), code.parameters.jsCode.lastIndexOf('return') + 80));
console.log('\nWF-07-AGENT-EXECUTOR-V6.json saved!');
