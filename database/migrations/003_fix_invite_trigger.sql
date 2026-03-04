-- ============================================================
-- Migration 003: source role/company_id from invites table
--                instead of raw_user_meta_data
-- ============================================================

-- 1. Ensure company_id column exists on profiles
--    (001_painel_360.sql used team_id; this guarantees the column)
alter table public.profiles
  add column if not exists company_id uuid;

-- 2. Check constraint: sellers must always have a company_id
alter table public.profiles
  drop constraint if exists profiles_seller_has_company;

alter table public.profiles
  add constraint profiles_seller_has_company
  check (role <> 'seller' or company_id is not null);

-- 3. Replace trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite     record;
  v_role       text;
  v_company_id uuid;
  v_token      text;
begin
  v_token := new.raw_user_meta_data->>'invite_token';

  -- Look up invite by token (DB-side — cannot be spoofed by client)
  if v_token is not null then
    select role, company_id
      into v_invite
      from public.invites
     where token    = v_token
       and used_at  is null
       and (expires_at is null or expires_at > now())
     limit 1;

    if found then
      v_role       := v_invite.role;
      v_company_id := v_invite.company_id;
    end if;
  end if;

  -- Fallback for admin self-signup (no invite token)
  if v_role is null then
    v_role       := coalesce(new.raw_user_meta_data->>'role', 'admin');
    v_company_id := nullif(new.raw_user_meta_data->>'company_id', '')::uuid;
  end if;

  -- Guard: seller must always have a company_id
  if v_role = 'seller' and v_company_id is null then
    raise exception
      'invite company_id is NULL for seller (token: %) — profile not created', v_token;
  end if;

  insert into public.profiles (id, email, name, role, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    v_role,
    v_company_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 4. Recreate trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
