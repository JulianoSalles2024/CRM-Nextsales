-- supabase/migrations/080_support_module.sql

-- Categorias (compartilhadas entre artigos e tickets)
create table if not exists support_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  "order" int default 0,
  created_at timestamptz default now()
);

-- Artigos da Central de Ajuda
create table if not exists support_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references support_categories(id) on delete set null,
  title text not null,
  content text not null,
  slug text unique not null,
  published boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tickets
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id(),
  opened_by uuid not null default auth.uid() references auth.users(id),
  subject text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  category_id uuid references support_categories(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Mensagens dos tickets
create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id),
  content text not null,
  is_internal boolean default false,
  created_at timestamptz default now()
);

-- Indexes for most-queried FKs
create index if not exists support_messages_ticket_id_idx on support_messages(ticket_id);
create index if not exists support_tickets_company_id_idx on support_tickets(company_id);

-- RLS: support_categories
alter table support_categories enable row level security;
drop policy if exists "authenticated_read_categories" on support_categories;
create policy "authenticated_read_categories" on support_categories
  for select using (auth.role() = 'authenticated');

-- RLS: support_articles
alter table support_articles enable row level security;
drop policy if exists "authenticated_read_articles" on support_articles;
create policy "authenticated_read_articles" on support_articles
  for select using (auth.role() = 'authenticated' and published = true);

-- RLS: support_tickets
-- Nota: admin vs seller distinguido no frontend (hook filtra por opened_by para sellers).
-- RLS garante isolamento por empresa; admin_update_ticket restrito a usuários com role 'admin'
-- usando public.my_role() (SECURITY DEFINER, definida em 001_init.sql).
alter table support_tickets enable row level security;
drop policy if exists "company_read_tickets" on support_tickets;
create policy "company_read_tickets" on support_tickets
  for select using (company_id = my_company_id());
drop policy if exists "company_insert_ticket" on support_tickets;
create policy "company_insert_ticket" on support_tickets
  for insert with check (company_id = my_company_id());
drop policy if exists "admin_update_ticket" on support_tickets;
create policy "admin_update_ticket" on support_tickets
  for update using (company_id = my_company_id() and public.my_role() = 'admin');

-- RLS: support_messages
alter table support_messages enable row level security;
drop policy if exists "ticket_company_read_messages" on support_messages;
create policy "ticket_company_read_messages" on support_messages
  for select using (
    exists (
      select 1 from support_tickets t
      where t.id = ticket_id and t.company_id = my_company_id()
    )
  );
drop policy if exists "ticket_company_insert_message" on support_messages;
create policy "ticket_company_insert_message" on support_messages
  for insert with check (
    exists (
      select 1 from support_tickets t
      where t.id = ticket_id and t.company_id = my_company_id()
    )
  );

-- Seed: categorias iniciais
insert into support_categories (name, icon, "order") values
  ('Primeiros Passos', 'rocket', 1),
  ('Pipeline e Leads', 'funnel', 2),
  ('Agentes de IA', 'bot', 3),
  ('Omnichannel / Inbox', 'inbox', 4),
  ('Relatórios', 'bar-chart', 5),
  ('Configurações', 'settings', 6)
on conflict (name) do nothing;

-- Seed: artigo de boas-vindas publicado
insert into support_articles (category_id, title, content, slug, published)
select
  id,
  'Bem-vindo ao NextSales',
  '## Bem-vindo ao NextSales!\n\nEsta é a Central de Ajuda da plataforma.\n\n### Como navegar\n\n- Use o menu lateral para acessar as diferentes seções\n- Pipeline: gerencie seus leads e oportunidades\n- Omnichannel: gerencie conversas do WhatsApp\n- Agentes de IA: configure automações inteligentes\n\n### Precisa de ajuda?\n\nAbra um chamado clicando no botão **?** no canto inferior direito da tela.',
  'bem-vindo-ao-nextsales',
  true
from support_categories where name = 'Primeiros Passos'
on conflict (slug) do nothing;
