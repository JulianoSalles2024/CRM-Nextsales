# Design — Módulo Suporte
**Data:** 2026-03-20
**Projeto:** NextSales / CRM-Fity
**Stack:** React + TypeScript + Supabase + Vercel

---

## Visão Geral

Dois sub-módulos integrados que formam a Central de Suporte do NextSales:

1. **Central de Ajuda (Help Center)** — artigos, FAQs e tutoriais criados por admins da plataforma
2. **Sistema de Tickets** — usuários abrem chamados, admins da empresa respondem dentro do CRM

---

## Sub-módulo 1: Central de Ajuda

### Comportamento
- Acessível via widget flutuante `?` em toda a plataforma (painel lateral)
- Página dedicada `/ajuda` com busca em tempo real
- Conteúdo em Markdown, renderizado no frontend
- Apenas super-admins do NextSales criam/editam artigos
- Qualquer usuário autenticado lê

### Categorias
- Primeiros Passos
- Pipeline e Leads
- Agentes de IA
- Omnichannel / Inbox
- Relatórios
- Configurações

---

## Sub-módulo 2: Sistema de Tickets

### Fluxo de status
```
Aberto → Em Atendimento → Resolvido → (Reaberto)
```

### Prioridades
`Baixa | Média | Alta | Urgente`

### Comportamento por role
- **Seller:** abre ticket, acompanha status, responde na thread
- **Admin:** vê fila de todos os tickets da empresa, responde, altera status/prioridade
- Badge com contagem de tickets abertos no menu lateral (só admins)

### Notas internas
Admins podem adicionar notas marcadas como `is_internal = true` — invisíveis para o usuário que abriu o ticket. Útil para coordenação interna.

---

## Arquitetura de Dados (Supabase)

```sql
-- Categorias de artigos
create table support_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  "order" int default 0,
  created_at timestamptz default now()
);

-- Artigos da Central de Ajuda
create table support_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references support_categories(id),
  title text not null,
  content text not null, -- markdown
  slug text unique not null,
  published boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tickets
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id(),
  opened_by uuid not null references auth.users(id),
  subject text not null,
  status text not null default 'open', -- open | in_progress | resolved | reopened
  priority text not null default 'medium', -- low | medium | high | urgent
  category_id uuid references support_categories(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Mensagens dos tickets
create table support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  content text not null,
  is_internal boolean default false, -- nota privada (só admins veem)
  created_at timestamptz default now()
);
```

### RLS
- `support_articles`: leitura pública para autenticados (`published = true`); escrita só super-admins
- `support_tickets`: isolado por `company_id = my_company_id()`; seller vê só os próprios (`opened_by = auth.uid()`)
- `support_messages`: herdado do ticket pai; `is_internal` filtrado no frontend para não-admins

---

## Estrutura de Arquivos (Frontend)

```
src/features/support/
├── SupportPage.tsx               # Página principal (admin: fila de tickets)
├── HelpCenter.tsx                # Central de artigos + busca
├── HelpWidget.tsx                # Widget flutuante ? (presente em toda a app)
├── TicketList.tsx                # Lista de tickets (admin)
├── TicketDetail.tsx              # Thread de mensagens do ticket
├── NewTicketModal.tsx            # Modal de abertura de chamado
├── ArticleView.tsx               # Renderiza artigo em markdown
└── hooks/
    ├── useTickets.ts
    ├── useTicketMessages.ts
    └── useArticles.ts
```

---

## Integrações Futuras
- Ticket resolvido → sugerir criar artigo na Central de Ajuda com 1 clique
- Notificação Realtime quando ticket recebe resposta
- Email de notificação via n8n (WF futuro)
