const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V4.json'));

// Fix: tool nodes also need .first().json — they run inside AI Agent context
// where item pairing from Code - Build Prompt is broken
const toolNodes = ['atualizar_memoria', 'agendar_followup', 'escalar_para_humano'];

toolNodes.forEach(name => {
  const n = d.nodes.find(x => x.name === name);
  if (!n || !n.parameters) return;

  // Fix URL
  if (n.parameters.url) {
    n.parameters.url = n.parameters.url.replace(/\.item\.json/g, '.first().json');
  }

  // Fix bodyParameters values
  if (n.parameters.bodyParameters && n.parameters.bodyParameters.parameters) {
    n.parameters.bodyParameters.parameters.forEach(p => {
      if (p.value && typeof p.value === 'string') {
        p.value = p.value.replace(/\.item\.json/g, '.first().json');
      }
    });
  }

  // Fix queryParameters values
  if (n.parameters.queryParameters && n.parameters.queryParameters.parameters) {
    n.parameters.queryParameters.parameters.forEach(p => {
      if (p.value && typeof p.value === 'string') {
        p.value = p.value.replace(/\.item\.json/g, '.first().json');
      }
    });
  }
});

// Also fix atualizar_memoria body — the p_agent_id, p_lead_id, p_company_id params
const memTool = d.nodes.find(n => n.name === 'atualizar_memoria');
if (memTool && memTool.parameters.bodyParameters) {
  memTool.parameters.bodyParameters.parameters.forEach(p => {
    if (p.value && p.value.includes('.item.json')) {
      p.value = p.value.replace(/\.item\.json/g, '.first().json');
    }
  });
}

d.name = 'WF-07-AGENT-EXECUTOR-V5';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V5.json', JSON.stringify(d, null, 2));

// Verify
const check = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V5.json'));
toolNodes.forEach(name => {
  const n = check.nodes.find(x => x.name === name);
  if (!n) return;
  const str = JSON.stringify(n.parameters);
  const hasItem = str.includes('.item.json');
  console.log(`[${hasItem ? 'WARN .item.json still present' : 'OK'}] ${name}`);
  if (n.parameters.url) console.log('  URL:', n.parameters.url);
});

console.log('\nWF-07-AGENT-EXECUTOR-V5.json saved!');
