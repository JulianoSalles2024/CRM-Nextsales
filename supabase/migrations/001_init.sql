-- ============================================================
-- CRM Zenius — Schema inicial completo
-- Migration: 001_init
-- Fonte canônica para novas instalações.
-- Cada objeto usa IF NOT EXISTS / CREATE OR REPLACE para ser
-- seguro em re-execução (idempotente).
-- O registro em schema_migrations é feito pelo TypeScript após
-- execução bem-sucedida — não por este arquivo.
-- ============================================================

-- ── Reset: garante estado limpo para nova instalação ─────────
-- Tabelas em ordem reversa de dependência; CASCADE remove FK deps.
drop table if exists public.organization_ai_credentials cascade;
drop table if exists public.seller_scores  cascade;
drop table if exists public.invites        cascade;
drop table if exists public.sales          cascade;
drop table if exists public.activities     cascade;
drop table if exists public.tasks          cascade;
drop table if exists public.goals          cascade;
drop table if exists public.leads          cascade;
drop table if exists public.board_stages   cascade;
drop table if exists public.boards         cascade;
drop table if exists public.contacts       cascade;
drop table if exists public.profiles       cascade;
drop table if exists public.companies      cascade;
drop table if exists public.schema_migrations cascade;

drop function if exists public.handle_new_user()                  cascade;
drop function if exists public.bootstrap_company_for_new_user()   cascade;
drop function if exists public.set_updated_at()                   cascade;
drop function if exists public.my_company_id()                    cascade;
drop function if exists public.enforce_company_id()               cascade;
drop function if exists public.fill_sale_company_id()             cascade;
drop function if exists public.validate_invite(text)              cascade;
drop function if exists public.activate_goal(uuid, uuid)          cascade;

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Tracking table ───────────────────────────────────────────
create table if not exists schema_migrations (
  version     text        primary key,
  executed_at timestamptz not null default now()
);

-- ── set_updated_at trigger function ─────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 1. companies ─────────────────────────────────────────────
create table if not exists companies (
  id         uuid        primary key default uuid_generate_v4(),
  name       text        not null,
  slug       text        unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_companies_updated_at on companies;
create trigger set_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

alter table companies enable row level security;

-- NOTE: policy "Companies: members can read own" is created after profiles table below.

-- ── 2. profiles (users) ──────────────────────────────────────
create table if not exists profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  company_id  uuid        references companies(id) on delete set null,
  full_name   text,
  role        text        not null default 'user' check (role in ('admin','seller','user')),
  is_active   boolean     not null default true,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Profiles: user reads own'
  ) then
    create policy "Profiles: user reads own"
      on profiles for select
      using (id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Profiles: admin reads company'
  ) then
    create policy "Profiles: admin reads company"
      on profiles for select
      using (
        company_id in (
          select company_id from profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Profiles: user updates own'
  ) then
    create policy "Profiles: user updates own"
      on profiles for update
      using (id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Profiles: admin manages company'
  ) then
    create policy "Profiles: admin manages company"
      on profiles for all
      using (
        company_id in (
          select company_id from profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end $$;

-- Policy companies depende de profiles — criada aqui após profiles existir.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'companies' and policyname = 'Companies: members can read own'
  ) then
    create policy "Companies: members can read own"
      on companies for select
      using (
        id in (
          select company_id from profiles
          where id = auth.uid()
        )
      );
  end if;
end $$;

-- ── 3. my_company_id() helper ────────────────────────────────
-- Returns the company_id of the currently authenticated user.
-- SECURITY DEFINER avoids recursive RLS self-joins.
-- Used by RLS policies and the enforce_company_id trigger.
create or replace function public.my_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- ── 4. invites ───────────────────────────────────────────────
create table if not exists invites (
  id          uuid        primary key default uuid_generate_v4(),
  company_id  uuid        not null references companies(id) on delete cascade,
  token       text        not null unique,
  role        text        not null default 'seller' check (role in ('admin','seller')),
  expires_at  timestamptz,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table invites enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'invites' and policyname = 'Invites: admin manages own company'
  ) then
    create policy "Invites: admin manages own company"
      on invites for all
      using (
        company_id = public.my_company_id()
        and exists (
          select 1 from profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'invites' and policyname = 'Invites: anon can read by token'
  ) then
    create policy "Invites: anon can read by token"
      on invites for select
      to anon
      using (true);
  end if;
end $$;

-- ── 5. contacts ──────────────────────────────────────────────
create table if not exists contacts (
  id          uuid        primary key default uuid_generate_v4(),
  company_id  uuid        not null references companies(id) on delete cascade,
  name        text        not null,
  email       text,
  phone       text,
  document    text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_contacts_updated_at on contacts;
create trigger set_contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();

alter table contacts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'contacts' and policyname = 'Contacts: company members'
  ) then
    create policy "Contacts: company members"
      on contacts for all
      using (
        company_id in (
          select company_id from profiles
          where id = auth.uid()
        )
      );
  end if;
end $$;

-- ── 6. boards (pipelines) ────────────────────────────────────
create table if not exists boards (
  id          uuid        primary key default uuid_generate_v4(),
  company_id  uuid        not null references companies(id) on delete cascade,
  name        text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_boards_updated_at on boards;
create trigger set_boards_updated_at
  before update on boards
  for each row execute function set_updated_at();

alter table boards enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'boards' and policyname = 'Boards: company members'
  ) then
    create policy "Boards: company members"
      on boards for all
      using (
        company_id in (
          select company_id from profiles
          where id = auth.uid()
        )
      );
  end if;
end $$;

-- ── 7. board_stages (pipeline stages) ───────────────────────
create table if not exists board_stages (
  id                     uuid    primary key default uuid_generate_v4(),
  board_id               uuid    not null references boards(id) on delete cascade,
  title                  text    not null,
  position               integer not null default 0,
  linked_lifecycle_stage text,
  color                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

drop trigger if exists set_board_stages_updated_at on board_stages;
create trigger set_board_stages_updated_at
  before update on board_stages
  for each row execute function set_updated_at();

alter table board_stages enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'board_stages' and policyname = 'BoardStages: company members'
  ) then
    create policy "BoardStages: company members"
      on board_stages for all
      using (
        board_id in (
          select b.id from boards b
          join profiles p on p.company_id = b.company_id
          where p.id = auth.uid()
        )
      );
  end if;
end $$;

-- ── 8. leads (deals) ─────────────────────────────────────────
create table if not exists leads (
  id            uuid        primary key default uuid_generate_v4(),
  company_id    uuid        not null references companies(id) on delete cascade,
  board_id      uuid        references boards(id) on delete set null,
  stage_id      uuid        references board_stages(id) on delete set null,
  owner_id      uuid        references profiles(id) on delete set null,
  contact_id    uuid        references contacts(id) on delete set null,
  name          text        not null,
  value         numeric(14,2),
  status        text        not null default 'Ativo',
  is_archived   boolean     not null default false,
  deleted_at    timestamptz,
  won_at        timestamptz,
  lost_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists set_leads_updated_at on leads;
create trigger set_leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

alter table leads enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'leads' and policyname = 'Leads: company members'
  ) then
    create policy "Leads: company members"
      on leads for all
      using (
        company_id in (
          select company_id from profiles
          where id = auth.uid()
        )
      );
  end if;
end $$;

-- ── 9. activities ─────────────────────────────────────────────
create table if not exists activities (
  id          uuid        primary key default uuid_generate_v4(),
  company_id  uuid        not null references companies(id) on delete cascade,
  lead_id     uuid        references leads(id) on delete cascade,
  user_id     uuid        references profiles(id) on delete set null,
  type        text        not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_activities_updated_at on activities;
create trigger set_activities_updated_at
  before update on activities
  for each row execute function set_updated_at();

alter table activities enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'activities' and policyname = 'Activities: company members'
  ) then
    create policy "Activities: company members"
      on activities for all
      using (
        company_id in (
          select company_id from profiles
          where id = auth.uid()
        )
      );
  end if;
end $$;

-- ── 10. tasks ─────────────────────────────────────────────────
create table if not exists tasks (
  id          uuid        primary key default uuid_generate_v4(),
  company_id  uuid        not null references companies(id) on delete cascade,
  lead_id     uuid        references leads(id) on delete cascade,
  assigned_to uuid        references profiles(id) on delete set null,
  title       text        not null,
  description text,
  due_date    date,
  is_done     boolean     not null default false,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_tasks_updated_at on tasks;
create trigger set_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

alter table tasks enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'tasks' and policyname = 'Tasks: company members'
  ) then
    create policy "Tasks: company members"
      on tasks for all
      using (
        company_id in (
          select company_id from profiles
          where id = auth.uid()
        )
      );
  end if;
end $$;

-- ── 11. goals ─────────────────────────────────────────────────
create table if not exists goals (
  id          uuid          primary key default uuid_generate_v4(),
  company_id  uuid          not null references companies(id) on delete cascade,
  user_id     uuid          references profiles(id) on delete cascade,
  name        text,
  goal_type   text,
  period_type text,
  goal_value  numeric(14,2) not null default 0,
  start_date  date          not null,
  end_date    date          not null,
  is_active   boolean       not null default false,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

drop trigger if exists set_goals_updated_at on goals;
create trigger set_goals_updated_at
  before update on goals
  for each row execute function set_updated_at();

alter table goals enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'goals' and policyname = 'Goals: company members'
  ) then
    create policy "Goals: company members"
      on goals for all
      using (
        company_id in (
          select company_id from profiles
          where id = auth.uid()
        )
      );
  end if;
end $$;

-- ── 12. sales ─────────────────────────────────────────────────
create table if not exists sales (
  id               uuid        primary key default uuid_generate_v4(),
  company_id       uuid        not null references companies(id) on delete cascade,
  lead_id          uuid        references leads(id) on delete set null,
  seller_id        uuid        references profiles(id) on delete set null,
  amount           numeric(14,2) not null,
  data_fechamento  date        not null,
  client_name      text        not null default '',
  product_type     text,
  bank             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists set_sales_updated_at on sales;
create trigger set_sales_updated_at
  before update on sales
  for each row execute function set_updated_at();

alter table sales enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'sales' and policyname = 'Sales: company members'
  ) then
    create policy "Sales: company members"
      on sales for all
      using (
        company_id in (
          select company_id from profiles
          where id = auth.uid()
        )
      );
  end if;
end $$;

-- Trigger: auto-fill company_id on sales insert from seller profile
create or replace function public.fill_sale_company_id()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.company_id is null then
    select company_id into new.company_id
    from public.profiles
    where id = new.seller_id;
  end if;
  return new;
end;
$$;

drop trigger if exists fill_sale_company_id_trigger on public.sales;
create trigger fill_sale_company_id_trigger
  before insert on public.sales
  for each row execute function public.fill_sale_company_id();

-- ── 13. seller_scores ─────────────────────────────────────────
create table if not exists public.seller_scores (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid not null references public.profiles(id) on delete cascade,
  company_id     uuid references public.companies(id) on delete cascade,
  score          numeric(5,2) not null default 0 check (score >= 0 and score <= 100),
  period         text not null,
  breakdown_json jsonb not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(seller_id, period)
);

drop trigger if exists set_seller_scores_updated_at on public.seller_scores;
create trigger set_seller_scores_updated_at
  before update on public.seller_scores
  for each row execute function set_updated_at();

alter table public.seller_scores enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'seller_scores' and policyname = 'SellerScores: own or same company'
  ) then
    create policy "SellerScores: own or same company"
      on public.seller_scores for select
      using (
        seller_id = auth.uid()
        or company_id = public.my_company_id()
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'seller_scores' and policyname = 'SellerScores: insert own'
  ) then
    create policy "SellerScores: insert own"
      on public.seller_scores for insert
      with check (seller_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'seller_scores' and policyname = 'SellerScores: update own'
  ) then
    create policy "SellerScores: update own"
      on public.seller_scores for update
      using (seller_id = auth.uid());
  end if;
end $$;

-- ── 14. Trigger: handle_new_user ─────────────────────────────
-- Cria perfil automaticamente ao registrar usuário no Supabase Auth.
-- Lê role de raw_user_meta_data (passado pelo installer ou pelo signUp).
-- Fallback: 'user' quando role não é informado.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        role      = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 15. Trigger: bootstrap_company_for_new_user ──────────────
-- Quando o primeiro admin é criado sem company_id,
-- cria uma empresa padrão e associa o perfil.
create or replace function public.bootstrap_company_for_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if new.role = 'admin' and new.company_id is null then
    insert into public.companies (name)
    values ('Minha Empresa')
    returning id into v_company_id;

    update public.profiles
    set company_id = v_company_id
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_bootstrap_company on public.profiles;
create trigger on_profile_bootstrap_company
  after insert on public.profiles
  for each row execute function public.bootstrap_company_for_new_user();

-- ── 16. enforce_company_id trigger ───────────────────────────
-- Stamps company_id server-side on INSERT for leads, tasks, activities.
-- Prevents mismatch between frontend state and DB isolation.
create or replace function public.enforce_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  v_company_id := public.my_company_id();

  if v_company_id is null then
    raise exception
      'Usuário % não possui company_id. Contate o administrador.',
      auth.uid()
      using errcode = 'P0001';
  end if;

  new.company_id := v_company_id;
  return new;
end;
$$;

drop trigger if exists trg_enforce_company_id on public.leads;
create trigger trg_enforce_company_id
  before insert on public.leads
  for each row execute function public.enforce_company_id();

drop trigger if exists trg_enforce_company_id on public.tasks;
create trigger trg_enforce_company_id
  before insert on public.tasks
  for each row execute function public.enforce_company_id();

drop trigger if exists trg_enforce_company_id on public.activities;
create trigger trg_enforce_company_id
  before insert on public.activities
  for each row execute function public.enforce_company_id();

-- ── 17. validate_invite RPC ───────────────────────────────────
-- Allows anon/authenticated to verify an invite token.
drop function if exists public.validate_invite(text) cascade;

create or replace function public.validate_invite(p_token text)
returns table (role text, company_id uuid, expires_at timestamptz, used_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select role, company_id, expires_at, used_at
  from public.invites
  where token = p_token
  limit 1;
$$;

grant execute on function public.validate_invite(text) to anon;
grant execute on function public.validate_invite(text) to authenticated;

-- ── 18. organization_ai_credentials ──────────────────────────
create table if not exists public.organization_ai_credentials (
  id              uuid        primary key default uuid_generate_v4(),
  organization_id uuid        not null references public.companies(id) on delete cascade,
  ai_provider     text        not null,
  ai_api_key      text        not null,
  model           text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(organization_id, ai_provider)
);

alter table public.organization_ai_credentials enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'organization_ai_credentials' and policyname = 'AI Credentials: admin manages own company'
  ) then
    create policy "AI Credentials: admin manages own company"
      on public.organization_ai_credentials for all
      using (
        organization_id = public.my_company_id()
        and exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end $$;

-- ── 19. activate_goal RPC ─────────────────────────────────────
-- Ativa uma meta e desativa as demais do mesmo usuário/empresa.
create or replace function public.activate_goal(p_goal_id uuid, p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.goals where id = p_goal_id;

  -- Desativa todas as outras metas do mesmo escopo (usuário ou global)
  update public.goals
  set is_active = false
  where company_id = p_company_id
    and id != p_goal_id
    and (
      (v_user_id is null and user_id is null) or
      (v_user_id is not null and user_id = v_user_id)
    );

  -- Ativa a meta selecionada
  update public.goals
  set is_active = true
  where id = p_goal_id
    and company_id = p_company_id;
end;
$$;

grant execute on function public.activate_goal(uuid, uuid) to authenticated;

-- ── 21. Performance indexes ───────────────────────────────────
create index if not exists idx_profiles_company    on profiles(company_id);
create index if not exists idx_contacts_company    on contacts(company_id);
create index if not exists idx_leads_company       on leads(company_id);
create index if not exists idx_tasks_company       on tasks(company_id);
create index if not exists idx_activities_company  on activities(company_id);
create index if not exists idx_sales_company       on sales(company_id);
create index if not exists idx_goals_company       on goals(company_id);
create index if not exists idx_invites_company     on invites(company_id);
create index if not exists idx_invites_token       on invites(token);
create index if not exists idx_seller_scores_seller  on public.seller_scores(seller_id);
create index if not exists idx_seller_scores_period  on public.seller_scores(period);
create index if not exists idx_seller_scores_company on public.seller_scores(company_id);

create index if not exists idx_leads_stage   on leads(stage_id);
create index if not exists idx_leads_owner   on leads(owner_id);
create index if not exists idx_sales_seller  on sales(seller_id);
create index if not exists idx_sales_date    on sales(data_fechamento);
