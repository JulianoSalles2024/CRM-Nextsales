# NextSales CRM

> Sistema Operacional de Vendas — CRM SaaS multitenant com Kanban, Omnichannel WhatsApp, Exército Comercial de IA e automações via n8n.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)
![n8n](https://img.shields.io/badge/Automações-n8n-EA4B71?style=flat&logo=n8n&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Security](https://img.shields.io/badge/Security-Hardened-22c55e?style=flat&logo=shieldsdotio&logoColor=white)

---

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução local](#instalação-e-execução-local)
- [Install Wizard](#install-wizard)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Banco de dados](#banco-de-dados)
- [Omnichannel — WhatsApp](#omnichannel--whatsapp)
- [Exército Comercial de IA](#exército-comercial-de-ia)
- [Automações n8n](#automações-n8n)
- [Copiloto IA (Zenius)](#copiloto-ia-zenius)
- [API REST v1 — Integração externa](#api-rest-v1--integração-externa)
- [Webhooks de saída](#webhooks-de-saída)
- [API — Endpoints e segurança](#api--endpoints-e-segurança)
- [Roles e permissões](#roles-e-permissões)
- [Segurança — Fase 6 Hardening](#segurança--fase-6-hardening)
- [Design System & UI](#design-system--ui)
- [Deploy](#deploy)

---

## Sobre o projeto

O **NextSales** é uma plataforma comercial SaaS voltada para equipes de vendas que precisam de mais do que um CRM tradicional. É um **Sistema Operacional de Vendas** — cada empresa tem seu ambiente multitenant isolado, com IA conversando no WhatsApp, agentes autônomos abordando leads e automações coordenando todo o fluxo.

**Principais funcionalidades:**

- 📋 **Pipeline Kanban** — arrastar e soltar leads entre estágios personalizáveis por pipeline
- 📊 **Dashboard** — KPIs em tempo real de faturamento, conversão e carteira
- 🔭 **Painel 360** — visão gerencial com ranking de vendedores, score e metas (admin)
- 💬 **Omnichannel WhatsApp** — inbox unificado com conversas em tempo real via Evolution API
- 🤖 **Exército Comercial de IA** — agentes SDR/Closer/Follow-up autônomos com memória e metas
- 🚨 **Escalação Inteligente** — agente detecta gatilhos e escala para vendedor humano com notificação em tempo real
- ⚡ **Automações n8n** — 5 workflows orquestrando recepção de mensagens, IA, follow-up e auto-close
- 🎯 **Metas** — metas individuais e globais com acompanhamento por período
- ✅ **Tarefas** — gestão de atividades vinculadas a leads
- 🧠 **Copiloto IA (Zenius)** — assistente SDR/vendas com histórico persistido e quick replies
- 🔮 **Oportunidades Inteligentes** — scoring determinístico com bandas hot/warm/cold/risk/upsell
- 👥 **Multiusuário RBAC** — admin, vendedor, com permissões distintas e RLS no banco
- 🔐 **Segurança** — CSP, rate limiting, INSTALL_SECRET, ESM-safe, zero API keys no browser
- 🔗 **API REST v1** — endpoints públicos autenticados por API Key (`sk_live_*`) para integração com Make, n8n, Zapier e sistemas externos
- 📤 **Webhooks de saída** — disparo automático de eventos de leads para URLs externas (Make, n8n, etc.)
- 🎨 **UI/UX premium** — Sliding pill navigation, página de login "Data Convergence" com SVG animado, design system consistente

---

## Pré-requisitos

- [Node.js](https://nodejs.org) 18+
- Conta no [Supabase](https://supabase.com)
- Conta no [Vercel](https://vercel.com) (para deploy)
- Instância [n8n](https://n8n.io) (self-hosted ou cloud) — para automações
- Instância [Evolution API](https://evolution-api.com) — para WhatsApp

---

## Instalação e execução local

```bash
# 1. Clone o repositório
git clone https://github.com/JulianoSalles2024/CRM-Nextsales.git
cd CRM-Fity

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves (veja seção abaixo)

# 4. Copie também para frontend/ (o Vite lê .env.local a partir de sua root)
cp .env.local frontend/.env.local

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse em: `http://localhost:3002` (Vite) — a API Express roda em `http://localhost:3000`.

> O comando `npm run dev` inicia ambos os servidores em paralelo via `concurrently`.
>
> **Por que dois `.env.local`?** O Vite está configurado com `root: './frontend'`, por isso lê variáveis `VITE_*` de `frontend/.env.local`. O servidor Express (`server.ts`) lê do `.env.local` na raiz. Em produção (Vercel), as env vars são injetadas diretamente — nenhum arquivo `.env` é necessário.

---

## Install Wizard

O NextSales possui um assistente de instalação guiado que configura toda a infraestrutura automaticamente — sem precisar editar arquivos manualmente.

### Como acessar

Após fazer fork e deploy na Vercel, acesse:

```
https://seu-dominio.vercel.app/install
```

### Fluxo de instalação (4 etapas)

```
/install/start     → Dados do administrador (nome, e-mail, senha)
/install/vercel    → Token da Vercel (para configurar env vars e redeploy)
/install/supabase  → URL, Service Role Key, Anon Key e PAT do Supabase
/install/run       → Execução automática com feedback em tempo real
```

### O que o wizard faz automaticamente

| Etapa | Ação |
|---|---|
| 1 | Detecta o projeto na Vercel via token |
| 2 | Cria as variáveis de ambiente no Vercel |
| 3 | Executa as migrations no Supabase via Management API |
| 4 | Cria o usuário administrador no Supabase Auth |
| 5 | Cria o perfil do admin com `role = 'admin'` |
| 6 | Dispara redeploy automático na Vercel com as novas env vars |

### Pré-requisitos para o wizard

1. Fazer **fork** do repositório no GitHub
2. Fazer **deploy** na Vercel conectando o fork
3. Ter em mãos:
   - Token da Vercel ([vercel.com/account/tokens](https://vercel.com/account/tokens))
   - URL, Service Role Key, Anon Key e PAT do Supabase

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Onde obter | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Painel Supabase → Settings → API | URL do projeto (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Painel Supabase → Settings → API | Chave anon pública (frontend) |
| `SUPABASE_URL` | Painel Supabase → Settings → API | URL do projeto (servidor) |
| `SUPABASE_SERVICE_ROLE_KEY` | Painel Supabase → Settings → API | Service role key (servidor — nunca expor) |
| `ENCRYPTION_KEY` | Gere uma string aleatória ≥ 32 chars | Criptografia AES-256 de credenciais de IA |
| `INSTALL_SECRET` | Defina um segredo forte | Protege o endpoint `/api/install/migrate` em produção |

> ⚠️ **Nunca commite o `.env.local`** — ele já está no `.gitignore`.
>
> `VITE_SUPABASE_ANON_KEY` é **pública por design** — o Supabase foi projetado assim. A segurança real está no RLS do banco. `SUPABASE_SERVICE_ROLE_KEY` e `INSTALL_SECRET` devem permanecer apenas no servidor.

---

## Estrutura do projeto

```
CRM-Fity/
├── server.ts                     # Servidor Express local (porta 3000)
├── vite.config.ts                # Config Vite (root: frontend/, porta 3002, proxy → 3000)
├── tsconfig.json                 # Paths @/* → frontend/*
├── .env.local                    # Env vars para servidor Express local
│
├── frontend/                     # Código-fonte React (Vite root)
│   ├── src/
│   │   ├── app/
│   │   │   ├── AppRouter.tsx         # Roteamento com guards de role
│   │   │   ├── Sidebar.tsx           # Navegação — RBAC + badge escalação IA
│   │   │   ├── DashboardPage.tsx     # Wrapper abas Visão Geral + Inbox
│   │   │   └── useAppState.ts        # Estado global da aplicação
│   │   ├── features/
│   │   │   ├── agents/               # Exército Comercial de IA
│   │   │   │   ├── AgentsPage.tsx    # 4 abas: Comando / Agentes / Portfólio / Analytics
│   │   │   │   ├── AgentWizard.tsx   # Wizard 6 passos de criação de agente
│   │   │   │   ├── AgentCard.tsx     # Card com status pulse e menu
│   │   │   │   └── AgentsCommandCenter.tsx  # KPIs + ranking de agentes
│   │   │   ├── inbox/                # Omnichannel WhatsApp
│   │   │   │   ├── InboxPage.tsx     # Página principal do inbox
│   │   │   │   ├── ConversationList.tsx
│   │   │   │   ├── ConversationItem.tsx     # Badge "IA escalou → você"
│   │   │   │   ├── ConversationPanel.tsx    # Painel de mensagens
│   │   │   │   ├── MessageList.tsx          # Separadores de data + empty state
│   │   │   │   ├── InboxFilters.tsx
│   │   │   │   └── hooks/
│   │   │   │       ├── useConversations.ts      # Realtime + filtros
│   │   │   │       └── useAiEscalationCount.ts  # Badge Sidebar — count escalações
│   │   │   ├── ai/               # Copiloto Zenius — chat, prompts, histórico
│   │   │   ├── ai-credentials/   # Gestão de provedores de IA
│   │   │   ├── auth/             # AuthContext, AuthGate, SignIn (Data Convergence), Register
│   │   │   ├── dashboard/        # KPIs, Painel 360, SellerDetail360
│   │   │   ├── install/          # Install Wizard — páginas e serviço
│   │   │   ├── leads/            # Kanban, LeadList, modais de lead
│   │   │   ├── playbooks/        # Playbooks de vendas por usuário
│   │   │   ├── profile/          # Perfil do usuário
│   │   │   ├── reports/          # Relatórios e exportação
│   │   │   ├── settings/         # Configurações + auto-close de conversas
│   │   │   └── tasks/            # Tarefas e atividades
│   │   ├── lib/
│   │   │   ├── supabase.ts       # Client Supabase (anon key, browser-safe)
│   │   │   ├── permissions.ts    # RBAC — AppRole e Permissions
│   │   │   └── uiStyles.ts       # Design system — classes Tailwind reutilizáveis
│   │   ├── design-system/
│   │   │   └── styles/
│   │   │       ├── variables.css # Tokens CSS: --color-bg-page, --color-primary, --radius-* ...
│   │   │       └── globals.css   # Utilitários globais e scrollbar
│   │   └── hooks/                # Hooks globais de dados (Supabase)
│
├── api/                          # Serverless Functions (Vercel) / Express local
│   ├── _lib/
│   │   ├── auth.ts               # requireAuth() — valida JWT Supabase
│   │   ├── apiKeyAuth.ts         # requireApiKeyAuth() + requireAnyAuth() — sk_live_*
│   │   ├── deliverWebhooks.ts    # Dispara eventos para URLs externas cadastradas
│   │   ├── errors.ts             # AppError, apiError()
│   │   └── rateLimit.ts          # Rate limiter sliding window
│   ├── v1/
│   │   └── [...path].ts          # Catch-all: leads CRUD + stage + /deliver (DB webhook)
│   ├── api-keys/
│   │   └── index.ts              # GET/POST/DELETE de API Keys (admin)
│   ├── ai/
│   │   ├── generate.ts           # Geração de texto (rate limited)
│   │   ├── credentials.ts        # Credenciais de IA por empresa
│   │   └── test-connection.ts    # Teste de chave de IA
│   ├── install/
│   │   └── migrate.ts            # Executa migrations (INSTALL_SECRET)
│   ├── opportunities/
│   │   ├── analyze.ts            # Scoring determinístico de leads
│   │   └── list.ts               # Listagem de oportunidades
│   └── health.ts                 # Health check
│
├── n8n/                          # Workflows n8n exportados (JSON)
│   ├── WF-01-*                   # Recepção WhatsApp (versão atual V13)
│   ├── WF-06-AGENT-ROUTER-V1.json
│   ├── WF-07-AGENT-EXECUTOR-*    # Motor de IA (versão atual V13)
│   └── WF-08-AGENT-FOLLOWUP-V1.json
│
└── supabase/
    └── migrations/               # 076 migrations aplicadas em ordem
        ├── 001_init.sql
        ├── ...
        └── 076_fix_orphan_conversation_deleted_lead.sql
```

---

## Banco de dados

O projeto usa **Supabase** (PostgreSQL) com **Row Level Security (RLS)** ativo em todas as tabelas. Todas as policies usam a RPC `my_company_id()` para isolamento multitenant.

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `profiles` | Usuários com `role`, `company_id`, `is_active` |
| `companies` | Empresas (tenants) |
| `leads` | Leads com `owner_id`, `column_id`, `won_at`, `is_archived`, `deleted_at` |
| `boards` | Pipelines de venda por empresa |
| `board_stages` | Estágios do Kanban vinculados ao lifecycle |
| `tasks` | Tarefas vinculadas a leads |
| `activities` | Histórico de atividades |
| `goals` | Metas individuais e globais por período |
| `sales` | Vendas fechadas |
| `seller_scores` | Scores de performance por vendedor |
| `lead_opportunity_scores` | Scores de conversão, upsell e risco por lead |
| `organization_ai_credentials` | Chaves de IA por empresa (isoladas por tenant) |
| `ai_conversations` | Histórico do copiloto Zenius por usuário |
| `playbooks` | Playbooks de vendas (por usuário via `created_by`) |
| `channel_connections` | Conexões WhatsApp por empresa/vendedor |
| `conversations` | Conversas Omnichannel com `ai_agent_id`, `assignee_id`, `status` |
| `messages` | Mensagens das conversas |
| `ai_agents` | Agentes Comerciais de IA com função, tom, canais, playbook, metas |
| `agent_playbooks` | Scripts, objection_map, qualification_framework por agente |
| `agent_lead_memory` | Memória comercial de cada lead por agente |
| `agent_runs` | Log imutável de cada execução do agente |
| `agent_performance` | Performance diária agregada por agente |
| `api_keys` | Chaves de API por empresa (`sk_live_*`, armazenadas como hash SHA-256) |
| `outgoing_webhooks` | Webhooks de saída por empresa — URL + lista de eventos assinados |

### Migrations

As migrations são aplicadas automaticamente pelo Install Wizard. Para aplicar manualmente, execute os arquivos de `supabase/migrations/` **em ordem** no SQL Editor do Supabase (`001 → 076`).

### RPCs disponíveis

| RPC | Descrição |
|---|---|
| `my_company_id()` | Retorna `company_id` do usuário autenticado (base de todas as RLS) |
| `resolve_or_create_conversation(...)` | Acha ou cria conversa — ignora conversas com lead deletado |
| `get_agent_lead_queue(agent_id, limit)` | Fila de leads para um agente processar |
| `upsert_agent_lead_memory(...)` | Cria/atualiza memória comercial (com advisory lock) |
| `aggregate_agent_performance(company_id, date)` | Agrega runs do dia em agent_performance |
| `get_agent_ranking(company_id, start, end)` | Ranking de agentes por período |
| `validate_invite(p_token)` | Valida token de convite |
| `admin_block_user(p_user_id)` | Bloqueia usuário (`is_active = false`) |

---

## Omnichannel — WhatsApp

O módulo Omnichannel permite que vendedores atendam conversas de WhatsApp diretamente no CRM, em tempo real.

### Arquitetura

```
WhatsApp (cliente)
      ↓
Evolution API  →  n8n WF-01  →  Supabase (conversations + messages)
                                       ↓ Realtime
                              Frontend Inbox (React)
```

### Funcionalidades

- **Inbox unificado** — todas as conversas do vendedor em uma tela, ordenadas por última mensagem
- **Realtime** — novas mensagens aparecem instantaneamente via Supabase Realtime (sem polling)
- **Filtros** — por status (`waiting` / `in_progress` / `resolved`) e busca por nome/número
- **Human Takeover** — vendedor assume a conversa da IA com um clique
- **Auto-close** — conversas inativas são encerradas automaticamente (configurável por empresa)
- **Avatar gradiente** — gerado automaticamente pelo nome do contato

### Status das conversas

| Status | Descrição |
|---|---|
| `waiting` | Aguardando atendimento (IA ou humano) |
| `in_progress` | Em atendimento humano ativo |
| `resolved` | Encerrada |
| `blocked` | Bloqueada |

### Conexões por vendedor

Cada vendedor pode ter sua própria conexão WhatsApp via Evolution API. O campo `channel_connections.owner_id` vincula a conexão ao vendedor — mensagens recebidas são atribuídas automaticamente.

---

## Exército Comercial de IA

O módulo de Agentes Comerciais transforma o NextSales em uma força de vendas digital autônoma. Cada agente tem função, personalidade, playbook e metas próprias.

### Tipos de agente

| Tipo | Função |
|---|---|
| `sdr` | Prospecção e qualificação inicial |
| `closer` | Condução para fechamento |
| `followup` | Reengajamento de leads parados |
| `hunter` | Busca ativa de novas oportunidades |
| `curator` | Qualificação e nutrição de leads |
| `supervisor` | Supervisão e escalação da equipe |

### Escalação Inteligente

Quando o agente detecta um gatilho (interesse alto, pedido de humano, ticket alto), ele chama `escalar_para_humano` e muda o status da conversa para `in_progress`. O vendedor recebe:

1. **Badge âmbar na Sidebar** — contador de conversas escaladas, visível em qualquer tela
2. **Destaque na ConversationItem** — fundo âmbar + badge `🤖 IA escalou → você` na conversa
3. **Atualização em tempo real** via Supabase Realtime — sem refresh, sem polling

### Memória por lead

Cada agente mantém uma memória individual por lead (`agent_lead_memory`):

- `stage` — estágio atual (new / contacted / qualified / proposal / negotiation / closed_won / closed_lost)
- `interest_level` — nível de interesse detectado
- `detected_objections` — objeções identificadas (acumulativo)
- `approach_count` / `followup_count` / `response_count` — contadores de interação
- `next_action_at` — quando o agente deve agir novamente

### Performance

| Métrica | Descrição |
|---|---|
| `approaches` | Abordagens realizadas no dia |
| `responses` | Respostas recebidas |
| `qualified` | Leads qualificados |
| `meetings` | Reuniões agendadas |
| `sales` | Vendas fechadas |
| `escalations` | Escalações para humano |
| `response_rate` | Taxa de resposta (%) |
| `conversion_rate` | Taxa de conversão meetings → sales (%) |

---

## Automações n8n

O NextSales usa o n8n como motor de automação. Os workflows são conectados via webhooks e Supabase.

### Workflows

| Workflow | Trigger | Função |
|---|---|---|
| **WF-01** — Recepção WhatsApp | Webhook Evolution API | Recebe mensagens, cria/resolve conversa, roteia para IA ou humano |
| **WF-04** — Auto-close | Cron (configurável) | Encerra conversas inativas após período definido pela empresa |
| **WF-05** — Agente de Pipeline | Chamado pelo WF-01 | IA copiloto para conversas sem agente comercial |
| **WF-06** — Agent Router | Cron `*/5 * * * *` | Roteia leads da fila para cada agente ativo (respeita horário de trabalho) |
| **WF-07** — Agent Executor | Webhook | Motor da IA: recebe lead → constrói prompt → OpenAI → envia WhatsApp → atualiza memória |
| **WF-08** — Agent Follow-up | Cron `0 * * * *` | Processa `next_action_at` vencidos e dispara WF-07 com `content_type=followup` |

### Fluxo WF-07 (Agent Executor)

```
POST /webhook/agent-executor
{ conversation_id, lead_id, agent_id, company_id, input_text, content_type }
      ↓
Get Agent → Get Lead → Get Memory → Get Playbook
      ↓
Build Prompt (substitui variáveis: company, tone, niche, objections...)
      ↓
OpenAI → Resposta + JSON de decisão
{ "next_stage": "...", "interest_level": "...", "action": "continue|escalate|schedule_followup", "followup_hours": 24 }
      ↓
Send WhatsApp (Evolution API) → Upsert Memory → Insert Run → Upsert Performance
      ↓
action === "escalate" → escalar_para_humano → notifica vendedor
```

### Variáveis de ambiente n8n

| Variável | Descrição |
|---|---|
| `AGENT_EXECUTOR_WEBHOOK_URL` | URL do webhook do WF-07 (usado pelo WF-06 e WF-08) |
| Credencial Supabase | URL + Service Role Key configurada nas credenciais do n8n |
| Credencial Evolution API | URL + API Key da instância |
| Credencial OpenAI | API Key (usada pelo WF-05 e WF-07) |

### Gotchas críticos para os workflows

- `first().json` retorna objeto direto — `decision.action`, **nunca** `decision[0].action`
- `jsonBody` dinâmico **sempre** começa com `=`
- `channel_connections.external_id` = `instance_name` da Evolution API
- `continueOnFail: true` em nós que podem receber UUID vazio

---

## Copiloto IA (Zenius)

O **Zenius** é o assistente de IA integrado ao CRM para uso interativo do vendedor/admin. Toda geração passa pelo servidor — **nenhuma API key trafega para o browser**.

### Arquitetura segura

```
Browser → AIService.generate() → POST /api/ai/generate (JWT no header)
                                           ↓
                                  requireAuth() → companyId do JWT
                                           ↓
                           supabaseAdmin → organization_ai_credentials
                                           ↓
                              SDK de IA (OpenAI / Gemini / Anthropic)
                                           ↓
                                    texto gerado → browser
```

### Provedores suportados

| Provedor | Modelos |
|---|---|
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4.1, GPT-4.1 Mini |
| Google Gemini | Gemini 2.5 Flash, Gemini 1.5 Pro |
| Anthropic | Claude Sonnet 4.5, Claude Haiku 4.5 |

As chaves são armazenadas em `organization_ai_credentials` (isoladas por empresa) e **nunca retornam ao frontend** — a API sempre mascara com `"********"`.

---

## API REST v1 — Integração externa

O NextSales expõe uma API REST autenticada por **API Key** (`sk_live_*`) para integração com plataformas externas como Make, n8n, Zapier e sistemas próprios.

### Autenticação

Toda requisição à API v1 deve incluir o header:

```
Authorization: Bearer sk_live_<sua_chave>
```

As chaves são geradas em **Configurações → Integrações → API Keys** e armazenadas apenas como hash SHA-256 — o valor completo só é exibido uma vez no momento da criação.

### Endpoints disponíveis

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/leads` | Lista leads da empresa (paginado) |
| `POST` | `/api/v1/leads` | Cria um novo lead |
| `GET` | `/api/v1/leads/:id` | Busca lead por ID |
| `PUT` | `/api/v1/leads/:id` | Atualiza dados do lead |
| `DELETE` | `/api/v1/leads/:id` | Remove lead (soft delete) |
| `PATCH` | `/api/v1/leads/:id/stage` | Move lead para outro estágio do Kanban |

### Parâmetros — GET /api/v1/leads

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `status` | string | Filtrar por status (`NOVO`, `EM_ANDAMENTO`, etc.) |
| `board_id` | uuid | Filtrar por pipeline |
| `owner_id` | uuid | Filtrar por vendedor responsável |
| `page` | number | Página (padrão: 1) |
| `limit` | number | Registros por página (máx: 100, padrão: 50) |

### Exemplo — criar lead via Make

```json
POST https://nextsalescrm.vercel.app/api/v1/leads
Authorization: Bearer sk_live_...
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "phone": "11999999999",
  "company_name": "Empresa X",
  "value": 5000
}
```

> A API aceita tanto **JWT Supabase** (usuário logado) quanto **API Key** (`sk_live_*`) — o endpoint `requireAnyAuth` detecta automaticamente pelo prefixo do token.

---

## Webhooks de saída

O NextSales dispara eventos automaticamente para URLs externas sempre que algo acontece com leads. Configure em **Configurações → Integrações → Webhooks**.

### Arquitetura

```
Ação no CRM (UI ou API)
        ↓
Supabase DB Webhook (INSERT/UPDATE/DELETE na tabela leads)
        ↓
POST /api/v1/deliver
        ↓
deliverWebhooks() — busca webhooks ativos da empresa, filtra por evento
        ↓
POST para cada URL cadastrada (timeout 8s, fire-and-forget paralelo)
```

### Eventos disponíveis

| Evento | Quando dispara |
|---|---|
| `lead.created` | Novo lead criado (via UI ou API) |
| `lead.updated` | Dados do lead alterados |
| `lead.stage_changed` | Lead movido para outro estágio do Kanban |
| `lead.converted` | Lead marcado como ganho (`won_at` preenchido) |
| `lead.lost` | Lead marcado como perdido (`lost_at` preenchido) |
| `lead.deleted` | Lead removido (hard delete pela UI) |

### Payload padrão

```json
{
  "event": "lead.created",
  "company_id": "uuid-da-empresa",
  "timestamp": "2026-03-21T10:00:00.000Z",
  "data": { ...campos do lead... }
}
```

### Configuração no Supabase (obrigatória)

Para que os eventos gerados pela UI sejam disparados, configure um **DB Webhook** no Supabase:

1. Acesse **Database → Webhooks → Create a new hook**
2. Tabela: `leads`
3. Eventos: ✅ INSERT ✅ UPDATE ✅ DELETE
4. URL: `https://seu-dominio.vercel.app/api/v1/deliver`
5. Sem secret (o endpoint não exige autenticação — o `company_id` vem do payload do Supabase)

> Leads criados via `POST /api/v1/leads` também disparam os webhooks diretamente, sem passar pelo Supabase DB Webhook.

---

## API — Endpoints e segurança

Todos os endpoints da `api/` seguem estas regras:

- `requireAuth(req)` obrigatório — valida JWT Supabase, retorna `{ userId, companyId, role }`
- `companyId` sempre derivado do JWT, **nunca** do body/query param do cliente
- Erros internos retornam mensagem genérica — stack trace apenas nos logs do servidor
- Imports relativos usam extensão `.js` explícita (Node.js ESM com `"type": "module"`)

| Endpoint | Método | Auth | Rate limit | Descrição |
|---|---|---|---|---|
| `/api/v1/leads` | GET/POST | JWT ou API Key | — | Lista ou cria leads |
| `/api/v1/leads/:id` | GET/PUT/DELETE | JWT ou API Key | — | Lê, edita ou remove lead |
| `/api/v1/leads/:id/stage` | PATCH | JWT ou API Key | — | Move lead de estágio |
| `/api/v1/deliver` | POST | Supabase interno | — | Recebe DB webhook e dispara webhooks de saída |
| `/api/api-keys` | GET/POST | JWT + admin | — | Lista ou cria API Keys |
| `/api/api-keys/:id` | DELETE | JWT + admin | — | Revoga API Key |
| `/api/ai/generate` | POST | JWT | 20/min | Geração de texto via IA (server-side) |
| `/api/ai/test-connection` | POST | JWT | 20/min | Testa chave de IA |
| `/api/ai/credentials` | GET | JWT | — | Lista credenciais da empresa |
| `/api/ai/credentials` | POST | JWT + admin | — | Salva/desconecta credencial |
| `/api/install/migrate` | POST | X-Install-Key | — | Executa migrations (INSTALL_SECRET) |
| `/api/opportunities/list` | GET | JWT | — | Oportunidades com scores |
| `/api/opportunities/analyze` | POST | JWT | — | Recalcula scores de leads |
| `/api/health` | GET | — | — | Health check |

---

## Roles e permissões

| Role | Exibição | Acesso |
|---|---|---|
| `admin` | Admin | Acesso total — Painel 360, equipe, configurações, Agentes IA, todos os leads |
| `seller` | Vendedor | Pipeline, Omnichannel, leads próprios, tarefas, atividades, Zenius |

> Usuários com `is_active = false` são **bloqueados automaticamente** no login via `AuthGate`.
>
> A Sidebar e o AppRouter retornam `null` até o `role` do usuário ser carregado (`isRoleReady`), evitando flash de conteúdo não autorizado.

---

## Segurança — Fase 6 Hardening

### Content Security Policy

Configurada em `vercel.json` para todas as rotas:

```
default-src 'self'
script-src  'self' 'unsafe-inline'
connect-src 'self' *.supabase.co wss://*.supabase.co
            api.openai.com api.anthropic.com generativelanguage.googleapis.com
img-src     'self' data: https:
style-src   'self' 'unsafe-inline' fonts.googleapis.com
font-src    'self' data: fonts.gstatic.com
frame-ancestors 'none'
```

Headers adicionais: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

### Rate limiting

| Parâmetro | Valor |
|---|---|
| Janela | 60 segundos |
| Limite | 20 requisições por `userId` |
| Resposta ao exceder | `HTTP 429` |
| Implementação | Sliding window in-memory — sem dependências externas |
| Endpoints cobertos | `POST /api/ai/generate`, `POST /api/ai/test-connection` |

### Zero API keys no browser

Nenhum SDK de IA é instanciado no browser. O `AIService` delega toda geração para `/api/ai/generate`. A chave de API nunca trafega do servidor para o cliente.

---

## Design System & UI

### Tokens de cor (`variables.css`)

Todos os componentes usam **exclusivamente** CSS custom properties — nenhuma cor estática hardcodada.

| Token | Valor | Uso |
|---|---|---|
| `--color-bg-page` | `slate.950` | Fundo da página |
| `--color-bg-surface` | `slate.900` | Cards, modais |
| `--color-bg-input` | `slate.950` | Inputs e selects |
| `--color-border` | `slate.700` | Bordas padrão |
| `--color-divider` | `slate.800` | Separadores |
| `--color-text-primary` | `slate.100` | Texto principal |
| `--color-text-secondary` | `slate.400` | Texto secundário |
| `--color-text-muted` | `slate.500` | Texto atenuado |
| `--color-primary` | `blue.600` | Cor de destaque da marca |
| `--color-primary-hover` | `blue.500` | Hover de elementos primários |
| `--color-primary-text` | `blue.400` | Links e textos de destaque |
| `--radius-sm/md/lg/xl` | `0.375–1rem` | Escala de border-radius |

### Página de Login — "Data Convergence" (`SignIn.tsx`)

Página de login com design futurista inspirado em plataformas de IA (LangSmith, Vercel).

**Layout:** split 55/45 — painel de branding à esquerda + card de formulário à direita.

**Efeito SVG animado:**
- 9 curvas Bézier partem da borda esquerda em diferentes alturas
- Todas convergem para o ponto `(660, 450)` com partículas brancas viajando via `animateMotion`
- Uma linha-tronco sai do ponto de convergência e termina apontando para o card de login
- Nó pulsante no ponto de convergência + nós scatter ambientes
- Card deslocado para a esquerda (`translateX(-10rem)`) criando a sensação de imersão

**Fontes:** Syne (display, 600/700/800) + DM Sans (body). Adicionar ao `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet"/>
```

### Sliding Pill Navigation

Padrão de abas com indicador deslizante aplicado em toda a plataforma. Usa `useRef` para medir `offsetLeft/offsetWidth` real de cada botão e deslizar a pill com `transition-all duration-300`.

Aplicado em: `Dashboard`, `GlobalSales360`, `LeadListHeader`, `AgentsPage`, `TeamSettings`, `GoalsTab`.

---

## Deploy

O projeto é deployado automaticamente na **Vercel** a cada push na branch `main`.

```bash
# Validar o build localmente antes de subir
npm run build
```

### Variáveis obrigatórias no Vercel

Configure em **Settings → Environment Variables**:

| Variável | Obrigatória | Observação |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | URL pública do projeto |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Chave anon — pública por design |
| `SUPABASE_URL` | ✅ | URL server-side |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Nunca expor publicamente |
| `ENCRYPTION_KEY` | ✅ | String aleatória ≥ 32 chars |
| `INSTALL_SECRET` | Recomendado | Protege endpoint de migrations |

> Cole os valores sem espaços ou quebras de linha — o código aplica `.trim()` como defesa, mas a origem limpa é sempre preferível.

---

<div align="center">
  <sub>© 2026 NextSales. Todos os direitos reservados.</sub>
</div>
