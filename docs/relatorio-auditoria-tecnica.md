# Relatório de Auditoria Técnica — CRM-Fity

Este relatório consolida a análise de arquitetura, segurança e integridade do banco de dados realizada em 18/03/2026.

---

## 🏗️ Mapa de Arquitetura

**Fluxo de Dados:**
`[Browser] --(JWT)--> [Vercel Functions] --(service_role)--> [Supabase] <--(service_role)--> [n8n]`

- **Vercel Functions (`api/`)**: Centraliza a lógica de Auth (extração de `companyId` do JWT), Rate Limiting (in-memory) e proxy para Evolution API.
- **Supabase**: Aplica RLS baseado em `my_company_id()` e possui triggers para integridade (`enforce_company_id`).
- **n8n**: Gerencia fluxos assíncronos (Inbound, Outbound, Follow-up e AI Agente).

**Pontos Únicos de Falha (SPOF):**
- **Evolution API**: Indisponibilidade interrompe todo o fluxo de WhatsApp.
- **Supabase/n8n**: Dependência de endpoints únicos sem mecanismos de retry explícitos em alguns nós críticos.

---

## 🛡️ Relatório de Segurança & Multi-tenancy

### ✅ Pontos Fortes
- **Tenant Isolation**: `companyId` sempre extraído do servidor; RLS bloqueia acesso cruzado.
- **Privacidade**: Sellers veem apenas seus próprios leads/conversas.
- **Segredos**: Chaves de API e AI nunca chegam ao client-side.
- **API Keys**: Armazenamento com Hash SHA256.

### ⚠️ Riscos Identificados

| Nível | Risco | Impacto | Recomendação |
| :--- | :--- | :--- | :--- |
| **CRÍTICO** | `/api/install/migrate` sem guard | Execução arbitrária de migrations | Bloquear se `INSTALL_SECRET` estiver ausente |
| **ALTO** | CSP `unsafe-inline` | Vulnerabilidade a XSS | Build local do Tailwind + Nonce CSP |
| **MÉDIO** | Uso de `.single()` em queries | Erros 500 se o profile/data sumir | Trocar por `.maybeSingle()` + erro 401/404 |
| **MÉDIO** | Rate Limit in-memory | Não escala em múltiplas instâncias | Migrar para Vercel KV (Upstash Redis) |
| **MÉDIO** | Entropia de `ENCRYPTION_KEY` | Criptografia fraca se chave for curta | Validar length >= 32 no startup |

---

## 📊 Integridade do Banco de Dados

- **Migrações**: 73 migrations (~6.600 linhas de SQL).
- **Consistência**: FKs e índices compostos (`company_id`, `owner_id`) bem aplicados.
- **Realtime**: Configurado com `REPLICA IDENTITY FULL`.
- **LACUNA**: Falta uma tabela de **Audit Log** para operações sensíveis (delete lead, block user).

---

## 🛠️ Resultado dos Testes Reais

- **Auth & Tenant Guard**: ✅ Passou (rejeita acesso sem token ou cross-tenant).
- **Lead Flow**: ✅ Passou (criação e atribuição de owner corretas).
- **User Block**: ✅ Passou (revogação imediata de acesso via RLS).
- **Migration Security**: ❌ Falhou (endpoint acessível se secret não configurado).

---

## 🎯 Próximos Passos (Prioridades)

1. **[CRÍTICO]** Fix em `/api/install/migrate` para exigir `INSTALL_SECRET`.
2. **[MÉDIO]** Refatorar queries `.single()` para evitar 500s.
3. **[ALTO]** Implementar Rate Limiting distribuído e revisar CSP Headers.
4. **[ALTO]** Adicionar retries nos workflows de Outbound no n8n.
