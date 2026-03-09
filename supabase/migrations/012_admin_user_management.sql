-- ============================================================
-- Migration: 012_admin_user_management
--
-- Cria as 4 funções RPC de gerenciamento de usuários chamadas
-- pelo frontend em TeamSettings.tsx:
--
--   admin_block_user    → is_active  = false
--   admin_unblock_user  → is_active  = true
--   admin_archive_user  → is_archived = true, archived_at = now()
--   admin_unarchive_user→ is_archived = false, archived_at = null
--
-- Restrições de segurança (todas as funções):
--   - Caller deve ser 'admin' via my_role()
--   - Target deve pertencer à mesma empresa via my_company_id()
--   - SECURITY DEFINER para bypass de RLS interno
--   - Impede admin de operar sobre si mesmo
--
-- Safe para re-execução: CREATE OR REPLACE em todas as funções.
-- ============================================================

-- ── 1. admin_block_user ───────────────────────────────────────
-- Bloqueia o usuário: is_active = false.
-- Usuário bloqueado não consegue logar (frontend verifica is_active).

create or replace function public.admin_block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Apenas admins da mesma empresa
  if public.my_role() <> 'admin' then
    raise exception 'Apenas administradores podem bloquear usuários.'
      using errcode = 'P0401';
  end if;

  -- Impede auto-bloqueio
  if p_user_id = auth.uid() then
    raise exception 'Administrador não pode bloquear a própria conta.'
      using errcode = 'P0402';
  end if;

  update public.profiles
     set is_active = false,
         updated_at = now()
   where id         = p_user_id
     and company_id = public.my_company_id();

  if not found then
    raise exception 'Usuário não encontrado ou não pertence à sua empresa.'
      using errcode = 'P0404';
  end if;
end;
$$;

grant execute on function public.admin_block_user(uuid) to authenticated;


-- ── 2. admin_unblock_user ─────────────────────────────────────
-- Reativa o usuário: is_active = true.

create or replace function public.admin_unblock_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_role() <> 'admin' then
    raise exception 'Apenas administradores podem reativar usuários.'
      using errcode = 'P0401';
  end if;

  update public.profiles
     set is_active  = true,
         updated_at = now()
   where id         = p_user_id
     and company_id = public.my_company_id();

  if not found then
    raise exception 'Usuário não encontrado ou não pertence à sua empresa.'
      using errcode = 'P0404';
  end if;
end;
$$;

grant execute on function public.admin_unblock_user(uuid) to authenticated;


-- ── 3. admin_archive_user ─────────────────────────────────────
-- Arquiva o usuário: is_archived = true, archived_at = now().
-- Combinado com admin_block_user no fluxo de "excluir" do frontend.

create or replace function public.admin_archive_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_role() <> 'admin' then
    raise exception 'Apenas administradores podem arquivar usuários.'
      using errcode = 'P0401';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Administrador não pode arquivar a própria conta.'
      using errcode = 'P0402';
  end if;

  update public.profiles
     set is_archived = true,
         archived_at = now(),
         updated_at  = now()
   where id         = p_user_id
     and company_id = public.my_company_id();

  if not found then
    raise exception 'Usuário não encontrado ou não pertence à sua empresa.'
      using errcode = 'P0404';
  end if;
end;
$$;

grant execute on function public.admin_archive_user(uuid) to authenticated;


-- ── 4. admin_unarchive_user ───────────────────────────────────
-- Restaura o usuário arquivado: is_archived = false, archived_at = null.

create or replace function public.admin_unarchive_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_role() <> 'admin' then
    raise exception 'Apenas administradores podem restaurar usuários.'
      using errcode = 'P0401';
  end if;

  update public.profiles
     set is_archived = false,
         archived_at = null,
         updated_at  = now()
   where id         = p_user_id
     and company_id = public.my_company_id();

  if not found then
    raise exception 'Usuário não encontrado ou não pertence à sua empresa.'
      using errcode = 'P0404';
  end if;
end;
$$;

grant execute on function public.admin_unarchive_user(uuid) to authenticated;
