# Módulo Comunidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o Módulo de Comunidade cross-empresa do NextSales — fórum estruturado por categorias com feed, posts em markdown, comentários aninhados, upvotes, sistema de reputação (Novato → Embaixador), e integração com notificações existentes.

**Architecture:** Migration Supabase cria 4 tabelas cross-tenant (`community_categories`, `community_posts`, `community_comments`, `community_votes`) com RLS aberta para leitura por qualquer autenticado. Frontend React/TS em `frontend/src/features/community/` com hooks próprios, componentes no design system do app (dark, blue accents), integrado ao Sidebar e AppRouter existentes. `react-markdown` já instalado pelo módulo de Suporte (se implementado antes); caso contrário instalar.

**Tech Stack:** React 18 + TypeScript, Supabase JS v2, Tailwind CSS, Lucide React, react-markdown, existing `supabase` client from `@/src/lib/supabase`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/079_community_module.sql` | Criar | Tabelas + RLS + seed de categorias |
| `frontend/src/features/community/community.types.ts` | Criar | Tipos TS do módulo |
| `frontend/src/features/community/hooks/usePosts.ts` | Criar | Fetch/create posts + busca + sort |
| `frontend/src/features/community/hooks/useComments.ts` | Criar | Comentários + realtime |
| `frontend/src/features/community/hooks/useVotes.ts` | Criar | Upvote toggle (post e comentário) |
| `frontend/src/features/community/ReputationBadge.tsx` | Criar | Badge visual baseado em pontos |
| `frontend/src/features/community/CategoryFilter.tsx` | Criar | Pills de filtro por categoria |
| `frontend/src/features/community/PostCard.tsx` | Criar | Card de post no feed |
| `frontend/src/features/community/CommentThread.tsx` | Criar | Comentários + replies aninhados |
| `frontend/src/features/community/NewPostModal.tsx` | Criar | Modal criar post com preview markdown |
| `frontend/src/features/community/PostDetail.tsx` | Criar | Post completo + comentários + upvote |
| `frontend/src/features/community/CommunityPage.tsx` | Criar | Feed principal com filtros e sort |
| `frontend/src/features/community/index.ts` | Criar | Re-exports do módulo |
| `frontend/src/app/Sidebar.tsx` | Modificar | Adicionar item "Comunidade" |
| `frontend/src/app/AppRouter.tsx` | Modificar | Rota `case 'Comunidade'` |

---

## Task 1: Migration Supabase

**Files:**
- Create: `supabase/migrations/079_community_module.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- supabase/migrations/079_community_module.sql

-- Categorias do fórum
create table if not exists community_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  icon text,
  description text,
  "order" int default 0,
  only_admins boolean default false
);

-- Posts
create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references community_categories(id),
  author_id uuid not null references auth.users(id),
  company_id uuid not null default my_company_id(),
  title text not null,
  content text not null,
  upvotes int default 0,
  is_pinned boolean default false,
  is_locked boolean default false,
  is_solved boolean default false,
  hide_company boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Comentários (1 nível de reply)
create table if not exists community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  parent_id uuid references community_comments(id),
  content text not null,
  upvotes int default 0,
  is_solution boolean default false,
  created_at timestamptz default now()
);

-- Votos (constraint unique evita duplicata)
create table if not exists community_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  target_type text not null, -- 'post' | 'comment'
  target_id uuid not null,
  created_at timestamptz default now(),
  unique(user_id, target_type, target_id)
);

-- Bookmarks
create table if not exists community_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  post_id uuid not null references community_posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

-- RLS: community_categories (leitura pública)
alter table community_categories enable row level security;
create policy "authenticated_read_community_categories" on community_categories
  for select using (auth.role() = 'authenticated');

-- RLS: community_posts (leitura cross-empresa; escrita por autenticado; only_admins via app)
alter table community_posts enable row level security;
create policy "authenticated_read_posts" on community_posts
  for select using (auth.role() = 'authenticated');
create policy "authenticated_insert_post" on community_posts
  for insert with check (auth.role() = 'authenticated' and author_id = auth.uid());
create policy "author_update_post" on community_posts
  for update using (author_id = auth.uid());
create policy "author_delete_post" on community_posts
  for delete using (author_id = auth.uid());

-- RLS: community_comments
alter table community_comments enable row level security;
create policy "authenticated_read_comments" on community_comments
  for select using (auth.role() = 'authenticated');
create policy "authenticated_insert_comment" on community_comments
  for insert with check (auth.role() = 'authenticated' and author_id = auth.uid());
create policy "author_update_comment" on community_comments
  for update using (author_id = auth.uid());
create policy "author_delete_comment" on community_comments
  for delete using (author_id = auth.uid());

-- RLS: community_votes
alter table community_votes enable row level security;
create policy "authenticated_read_votes" on community_votes
  for select using (auth.role() = 'authenticated');
create policy "authenticated_insert_vote" on community_votes
  for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());
create policy "author_delete_vote" on community_votes
  for delete using (user_id = auth.uid());

-- RLS: community_bookmarks
alter table community_bookmarks enable row level security;
create policy "owner_all_bookmarks" on community_bookmarks
  for all using (user_id = auth.uid());

-- Seed: categorias fixas
insert into community_categories (name, slug, icon, description, "order", only_admins) values
  ('Dúvidas', 'duvidas', 'help-circle', 'Tire suas dúvidas sobre o NextSales', 1, false),
  ('Boas Práticas', 'boas-praticas', 'star', 'Compartilhe técnicas e estratégias de vendas', 2, false),
  ('Novidades NextSales', 'novidades', 'megaphone', 'Atualizações e novos recursos da plataforma', 3, true),
  ('Ideias & Sugestões', 'ideias', 'lightbulb', 'Sugira melhorias para o produto', 4, false)
on conflict (slug) do nothing;
```

- [ ] **Step 2: Aplicar no Supabase Dashboard**
  - SQL Editor → colar e executar
  - Verificar: 4 tabelas criadas + 4 categorias no seed

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/079_community_module.sql
git commit -m "feat(community): add database migration for community module"
```

---

## Task 2: Tipos TS

**Files:**
- Create: `frontend/src/features/community/community.types.ts`

- [ ] **Step 1: Criar tipos**

```typescript
// frontend/src/features/community/community.types.ts

export interface CommunityCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  order: number;
  only_admins: boolean;
}

export interface CommunityAuthor {
  id: string;
  full_name: string;
  email: string;
  company_name?: string;
}

export interface CommunityPost {
  id: string;
  category_id: string;
  author_id: string;
  company_id: string;
  title: string;
  content: string;
  upvotes: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_solved: boolean;
  hide_company: boolean;
  created_at: string;
  updated_at: string;
  category?: CommunityCategory;
  comment_count?: number;
  user_voted?: boolean; // computed client-side
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  upvotes: number;
  is_solution: boolean;
  created_at: string;
  replies?: CommunityComment[];
  user_voted?: boolean;
}

export type SortMode = 'recent' | 'popular';

export type ReputationLevel = 'Novato' | 'Contribuidor' | 'Especialista' | 'Embaixador';

export function getReputationLevel(points: number): ReputationLevel {
  if (points >= 500) return 'Embaixador';
  if (points >= 200) return 'Especialista';
  if (points >= 50) return 'Contribuidor';
  return 'Novato';
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/community/community.types.ts
git commit -m "feat(community): add TypeScript types for community module"
```

---

## Task 3: Hooks de dados

**Files:**
- Create: `frontend/src/features/community/hooks/usePosts.ts`
- Create: `frontend/src/features/community/hooks/useComments.ts`
- Create: `frontend/src/features/community/hooks/useVotes.ts`

- [ ] **Step 1: Criar `usePosts.ts`**

```typescript
// frontend/src/features/community/hooks/usePosts.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { CommunityPost, CommunityCategory, SortMode } from '../community.types';

export function usePosts(categoryId: string | null, searchQuery: string, sortMode: SortMode) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('community_categories')
      .select('*')
      .order('order');
    setCategories((data ?? []) as CommunityCategory[]);
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from('community_posts')
      .select('*, category:community_categories(*)');

    if (categoryId) query.eq('category_id', categoryId);
    if (searchQuery.trim()) query.ilike('title', `%${searchQuery}%`);

    if (sortMode === 'popular') {
      query.order('upvotes', { ascending: false });
    } else {
      query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    }

    const { data } = await query.limit(50);
    setPosts((data ?? []) as CommunityPost[]);
    setLoading(false);
  }, [categoryId, searchQuery, sortMode]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const createPost = async (
    title: string,
    content: string,
    categoryId: string,
    hideCompany: boolean
  ) => {
    const { error } = await supabase.from('community_posts').insert({
      title,
      content,
      category_id: categoryId,
      hide_company: hideCompany,
    });
    if (!error) fetchPosts();
    return { error };
  };

  return { posts, categories, loading, createPost, refetch: fetchPosts };
}
```

- [ ] **Step 2: Criar `useComments.ts`**

```typescript
// frontend/src/features/community/hooks/useComments.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { CommunityComment } from '../community.types';

export function useComments(postId: string | null) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .is('parent_id', null) // busca raízes; replies carregadas separado
      .order('is_solution', { ascending: false })
      .order('upvotes', { ascending: false });

    // Buscar replies para cada comentário raiz
    const roots = (data ?? []) as CommunityComment[];
    const withReplies = await Promise.all(roots.map(async (comment) => {
      const { data: replies } = await supabase
        .from('community_comments')
        .select('*')
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true });
      return { ...comment, replies: (replies ?? []) as CommunityComment[] };
    }));

    setComments(withReplies);
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Realtime
  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`community_comments:${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_comments',
        filter: `post_id=eq.${postId}`,
      }, () => { fetchComments(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId, fetchComments]);

  const addComment = async (content: string, parentId: string | null = null) => {
    const { error } = await supabase.from('community_comments').insert({
      post_id: postId,
      content,
      parent_id: parentId,
    });
    if (!error) fetchComments();
    return { error };
  };

  const markAsSolution = async (commentId: string) => {
    // Remove solução anterior do post
    await supabase
      .from('community_comments')
      .update({ is_solution: false })
      .eq('post_id', postId);
    // Marca novo
    await supabase
      .from('community_comments')
      .update({ is_solution: true })
      .eq('id', commentId);
    // Marca post como resolvido
    await supabase
      .from('community_posts')
      .update({ is_solved: true })
      .eq('id', postId);
    fetchComments();
  };

  return { comments, loading, addComment, markAsSolution };
}
```

- [ ] **Step 3: Criar `useVotes.ts`**

```typescript
// frontend/src/features/community/hooks/useVotes.ts
import { useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';

export function useVotes(userId: string | null) {
  const toggleVote = useCallback(async (
    targetType: 'post' | 'comment',
    targetId: string,
    currentlyVoted: boolean
  ) => {
    if (!userId) return;

    if (currentlyVoted) {
      // Remove voto
      await supabase
        .from('community_votes')
        .delete()
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      // Decrementa contador
      const table = targetType === 'post' ? 'community_posts' : 'community_comments';
      await supabase.rpc('decrement_upvotes', { table_name: table, row_id: targetId });
    } else {
      // Insere voto (constraint unique garante idempotência)
      await supabase.from('community_votes').insert({
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
      });

      // Incrementa contador
      const table = targetType === 'post' ? 'community_posts' : 'community_comments';
      await supabase.rpc('increment_upvotes', { table_name: table, row_id: targetId });
    }
  }, [userId]);

  const getUserVotes = useCallback(async (
    targetType: 'post' | 'comment',
    targetIds: string[]
  ): Promise<Set<string>> => {
    if (!userId || targetIds.length === 0) return new Set();
    const { data } = await supabase
      .from('community_votes')
      .select('target_id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .in('target_id', targetIds);
    return new Set((data ?? []).map((v: any) => v.target_id));
  }, [userId]);

  return { toggleVote, getUserVotes };
}
```

> **Nota:** As RPCs `increment_upvotes` / `decrement_upvotes` precisam ser criadas no Supabase. Alternativa mais simples: usar um UPDATE direto com `upvotes + 1`. Ver Task 3b abaixo.

- [ ] **Step 3b: Ajustar `useVotes.ts` para UPDATE direto (sem RPC)**

Substituir as chamadas `supabase.rpc(...)` por:

```typescript
// Em vez de rpc, usar raw SQL update:
// Para community_posts:
await supabase
  .from('community_posts')
  .update({ upvotes: supabase.raw('upvotes + 1') }) // não suportado no JS client

// Abordagem correta: criar RPC simples no Supabase:
```

Criar no Supabase SQL Editor:

```sql
create or replace function increment_post_upvotes(post_id uuid, delta int)
returns void language plpgsql as $$
begin
  update community_posts set upvotes = upvotes + delta where id = post_id;
end;
$$;

create or replace function increment_comment_upvotes(comment_id uuid, delta int)
returns void language plpgsql as $$
begin
  update community_comments set upvotes = upvotes + delta where id = comment_id;
end;
$$;
```

E atualizar `useVotes.ts`:

```typescript
// No lugar das chamadas rpc anteriores:
if (targetType === 'post') {
  await supabase.rpc('increment_post_upvotes', { post_id: targetId, delta: currentlyVoted ? -1 : 1 });
} else {
  await supabase.rpc('increment_comment_upvotes', { comment_id: targetId, delta: currentlyVoted ? -1 : 1 });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/community/hooks/
git commit -m "feat(community): add data hooks for posts, comments, and votes"
```

---

## Task 4: Componentes visuais base

**Files:**
- Create: `frontend/src/features/community/ReputationBadge.tsx`
- Create: `frontend/src/features/community/CategoryFilter.tsx`
- Create: `frontend/src/features/community/PostCard.tsx`

- [ ] **Step 1: Criar `ReputationBadge.tsx`**

```tsx
// frontend/src/features/community/ReputationBadge.tsx
import React from 'react';
import { getReputationLevel } from './community.types';

const colors = {
  Novato: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  Contribuidor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Especialista: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Embaixador: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

interface ReputationBadgeProps {
  points: number;
  size?: 'sm' | 'xs';
}

const ReputationBadge: React.FC<ReputationBadgeProps> = ({ points, size = 'sm' }) => {
  const level = getReputationLevel(points);
  return (
    <span className={`font-medium border rounded-full px-2 py-0.5 ${colors[level]} ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}>
      {level}
    </span>
  );
};

export default ReputationBadge;
```

- [ ] **Step 2: Criar `CategoryFilter.tsx`**

```tsx
// frontend/src/features/community/CategoryFilter.tsx
import React from 'react';
import type { CommunityCategory } from './community.types';

interface CategoryFilterProps {
  categories: CommunityCategory[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selected, onSelect }) => (
  <div className="flex flex-wrap gap-2">
    <button
      onClick={() => onSelect(null)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        selected === null
          ? 'bg-blue-950/40 border-blue-500/30 text-blue-400'
          : 'border-slate-700 text-slate-500 hover:text-white hover:bg-white/5'
      }`}
    >
      Todos
    </button>
    {categories.map(cat => (
      <button
        key={cat.id}
        onClick={() => onSelect(cat.id)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          selected === cat.id
            ? 'bg-blue-950/40 border-blue-500/30 text-blue-400'
            : 'border-slate-700 text-slate-500 hover:text-white hover:bg-white/5'
        }`}
      >
        {cat.name}
      </button>
    ))}
  </div>
);

export default CategoryFilter;
```

- [ ] **Step 3: Criar `PostCard.tsx`**

```tsx
// frontend/src/features/community/PostCard.tsx
import React from 'react';
import { ThumbsUp, MessageSquare, Pin, CheckCircle2 } from 'lucide-react';
import type { CommunityPost } from './community.types';
import ReputationBadge from './ReputationBadge';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

interface PostCardProps {
  post: CommunityPost;
  authorName: string;
  authorPoints?: number;
  onClick: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, authorName, authorPoints = 0, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-4 px-5 py-4 bg-[#0B1220] border border-slate-800 rounded-xl text-left hover:border-blue-500/30 hover:bg-blue-950/10 transition-all group"
  >
    {/* Upvotes */}
    <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
      <ThumbsUp className={`w-4 h-4 ${post.user_voted ? 'text-blue-400' : 'text-slate-600'}`} />
      <span className="text-xs font-semibold text-slate-400">{post.upvotes}</span>
    </div>

    {/* Content */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {post.is_pinned && <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />}
        {post.is_solved && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
        <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 truncate transition-colors">
          {post.title}
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {post.category && (
          <span className="text-blue-400/70">{post.category.name}</span>
        )}
        <span>{authorName}</span>
        <ReputationBadge points={authorPoints} size="xs" />
        <span>{timeAgo(post.created_at)}</span>
      </div>
    </div>

    {/* Comment count */}
    <div className="flex items-center gap-1 text-slate-600 flex-shrink-0 pt-0.5">
      <MessageSquare className="w-3.5 h-3.5" />
      <span className="text-xs">{post.comment_count ?? 0}</span>
    </div>
  </button>
);

export default PostCard;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/community/ReputationBadge.tsx frontend/src/features/community/CategoryFilter.tsx frontend/src/features/community/PostCard.tsx
git commit -m "feat(community): add ReputationBadge, CategoryFilter, and PostCard components"
```

---

## Task 5: NewPostModal + CommentThread

**Files:**
- Create: `frontend/src/features/community/NewPostModal.tsx`
- Create: `frontend/src/features/community/CommentThread.tsx`

- [ ] **Step 1: Criar `NewPostModal.tsx`**

```tsx
// frontend/src/features/community/NewPostModal.tsx
import React, { useState } from 'react';
import { X, Edit3, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { CommunityCategory } from './community.types';

interface NewPostModalProps {
  categories: CommunityCategory[];
  onSubmit: (title: string, content: string, categoryId: string, hideCompany: boolean) => Promise<void>;
  onClose: () => void;
}

const NewPostModal: React.FC<NewPostModalProps> = ({ categories, onSubmit, onClose }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [hideCompany, setHideCompany] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filtrar categorias onde o usuário pode postar (only_admins = false por padrão)
  const postableCategories = categories.filter(c => !c.only_admins);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) return;
    setLoading(true);
    await onSubmit(title.trim(), content.trim(), categoryId, hideCompany);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0B1220] border border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-white font-semibold">Novo Post</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 overflow-y-auto flex-1">
          <div>
            <label className="text-sm text-slate-400 block mb-1.5">Título *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Descreva seu post em uma frase..."
              className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-500"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1.5">Categoria *</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {postableCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-slate-400">Conteúdo * (Markdown suportado)</label>
              <button
                type="button"
                onClick={() => setPreviewMode(p => !p)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
              >
                {previewMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {previewMode ? 'Editar' : 'Preview'}
              </button>
            </div>
            {previewMode ? (
              <div className="min-h-[180px] bg-slate-900/40 border border-white/10 rounded-lg p-4 prose prose-invert prose-sm max-w-none text-slate-300">
                <ReactMarkdown>{content || '*Sem conteúdo ainda...*'}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Escreva aqui... use **negrito**, _itálico_, `código`"
                rows={7}
                className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-500 resize-none font-mono"
                required
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={hideCompany}
              onChange={e => setHideCompany(e.target.checked)}
              className="rounded border-slate-600"
            />
            Ocultar nome da empresa neste post
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:text-white hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              {loading ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPostModal;
```

- [ ] **Step 2: Criar `CommentThread.tsx`**

```tsx
// frontend/src/features/community/CommentThread.tsx
import React, { useState } from 'react';
import { ThumbsUp, CheckCircle2, CornerDownRight, Send } from 'lucide-react';
import type { CommunityComment } from './community.types';

interface CommentItemProps {
  comment: CommunityComment;
  isPostAuthor: boolean;
  currentUserId: string;
  onVote: (commentId: string, voted: boolean) => void;
  onMarkSolution: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment, isPostAuthor, currentUserId, onVote, onMarkSolution, onReply, depth = 0,
}) => {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReply(false);
  };

  return (
    <div className={`flex flex-col gap-2 ${depth > 0 ? 'ml-6 border-l border-slate-800 pl-4' : ''}`}>
      <div className={`p-4 rounded-xl border ${comment.is_solution ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-slate-900/40 border-slate-800'}`}>
        {comment.is_solution && (
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Solução marcada
          </div>
        )}
        <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={() => onVote(comment.id, comment.user_voted ?? false)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              comment.user_voted ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {comment.upvotes}
          </button>
          {depth === 0 && (
            <button
              onClick={() => setShowReply(s => !s)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              Responder
            </button>
          )}
          {isPostAuthor && !comment.is_solution && (
            <button
              onClick={() => onMarkSolution(comment.id)}
              className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 transition-colors ml-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marcar como solução
            </button>
          )}
        </div>
      </div>

      {showReply && (
        <div className="flex gap-2 ml-6">
          <input
            type="text"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleReply()}
            placeholder="Escrever resposta..."
            className="flex-1 bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-500"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {comment.replies?.map(reply => (
        <CommentItem
          key={reply.id}
          comment={reply}
          isPostAuthor={isPostAuthor}
          currentUserId={currentUserId}
          onVote={onVote}
          onMarkSolution={onMarkSolution}
          onReply={onReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

interface CommentThreadProps {
  comments: CommunityComment[];
  postAuthorId: string;
  currentUserId: string;
  onVote: (commentId: string, voted: boolean) => void;
  onMarkSolution: (commentId: string) => void;
  onReply: (parentId: string | null, content: string) => void;
}

const CommentThread: React.FC<CommentThreadProps> = ({
  comments, postAuthorId, currentUserId, onVote, onMarkSolution, onReply,
}) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onReply(null, newComment.trim());
    setNewComment('');
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-slate-400">
        {comments.length} comentário{comments.length !== 1 ? 's' : ''}
      </h3>

      {/* New comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          placeholder="Adicionar comentário..."
          className="flex-1 bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-500"
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {comments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          isPostAuthor={postAuthorId === currentUserId}
          currentUserId={currentUserId}
          onVote={onVote}
          onMarkSolution={onMarkSolution}
          onReply={(parentId, content) => onReply(parentId, content)}
        />
      ))}
    </div>
  );
};

export default CommentThread;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/community/NewPostModal.tsx frontend/src/features/community/CommentThread.tsx
git commit -m "feat(community): add NewPostModal and CommentThread components"
```

---

## Task 6: PostDetail + CommunityPage

**Files:**
- Create: `frontend/src/features/community/PostDetail.tsx`
- Create: `frontend/src/features/community/CommunityPage.tsx`

- [ ] **Step 1: Criar `PostDetail.tsx`**

```tsx
// frontend/src/features/community/PostDetail.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ThumbsUp, CheckCircle2 } from 'lucide-react';
import { useComments } from './hooks/useComments';
import { useVotes } from './hooks/useVotes';
import CommentThread from './CommentThread';
import ReputationBadge from './ReputationBadge';
import type { CommunityPost } from './community.types';

interface PostDetailProps {
  post: CommunityPost;
  authorName: string;
  authorPoints?: number;
  currentUserId: string;
  onBack: () => void;
  onPostVote: (postId: string, voted: boolean) => void;
}

const PostDetail: React.FC<PostDetailProps> = ({
  post, authorName, authorPoints = 0, currentUserId, onBack, onPostVote,
}) => {
  const { comments, addComment, markAsSolution } = useComments(post.id);
  const { toggleVote } = useVotes(currentUserId);

  const handleCommentVote = async (commentId: string, voted: boolean) => {
    await toggleVote('comment', commentId, voted);
  };

  const handleReply = async (parentId: string | null, content: string) => {
    await addComment(content, parentId);
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao feed
      </button>

      <div className="bg-[#0B1220] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
            <button
              onClick={() => onPostVote(post.id, post.user_voted ?? false)}
              className={`transition-colors ${post.user_voted ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
            >
              <ThumbsUp className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-slate-400">{post.upvotes}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {post.category && (
                <span className="text-xs text-blue-400 font-medium">{post.category.name}</span>
              )}
              {post.is_solved && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolvido
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-white mb-4">{post.title}</h1>

            <div className="prose prose-invert prose-sm max-w-none text-slate-300 mb-4">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{authorName}</span>
              <ReputationBadge points={authorPoints} size="xs" />
              <span>·</span>
              <span>{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>

      <CommentThread
        comments={comments}
        postAuthorId={post.author_id}
        currentUserId={currentUserId}
        onVote={handleCommentVote}
        onMarkSolution={markAsSolution}
        onReply={handleReply}
      />
    </div>
  );
};

export default PostDetail;
```

- [ ] **Step 2: Criar `CommunityPage.tsx`**

```tsx
// frontend/src/features/community/CommunityPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Users, Search, Plus, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '@/src/features/auth/AuthContext';
import { usePosts } from './hooks/usePosts';
import { useVotes } from './hooks/useVotes';
import CategoryFilter from './CategoryFilter';
import PostCard from './PostCard';
import PostDetail from './PostDetail';
import NewPostModal from './NewPostModal';
import type { CommunityPost, SortMode } from './community.types';

const CommunityPage: React.FC = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? null;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { posts, categories, loading, createPost, refetch } = usePosts(selectedCategory, search, sortMode);
  const { toggleVote } = useVotes(userId);

  const sortTabs: { key: SortMode; label: string; icon: React.ElementType }[] = [
    { key: 'recent', label: 'Recente', icon: Clock },
    { key: 'popular', label: 'Popular', icon: TrendingUp },
  ];

  useEffect(() => {
    const idx = sortTabs.findIndex(t => t.key === sortMode);
    const el = tabRefs.current[idx];
    if (el) setPillStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [sortMode]);

  const handlePostVote = async (postId: string, voted: boolean) => {
    await toggleVote('post', postId, voted);
    refetch();
  };

  if (selectedPost) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <PostDetail
          post={selectedPost}
          authorName="Usuário" // TODO: buscar nome real via profiles
          currentUserId={userId ?? ''}
          onBack={() => setSelectedPost(null)}
          onPostVote={handlePostVote}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 mb-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-900/20 cursor-default">
            <Users className="w-4 h-4" />
            <span>Comunidade</span>
          </button>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Post
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar posts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0B1220] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-500"
        />
      </div>

      {/* Sort + Category */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Sort sliding pill */}
        <div className="relative bg-slate-900/60 border border-blue-500/10 rounded-xl p-1 flex">
          <div
            className="absolute top-1 bottom-1 bg-blue-500/10 border border-blue-500/20 rounded-lg transition-all duration-300 pointer-events-none"
            style={{ left: pillStyle.left, width: pillStyle.width }}
          />
          {sortTabs.map((tab, idx) => (
            <button
              key={tab.key}
              ref={el => { tabRefs.current[idx] = el; }}
              onClick={() => setSortMode(tab.key)}
              className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                sortMode === tab.key ? 'text-blue-400' : 'text-slate-500 hover:text-white'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {/* Posts feed */}
      {loading ? (
        <div className="text-slate-500 text-sm">Carregando posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          {search ? 'Nenhum post encontrado.' : 'Seja o primeiro a postar nesta categoria!'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              authorName="Usuário" // TODO: buscar nome real via profiles
              onClick={() => setSelectedPost(post)}
            />
          ))}
        </div>
      )}

      {showNewPost && (
        <NewPostModal
          categories={categories}
          onSubmit={async (title, content, catId, hideCompany) => {
            await createPost(title, content, catId, hideCompany);
            setShowNewPost(false);
          }}
          onClose={() => setShowNewPost(false)}
        />
      )}
    </div>
  );
};

export default CommunityPage;
```

> **Nota sobre nomes de autores:** O Supabase não expõe `auth.users` diretamente no cliente. Para buscar nomes reais, criar uma view ou RPC `get_profile(user_id)` que retorne `full_name` da tabela `profiles` (ou equivalente no projeto). Substituir `"Usuário"` hardcoded quando a função existir.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/community/PostDetail.tsx frontend/src/features/community/CommunityPage.tsx
git commit -m "feat(community): add PostDetail and CommunityPage components"
```

---

## Task 7: Index + Sidebar + AppRouter

**Files:**
- Create: `frontend/src/features/community/index.ts`
- Modify: `frontend/src/app/Sidebar.tsx`
- Modify: `frontend/src/app/AppRouter.tsx`

- [ ] **Step 1: Criar `index.ts`**

```typescript
// frontend/src/features/community/index.ts
export { default as CommunityPage } from './CommunityPage';
export { useVotes } from './hooks/useVotes';
export { usePosts } from './hooks/usePosts';
```

- [ ] **Step 2: Adicionar item no Sidebar**

Em `frontend/src/app/Sidebar.tsx`:

```typescript
// Import:
import { Users2 } from 'lucide-react';

// Adicionar no array de navItems (visível para todos os roles):
{ icon: Users2, label: 'Comunidade' },
```

- [ ] **Step 3: Adicionar rota no AppRouter**

```typescript
// Import:
import CommunityPage from '@/src/features/community/CommunityPage';

// Case:
case 'Comunidade':
  return <CommunityPage />;
```

- [ ] **Step 4: Verificar no navegador**
  - Sidebar mostra item "Comunidade"
  - Feed carrega (vazio inicialmente — criar post de teste)
  - Filtros por categoria funcionam
  - Toggle Recente/Popular funciona
  - Criar post → aparece no feed
  - Abrir post → ver detalhe, comentar, upvotar

- [ ] **Step 5: Commit final**

```bash
git add frontend/src/features/community/index.ts frontend/src/app/Sidebar.tsx frontend/src/app/AppRouter.tsx
git commit -m "feat(community): wire community module into sidebar and router"
git push origin main
```

---

## Checklist de Verificação Final

- [ ] Migration 079 aplicada — 4 tabelas + 4 categorias seed
- [ ] RPCs `increment_post_upvotes` e `increment_comment_upvotes` criadas
- [ ] Feed cross-empresa: usuários de empresas diferentes veem os mesmos posts (testar com 2 contas)
- [ ] Filtro por categoria funciona
- [ ] Toggle Recente/Popular funciona
- [ ] Upvote em post incrementa contador e não duplica (votar novamente remove)
- [ ] Criar comentário e reply aninhado funciona
- [ ] Marcar comentário como solução: post vira "Resolvido" no feed
- [ ] Categoria "Novidades" não aparece para criar post (only_admins = true)
- [ ] `hide_company = true` → empresa não aparece no PostCard
- [ ] `react-markdown` renderiza corretamente negrito, código, listas
