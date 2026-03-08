-- ============================================================
-- Migration: 011_fix_handle_new_user
--
-- Substitui a versão simplificada de handle_new_user() por uma
-- versão completa que suporta o fluxo de convites:
--
--   Path A (com invite_token):
--     - Busca role + company_id na tabela invites server-side.
--     - Rejeita tokens inválidos, expirados ou já usados.
--     - Cria o profile já com company_id correto.
--     - Marca o convite como usado atomicamente.
--
--   Path B (sem invite_token):
--     - Cria profile com role do metadata (fallback: 'user').
--     - company_id fica NULL → trigger bootstrap_company_for_new_user
--       cria a empresa automaticamente quando role = 'admin'.
--
-- Safe para re-execução: CREATE OR REPLACE + DROP TRIGGER IF EXISTS.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token      text;
  v_invite_id  uuid;
  v_role       text;
  v_company_id uuid;
  v_rows       integer := 0;
begin
  v_token := new.raw_user_meta_data->>'invite_token';

  -- ── Path A: usuário convidado (invite_token presente) ────────
  if v_token is not null then
    select id, role, company_id
      into v_invite_id, v_role, v_company_id
      from public.invites
     where token     = v_token
       and used_at   is null
       and (expires_at is null or expires_at > now())
     limit 1;

    if not found then
      raise exception
        'Convite inválido, expirado ou já utilizado (token: %).',
        v_token
        using errcode = 'P0001';
    end if;
  end if;

  -- ── Path B: signup direto sem token ──────────────────────────
  -- Role vem do metadata; fallback 'user'.
  -- company_id permanece NULL → bootstrap_company_for_new_user
  -- cria a empresa quando role = 'admin'.
  if v_role is null then
    v_role := coalesce(
      nullif(new.raw_user_meta_data->>'role', ''),
      'user'
    );
  end if;

  -- ── Insert profile ───────────────────────────────────────────
  insert into public.profiles (id, name, role, company_id)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name',      ''),
      new.email
    ),
    v_role,
    v_company_id
  )
  on conflict (id) do nothing;

  get diagnostics v_rows = row_count;

  -- ── Marcar convite como usado ────────────────────────────────
  -- Só consome o convite se o profile foi inserido de fato.
  -- Evita consumir o token em caso de conflito (re-tentativa).
  if v_invite_id is not null and v_rows > 0 then
    update public.invites
       set used_at = now()
     where id      = v_invite_id
       and used_at is null;
  end if;

  return new;
end;
$$;

-- Recriar trigger (idempotente)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
