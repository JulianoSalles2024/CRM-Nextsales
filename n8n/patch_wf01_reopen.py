import json, sys
sys.stdout.reconfigure(encoding='utf-8')

data = open('C:/Users/julia/CRM-Fity/n8n/_live_wf01.json', encoding='utf-8').read()
j = json.loads(data)

rpc_node = "HTTP - RPC resolve_or_create_conversation"
canon_node = "Code - Normalize to Canonical Event"

title_expr   = f"={{{{ $('{rpc_node}').first().json.lead_reopened ? 'Lead reaberto: retomou contato' : 'Nova conversa via WhatsApp' }}}}"
type_expr    = f"={{{{ $('{rpc_node}').first().json.lead_reopened ? 'lead_reopened' : 'new_conversation' }}}}"
message_expr = (
    f"={{{{ $('{rpc_node}').first().json.lead_reopened"
    f" ? ($('{canon_node}').first().json.contact_name || $('{canon_node}').first().json.contact_identifier)"
    f"   + ' estava encerrado e enviou uma nova mensagem'"
    f" : $('{canon_node}').first().json.contact_identifier + ' iniciou uma conversa'"
    f" }}}}"
)

updated = False
for n in j['nodes']:
    if n['name'] == 'HTTP - Create Notification':
        params = n['parameters']['bodyParameters']['parameters']
        for p in params:
            if p['name'] == 'title':
                p['value'] = title_expr
                updated = True
            elif p['name'] == 'type':
                p['value'] = type_expr
                updated = True
            elif p['name'] == 'message':
                p['value'] = message_expr
                updated = True
        break

if not updated:
    print('ERROR: node not found or no params updated')
    sys.exit(1)

with open('C:/Users/julia/CRM-Fity/n8n/_live_wf01_patched.json', 'w', encoding='utf-8') as f:
    json.dump(j, f, ensure_ascii=False)

print('OK - verifying:')
for n in j['nodes']:
    if n['name'] == 'HTTP - Create Notification':
        for p in n['parameters']['bodyParameters']['parameters']:
            if p['name'] in ['title', 'type', 'message']:
                print(f"  {p['name']}: {p['value'][:120]}")
