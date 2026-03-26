const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V3.json'));

// Fix: update tools section in Code - Build Prompt
// The old text is too permissive — "interesse muito alto" triggers on first "tenho interesse"
const codeNode = d.nodes.find(n => n.name === 'Code - Build Prompt');

const oldToolsSection = `━━━ FERRAMENTAS DISPONÍVEIS ━━━
Use as tools para registrar decisões comerciais:
- atualizar_memoria: registre estágio, interesse, objeções, notas após cada interação
- agendar_followup: quando o lead precisar ser contactado novamente
- escalar_para_humano: quando detectar interesse muito alto, pedido de contrato ou keyword de escalação

Responda APENAS com a mensagem natural para o lead. Não use aspas nem prefixos.`;

const newToolsSection = `━━━ FERRAMENTAS DISPONÍVEIS ━━━
Você pode usar as tools abaixo para registrar decisões comerciais. Use com CRITÉRIO:

- atualizar_memoria: use SOMENTE quando o lead revelar informação relevante (objeção, budget, prazo, cargo, nível de interesse claro). NÃO use em primeiras trocas genéricas.
- agendar_followup: use quando o lead pedir para falar depois ou quando você decidir retomar em horário específico.
- escalar_para_humano: use SOMENTE quando ocorrer UMA das condições abaixo:
  1. Lead pedir proposta formal, contrato ou reunião com responsável
  2. Lead confirmar budget acima do ticket mínimo definido nas regras
  3. Lead usar exatamente uma das keywords de escalação listadas nas regras de escalação
  NÃO escale por simples demonstração de interesse ("tenho interesse", "quero saber mais", etc.)

Na maioria das interações, NÃO use nenhuma tool — apenas responda naturalmente ao lead.
Responda APENAS com a mensagem natural para o lead. Não use aspas nem prefixos.`;

codeNode.parameters.jsCode = codeNode.parameters.jsCode.replace(oldToolsSection, newToolsSection);

if (!codeNode.parameters.jsCode.includes('NÃO escale por simples')) {
  console.log('ERROR: replacement did not match. Trying fallback...');
  // Fallback: replace by regex
  codeNode.parameters.jsCode = codeNode.parameters.jsCode.replace(
    /━━━ FERRAMENTAS DISPONÍVEIS ━━━[\s\S]*?Responda APENAS com a mensagem natural para o lead\. Não use aspas nem prefixos\./,
    newToolsSection
  );
}

if (codeNode.parameters.jsCode.includes('NÃO escale por simples')) {
  console.log('[OK] Tools section updated successfully');
} else {
  console.log('[ERROR] Could not replace tools section');
}

d.name = 'WF-07-AGENT-EXECUTOR-V4';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V4.json', JSON.stringify(d, null, 2));
console.log('WF-07-AGENT-EXECUTOR-V4.json saved!');
