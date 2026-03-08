-- ============================================================
-- Migration: 009_enforce_company_id
--
-- Stamps company_id server-side on INSERT into leads, tasks,
-- activities and lead_opportunity_scores using a BEFORE INSERT
-- trigger. Safe for existing databases: CREATE OR REPLACE +
-- DROP TRIGGER IF EXISTS before recreating.
-- ============================================================

-- ── 1. Trigger function ──────────────────────────────────────
-- SECURITY DEFINER so it can read profiles even when the caller
-- has restricted RLS on that table.
-- Only fills company_id when the client did not supply one,
-- so explicit inserts (e.g. data migrations) are not overridden.

create or replace function public.enforce_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if new.company_id is null then
    v_company_id := public.my_company_id();

    if v_company_id is null then
      raise exception
        'Usuário % não possui company_id. Contate o administrador.',
        auth.uid()
        using errcode = 'P0001';
    end if;

    new.company_id := v_company_id;
  end if;

  return new;
end;
$$;


-- ── 2. leads ─────────────────────────────────────────────────
drop trigger if exists trg_enforce_company_id on public.leads;

create trigger trg_enforce_company_id
  before insert on public.leads
  for each row
  execute function public.enforce_company_id();


-- ── 3. tasks ─────────────────────────────────────────────────
drop trigger if exists trg_enforce_company_id on public.tasks;

create trigger trg_enforce_company_id
  before insert on public.tasks
  for each row
  execute function public.enforce_company_id();


-- ── 4. activities ────────────────────────────────────────────
drop trigger if exists trg_enforce_company_id on public.activities;

create trigger trg_enforce_company_id
  before insert on public.activities
  for each row
  execute function public.enforce_company_id();


-- ── 5. lead_opportunity_scores ───────────────────────────────
drop trigger if exists trg_enforce_company_id on public.lead_opportunity_scores;

create trigger trg_enforce_company_id
  before insert on public.lead_opportunity_scores
  for each row
  execute function public.enforce_company_id();
