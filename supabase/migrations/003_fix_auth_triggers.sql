-- ============================================================
-- Migration: 003_fix_auth_triggers
--
-- Recria handle_new_user e bootstrap_company_for_new_user
-- com schema qualifier explícito (public.) e set search_path = public.
--
-- Problema corrigido: triggers em auth.users sem public. no nome
-- da função fazem o PostgreSQL procurar auth.handle_new_user(),
-- que não existe → exceção → Supabase Auth retorna 500.
--
-- Safe para re-execução: CREATE OR REPLACE + DROP TRIGGER IF EXISTS.
-- ============================================================

-- ── handle_new_user ───────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
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

-- ── bootstrap_company_for_new_user ───────────────────────────
create or replace function public.bootstrap_company_for_new_user()
returns trigger
language plpgsql
security definer
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
