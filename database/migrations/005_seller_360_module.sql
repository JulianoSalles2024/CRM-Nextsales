-- 005_seller_360_module.sql
-- Extends sales table and creates seller_scores for the 360º Vendedor module.
-- Run AFTER 004_multitenant_rbac.sql.

-- ─── 1. EXTEND public.sales ───────────────────────────────────────────────────

-- Add client_name (who the sale was made to)
alter table public.sales
  add column if not exists client_name text not null default '';

-- Add company_id for multi-tenant isolation
alter table public.sales
  add column if not exists company_id uuid;

create index if not exists sales_company_id_idx on public.sales (company_id);

-- Trigger: auto-fill company_id from seller's profile on insert
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

-- ─── 2. UPDATE sales RLS POLICIES ────────────────────────────────────────────

-- Drop old admin policy (no company isolation)
drop policy if exists "sales: admin vê tudo" on public.sales;

-- Admin sees all sales in same company
create policy "sales: admin vê mesma empresa"
  on public.sales for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and (
          public.sales.company_id is null         -- legacy rows without company_id
          or public.sales.company_id = p.company_id
        )
    )
  );

-- Seller inserts: enforce same company
drop policy if exists "sales: seller insere próprias" on public.sales;
create policy "sales: seller insere próprias"
  on public.sales for insert
  with check (
    seller_id = auth.uid()
    and (
      company_id is null
      or company_id = (select company_id from public.profiles where id = auth.uid())
    )
  );

-- ─── 3. CREATE public.seller_scores ──────────────────────────────────────────

create table if not exists public.seller_scores (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid not null references public.profiles(id) on delete cascade,
  company_id     uuid,
  score          numeric(5,2) not null default 0 check (score >= 0 and score <= 100),
  period         text not null,  -- format: 'YYYY-MM' for month, 'YYYY' for year
  breakdown_json jsonb not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(seller_id, period)
);

create index if not exists seller_scores_seller_idx  on public.seller_scores (seller_id);
create index if not exists seller_scores_period_idx  on public.seller_scores (period);
create index if not exists seller_scores_company_idx on public.seller_scores (company_id);

alter table public.seller_scores enable row level security;

-- seller_scores RLS: own record or same company
drop policy if exists "scores: own or same company"   on public.seller_scores;
create policy "scores: own or same company"
  on public.seller_scores for select
  using (
    seller_id = auth.uid()
    or company_id = (
      select company_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "scores: insert own" on public.seller_scores;
create policy "scores: insert own"
  on public.seller_scores for insert
  with check (seller_id = auth.uid());

drop policy if exists "scores: upsert own" on public.seller_scores;
create policy "scores: upsert own"
  on public.seller_scores for update
  using (seller_id = auth.uid());

-- ─── 4. VERIFICATION ─────────────────────────────────────────────────────────
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('sales', 'seller_scores')
order by table_name, ordinal_position;
