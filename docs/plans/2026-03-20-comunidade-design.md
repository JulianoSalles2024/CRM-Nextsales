# Design — Módulo Comunidade
**Data:** 2026-03-20
**Projeto:** NextSales / CRM-Fity
**Stack:** React + TypeScript + Supabase + Vercel

---

## Visão Geral

Comunidade **cross-empresa** para todos os usuários autenticados do NextSales. Fórum estruturado por categorias com sistema de reputação simples. Modelo inspirado em HubSpot Community / Salesforce Trailhead — a comunidade é um ativo do produto, não da empresa cliente.

**Objetivo estratégico:** reduzir custo de suporte, aumentar retenção, gerar network effects entre empresas clientes.

---

## Seções (Categorias fixas)

| Slug | Nome | Quem posta |
|------|------|-----------|
| `duvidas` | Dúvidas | Qualquer usuário |
| `boas-praticas` | Boas Práticas | Qualquer usuário |
| `novidades` | Novidades NextSales | Só admins da plataforma |
| `ideias` | Ideias & Sugestões | Qualquer usuário |

---

## Perfil Público

| Campo | Visível na comunidade |
|---|---|
| Nome + avatar gradiente | ✅ |
| Cargo / role | ✅ |
| Nome da empresa | ✅ (opt-out disponível) |
| Badge de reputação | ✅ |
| Pipeline / leads / dados CRM | ❌ nunca exposto |

---

## Sistema de Reputação

Baseado em pontos acumulados:

| Badge | Pontos necessários |
|---|---|
| Novato | 0 |
| Contribuidor | 50 |
| Especialista | 200 |
| Embaixador | 500 |

**Como ganhar pontos:**
- Post criado: +5
- Upvote recebido em post: +3
- Upvote recebido em comentário: +1
- Post marcado como "Solução": +10

---

## Arquitetura de Dados (Supabase)

```sql
-- Categorias do fórum
create table community_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  icon text,
  description text,
  "order" int default 0,
  only_admins boolean default false -- novidades: só admins postam
);

-- Posts
create table community_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references community_categories(id),
  author_id uuid not null references auth.users(id),
  company_id uuid not null default my_company_id(), -- para analytics, não para RLS
  title text not null,
  content text not null, -- markdown
  upvotes int default 0,
  is_pinned boolean default false,
  is_locked boolean default false,
  is_solved boolean default false,
  hide_company boolean default false, -- opt-out de mostrar empresa
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Comentários (1 nível de reply)
create table community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  parent_id uuid references community_comments(id), -- reply a outro comentário
  content text not null,
  upvotes int default 0,
  is_solution boolean default false, -- marcado como solução pelo autor do post
  created_at timestamptz default now()
);

-- Votos (evita duplicata)
create table community_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  target_type text not null, -- 'post' | 'comment'
  target_id uuid not null,
  created_at timestamptz default now(),
  unique(user_id, target_type, target_id)
);

-- Bookmarks
create table community_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  post_id uuid not null references community_posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);
```

### RLS
- Todos os posts e comentários: **leitura pública** para qualquer autenticado (cross-empresa)
- Escrita: qualquer autenticado pode criar posts/comentários
- Edição/deleção: apenas o próprio autor ou super-admin
- Categoria `novidades`: inserção bloqueada via RLS para não-admins da plataforma

---

## UX

### Feed principal
- Toggle: **Recente** (cronológico) / **Popular** (mais upvotes na semana)
- Filtro por categoria
- Busca full-text em títulos e conteúdo
- Card de post: título, categoria, autor + badge, empresa (se não opt-out), upvotes, contagem de comentários, tempo relativo

### Página de post
- Conteúdo em markdown renderizado
- Botão upvote no post
- Seção de comentários com replies aninhados (1 nível)
- Autor do post pode marcar um comentário como ✅ Solução
- Post resolvido aparece com badge verde no feed

### Editor
- Markdown simples: bold, itálico, lista, bloco de código, link
- Preview ao lado (split view)

### Notificações
- Alguém comentou no seu post
- Alguém respondeu seu comentário
- Seu post foi marcado como solução
- Via sistema de notificações existente do NextSales

---

## Estrutura de Arquivos (Frontend)

```
src/features/community/
├── CommunityPage.tsx             # Feed principal
├── PostDetail.tsx                # Post + comentários
├── NewPostModal.tsx              # Criar post
├── CommentThread.tsx             # Comentários aninhados
├── CategoryFilter.tsx            # Filtros de categoria
├── ReputationBadge.tsx           # Badge Novato/Contribuidor/etc
└── hooks/
    ├── usePosts.ts
    ├── useComments.ts
    └── useVotes.ts
```

---

## Integração com Suporte
- Post na categoria "Dúvidas" sem resposta há +48h → sugerir abrir ticket de suporte
- Ticket resolvido → admin pode publicar como artigo ou post de boas práticas com 1 clique
