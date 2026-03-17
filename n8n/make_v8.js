const fs = require('fs');
let raw = fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-01-WA-INBOUND - V7(owner-select-fix).json', 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const data = JSON.parse(raw);

// null-safe uuid expression for n8n JSON body
// If value is falsy, renders JSON null; otherwise renders "uuid-value"
function ns(expr) {
  return `{{ ${expr} ? '"' + ${expr} + '"' : 'null' }}`;
}
const c = (f) => `$('Code - Normalize to Canonical Event').first().json.${f}`;

const newConvBody =
`={
  "p_company_id":               "{{ ${c('company_id')} }}",
  "p_channel_connection_id":    ${ns(c('channel_connection_id'))},
  "p_channel":                  "whatsapp",
  "p_contact_identifier":       "{{ ${c('contact_identifier')} }}",
  "p_contact_name":             "{{ ${c('contact_name')} }}",
  "p_lead_id":                  ${ns('$input.first().json.lead_id')},
  "p_assignee_id":              ${ns(c('owner_id'))}
}`;

console.log('=== resolve_or_create_conversation jsonBody ===');
console.log(newConvBody);
console.log('');

for (const node of data.nodes) {
  if (node.name === 'HTTP - RPC resolve_or_create_conversation') {
    node.parameters.jsonBody = newConvBody;
    console.log('PATCHED:', node.name);
  }
}

data.name = 'WF-01-WA-INBOUND - V8(null-safe-uuids)';
fs.writeFileSync(
  'C:/Users/julia/CRM-Fity/n8n/WF-01-WA-INBOUND - V8(null-safe-uuids).json',
  JSON.stringify(data, null, 4),
  'utf8'
);
console.log('V8 criado com sucesso');
