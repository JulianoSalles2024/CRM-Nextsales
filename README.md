# CRM Zenius

> CRM comercial SaaS multitenant com Kanban, Painel 360, IA copiloto e automações de vendas.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)
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
- [API — Endpoints e segurança](#api--endpoints-e-segurança)
- [Zenius — Copiloto IA](#zenius--copiloto-ia)
- [Oportunidades Inteligentes](#oportunidades-inteligentes)
- [Roles e permissões](#roles-e-permissões)
- [Segurança — Fase 6 Hardening](#segurança--fase-6-hardening)
- [Deploy](#deploy)

---

## Sobre o projeto

O **CRM Zenius** é uma plataforma de gestão comercial voltada para equipes de vendas. Cada empresa tem seu próprio ambiente isolado (multitenant), com controle de acesso por papel (RBAC) e dados protegidos via Row Level Security no Supabase.

**Principais funcionalidades:**

- 📋 **Pipeline Kanban** — arrastar e soltar leads entre estágios personalizáveis
- 📊 **Dashboard** — KPIs em tempo real de faturamento, conversão e carteira
- 🔭 **Painel 360** — visão gerencial com ranking de vendedores, score e metas (somente admin)
- 🎯 **Metas** — metas individuais e globais com acompanhamento de período
- ✅ **Tarefas** — gestão de atividades vinculadas a leads
- 🤖 **Zenius — Copiloto IA** — assistente SDR/vendas com histórico persistido, quick replies e prompts por role
- 🔮 **Oportunidades Inteligentes** — scoring determinístico com bandas hot/warm/cold/risk/upsell
- 🎯 **Deal Detail View** — pipeline dinâmico, status em tempo real e timeline paginada
- 👥 **Multiusuário** — admin, vendedor e usuário com permissões distintas por RBAC
- 🔐 **Segurança** — CSP, rate limiting, INSTALL_SECRET, ESM-safe, zero API keys no browser

---

## Pré-requisitos

- [Node.js](https://nodejs.org) 18+
- Conta no [Supabase](https://supabase.com)
- Conta no [Vercel](https://vercel.com) (para deploy)

---

## Instalação e execução local

```bash
# 1. Clone o repositório
git clone https://github.com/JulianoSalles2024/CRM-Fity.git
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

O CRM Zenius possui um assistente de instalação guiado que configura toda a infraestrutura automaticamente — sem precisar editar arquivos manualmente.

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
│   ├── .env.local                # Env vars para Vite em desenvolvimento local
│   ├── index.html                # Entry point do Vite
│   ├── index.tsx                 # Bootstrap React
│   ├── App.tsx                   # Root — estado global e providers
│   ├── api.ts                    # Camada de serviço Supabase (auth, leads, tasks...)
│   ├── data.ts                   # Constantes de dados iniciais
│   ├── types.ts                  # Tipos compartilhados do frontend
│   ├── components/               # Componentes UI compartilhados
│   │   ├── AIComposer.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ui/                   # FlatCard, GlassCard
│   └── src/
│       ├── app/
│       │   ├── AppRouter.tsx     # Roteamento com guards de role
│       │   └── useAppState.ts    # Estado global da aplicação
│       ├── features/             # Domínios de negócio isolados
│       │   ├── ai/               # Zenius copiloto — chat, prompts, histórico
│       │   ├── ai-credentials/   # Gestão de provedores de IA
│       │   ├── auth/             # AuthContext, AuthGate, Login, Register
│       │   ├── chat/             # Chat de conversas (WhatsApp/canal)
│       │   ├── dashboard/        # KPIs, Painel 360, SellerDetail360
│       │   ├── install/          # Install Wizard — páginas e serviço
│       │   ├── leads/            # Kanban, LeadList, modais de lead
│       │   ├── notifications/    # Notificações real-time
│       │   ├── playbooks/        # Playbooks de vendas
│       │   ├── profile/          # Perfil do usuário
│       │   ├── reports/          # Relatórios e exportação
│       │   ├── settings/         # Configurações de equipe e estágios
│       │   └── tasks/            # Tarefas e calendário
│       ├── services/
│       │   └── ai/
│       │       ├── aiService.ts  # AIService — proxy seguro para /api/ai/generate
│       │       └── config.ts     # Configuração de providers e modelos
│       ├── lib/
│       │   ├── supabase.ts       # Client Supabase (anon key, browser-safe)
│       │   ├── permissions.ts    # RBAC — AppRole e Permissions
│       │   ├── mappers.ts        # snake_case ↔ camelCase
│       │   └── uiStyles.ts       # Design system — classes Tailwind reutilizáveis
│       ├── hooks/                # Hooks de dados (Supabase)
│       │   ├── useBoards.ts
│       │   ├── useLeads.ts
│       │   ├── useTasks.ts
│       │   ├── useActivities.ts
│       │   ├── useUsers.ts
│       │   ├── useGoals.ts
│       │   ├── useNotifications.ts  # Real-time via Supabase Realtime
│       │   ├── usePlaybooks.ts
│       │   ├── useGroupAnalyses.ts
│       │   └── useOpportunityScores.ts
│       └── utils/
│           └── logger.ts         # safeError — logs apenas em dev
│
├── api/                          # Serverless Functions (Vercel) / Express local
│   ├── _lib/                     # Módulos compartilhados — SOMENTE server-side
│   │   ├── auth.ts               # requireAuth() — valida JWT, retorna AuthContext
│   │   ├── errors.ts             # AppError, AuthError, apiError()
│   │   ├── rateLimit.ts          # Rate limiter in-memory (20 req/min por userId)
│   │   └── supabase.ts           # supabaseAdmin — client service_role
│   ├── _utils.ts                 # testProviderConnection, encrypt/decrypt
│   ├── ai/
│   │   ├── credentials.ts        # GET/POST credenciais de IA por empresa
│   │   ├── generate.ts           # Geração de texto (rate limited, auth required)
│   │   └── test-connection.ts    # Teste de chave de IA (rate limited)
│   ├── install/
│   │   └── migrate.ts            # Executa migrations via Management API (INSTALL_SECRET)
│   ├── opportunities/
│   │   ├── analyze.ts            # Scoring determinístico de leads
│   │   └── list.ts               # Listagem de oportunidades por empresa
│   └── health.ts                 # Health check
│
└── supabase/
    └── migrations/               # 017 migrations aplicadas em ordem
        ├── 001_init.sql          # Schema base completo
        ├── ...
        └── 017_phase5_entities.sql
```

---

## Banco de dados

O projeto usa **Supabase** (PostgreSQL) com **Row Level Security (RLS)** ativo em todas as tabelas. Todas as policies usam a RPC `my_company_id()` para isolamento multitenant.

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `profiles` | Usuários com `role`, `company_id`, `is_active` |
| `companies` | Empresas (tenants) |
| `leads` | Leads com `owner_id`, `column_id`, `won_at`, `is_archived` |
| `boards` | Pipelines de venda por empresa |
| `board_stages` | Estágios do Kanban vinculados ao lifecycle |
| `tasks` | Tarefas vinculadas a leads |
| `activities` | Histórico de atividades |
| `goals` | Metas individuais e globais por período |
| `sales` | Vendas fechadas |
| `seller_scores` | Scores de performance por vendedor |
| `lead_opportunity_scores` | Scores de conversão, upsell e risco por lead |
| `organization_ai_credentials` | Chaves de IA por empresa (isoladas por tenant) |
| `ai_conversations` | Histórico do Zenius copiloto por usuário |
| `notifications` | Notificações real-time |
| `playbooks` | Playbooks de vendas |
| `groups` | Grupos de análise |
| `tags` | Tags de leads |

### Migrations

As migrations são aplicadas automaticamente pelo Install Wizard. Para aplicar manualmente, execute os arquivos de `supabase/migrations/` **em ordem** no SQL Editor do Supabase (`001 → 017`).

### RPCs disponíveis

| RPC | Descrição |
|---|---|
| `my_company_id()` | Retorna `company_id` do usuário autenticado (usada em todas as RLS policies) |
| `validate_invite(p_token)` | Valida token de convite |
| `admin_block_user(p_user_id)` | Bloqueia usuário (`is_active = false`) |
| `admin_unblock_user(p_user_id)` | Desbloqueia usuário |

---

## API — Endpoints e segurança

Todos os endpoints da `api/` seguem estas regras:

- `requireAuth(req)` obrigatório — valida JWT Supabase, retorna `{ userId, companyId, role }`
- `companyId` sempre derivado do JWT, **nunca** do body/query param do cliente
- Erros internos retornam mensagem genérica — stack trace apenas nos logs do servidor
- Imports relativos usam extensão `.js` explícita (Node.js ESM com `"type": "module"`)

| Endpoint | Método | Auth | Rate limit | Descrição |
|---|---|---|---|---|
| `/api/ai/generate` | POST | JWT | 20/min | Geração de texto via IA (server-side) |
| `/api/ai/test-connection` | POST | JWT | 20/min | Testa chave de IA |
| `/api/ai/credentials` | GET | JWT | — | Lista credenciais da empresa |
| `/api/ai/credentials` | POST | JWT + admin | — | Salva/desconecta credencial |
| `/api/install/migrate` | POST | X-Install-Key | — | Executa migrations (INSTALL_SECRET) |
| `/api/opportunities/list` | GET | JWT | — | Oportunidades com scores |
| `/api/opportunities/analyze` | POST | JWT | — | Recalcula scores de leads |
| `/api/health` | GET | — | — | Health check |

---

## Zenius — Copiloto IA

O **Zenius** é o assistente de IA integrado ao CRM. Toda geração passa pelo servidor — **nenhuma API key trafega para o browser**.

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

### Prompts por role

| Role | Persona | Quick replies |
|---|---|---|
| `admin` | Pilot estratégico | "Vendas de ontem", "Como está o time?", "Leads em risco" |
| `seller` | SDR de vendas | Respostas focadas em prospecção e fechamento |

### Provedores suportados

| Provedor | Modelos |
|---|---|
| OpenAI | GPT-5 Mini, GPT-5 Nano, GPT-4o, GPT-4o Mini |
| Google Gemini | Gemini 2.5 Flash, Gemini 1.5 Pro |
| Anthropic | Claude Sonnet 4.5, Claude Haiku 4.5 |

As chaves são armazenadas em `organization_ai_credentials` (isoladas por empresa) e **nunca retornam ao frontend** — a API sempre mascara com `"********"`.

---

## Oportunidades Inteligentes

O módulo analisa automaticamente os leads ativos e gera scores determinísticos:

| Score | Descrição |
|---|---|
| `conversion_score` | Probabilidade de fechar o negócio (0–100) |
| `upsell_score` | Potencial de venda adicional com base em histórico (0–100) |
| `risk_score` | Risco de perda por inatividade ou estagnação (0–100) |

**Bandas de prioridade:** `hot` · `warm` · `cold` · `risk` · `upsell`

Para disparar a análise manualmente:

```js
const { data } = await (await import('/src/lib/supabase.ts')).supabase.auth.getSession();
const res = await fetch('/api/opportunities/analyze', {
  method: 'POST',
  headers: { Authorization: `Bearer ${data.session.access_token}` }
});
console.log(await res.json()); // { analyzed: N, upserted: N }
```

---

## Roles e permissões

| Role | Exibição | Acesso |
|---|---|---|
| `admin` | Admin | Acesso total — Painel 360, equipe, configurações, todos os leads, IA |
| `seller` | Vendedor | Pipeline, leads próprios, tarefas, atividades, Zenius (perfil SDR) |
| `user` | Usuário | Acesso básico limitado |

> Usuários com `is_active = false` são **bloqueados automaticamente** no login via `AuthGate`, sem acesso a nenhuma rota.
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

### Cache

| Rota | Cache-Control |
|---|---|
| `/assets/*` (bundles Vite com hash) | `public, max-age=31536000, immutable` |
| Todas as demais (incluindo `index.html`) | `no-cache, no-store, must-revalidate` |

Garante que o browser nunca sirva um `index.html` obsoleto após novo deploy.

### INSTALL_SECRET

O endpoint `/api/install/migrate` executa DDL arbitrário no banco. Em produção, exige o header `X-Install-Key` com o valor de `INSTALL_SECRET`. Sem esse header a requisição é rejeitada com 401.

### Rate limiting

| Parâmetro | Valor |
|---|---|
| Janela | 60 segundos |
| Limite | 20 requisições por `userId` |
| Resposta ao exceder | `HTTP 429` |
| Implementação | Sliding window in-memory — sem dependências externas |
| Endpoints cobertos | `POST /api/ai/generate`, `POST /api/ai/test-connection` |

### Zero API keys no browser

Nenhum SDK de IA é instanciado no browser. O `AIService` delega toda geração para `/api/ai/generate`. A chave de API nunca trafega do servidor para o cliente — retorna apenas o texto gerado.

### Chaves Supabase

`.trim()` aplicado em todas as entradas de chaves Supabase (env vars e localStorage) no momento da criação do client — previne `ERR_INVALID_CHAR` e falhas de WebSocket causadas por newlines acidentais ao copiar do dashboard.

### ESM — extensões explícitas

Com `"type": "module"` no `package.json`, todos os imports relativos em `api/` usam extensão `.js` explícita, conforme exigido pelo Node.js ESM resolver.

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
  <sub>© 2026 CRM Zenius. Todos os direitos reservados.</sub>
</div>
