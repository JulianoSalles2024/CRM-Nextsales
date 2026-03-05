-- ============================================================
-- Migration: 002_backfill_missing_objects
--
-- Compatibilidade com instalações que rodaram o installer antigo.
-- O installer antigo entregava um 001_init limitado que não criava:
--   - tabela invites
--   - tabela seller_scores
--   - função my_company_id()
--   - trigger fill_sale_company_id (sales)
--   - trigger enforce_company_id (leads, tasks, activities)
--   - RPC validate_invite
--   - coluna client_name em sales
--
-- Para instalações NOVAS (que rodaram o 001_init completo):
--   todos os comandos aqui são no-ops (IF NOT EXISTS / CREATE OR REPLACE).
--
-- Para instalações ANTIGAS:
--   esta migration completa o schema de forma segura.
-- ============================================================

-- ── my_company_id() ──────────────────────────────────────────
-- Necessária antes de qualquer objeto que a referencia.
create or replace function public.my_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- ── invites ───────────────────────────────────────────────────
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

create index if not exists idx_invites_company on invites(company_id);
create index if not exists idx_invites_token   on invites(token);

-- ── client_name em sales ──────────────────────────────────────
alter table public.sales
  add column if not exists client_name text not null default '';

-- ── fill_sale_company_id trigger ─────────────────────────────
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

-- ── seller_scores ─────────────────────────────────────────────
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

create index if not exists idx_seller_scores_seller  on public.seller_scores(seller_id);
create index if not exists idx_seller_scores_period  on public.seller_scores(period);
create index if not exists idx_seller_scores_company on public.seller_scores(company_id);

-- ── enforce_company_id trigger ────────────────────────────────
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

-- ── validate_invite RPC ───────────────────────────────────────
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
