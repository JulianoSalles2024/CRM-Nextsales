-- ============================================================
-- Migration: 016_system_hardening
--
-- Segunda fase de hardening — bootstrap seguro e prevenção de
-- estados inválidos identificados na auditoria de schema.
--
--   1. Endurece handle_new_user()
--      Path B (sem invite_token) agora rejeita role != 'admin'.
--      Impede criação de sellers/users sem convite válido,
--      eliminando profiles com company_id = NULL para esses roles.
--
--   2. Melhora bootstrap_company_for_new_user()
--      Lê company_name de raw_user_meta_data em vez de hardcodar
--      'Minha Empresa'. Fallback mantido para compatibilidade.
--
--   3. CHECK CONSTRAINT em profiles
--      Garante que role != 'admin' implica company_id IS NOT NULL.
--      Usa NOT VALID para não bloquear deploy em produção com
--      dados legados — valida apenas inserts/updates futuros.
--
--   4. Indexes compostos ausentes
--      leads(company_id, owner_id)  — queries por vendedor
--      leads(company_id, won_at)    — filtros de período de receita
--      tasks(user_id)               — tarefas por assignee
--      tasks(company_id, status)    — filtros de status global
--
-- Idempotente: seguro para re-execução em produção.
-- CREATE OR REPLACE para funções, DO $$ para constraints,
-- CREATE INDEX IF NOT EXISTS para indexes.
-- ============================================================


-- ── 1. Endurecer handle_new_user() ───────────────────────────
--
-- Mudança cirúrgica no Path B:
--   Antes: aceita qualquer role do metadata sem invite_token.
--   Depois: bloqueia qualquer role != 'admin' sem invite_token.
--
-- Path A (invite_token presente) não é alterado — fluxo de
-- convite existente continua funcionando sem modificação.
--
-- Lógica de segurança:
--   - v_role só é null após Path A falhar em encontrar token.
--   - Quando v_role é null, estamos no Path B.
--   - Lemos role do metadata; se não for 'admin', rejeitamos.
--   - Admin sem token = instalação inicial legítima.

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

    -- Valida que a empresa do convite ainda existe
    if not exists (
      select 1 from public.companies where id = v_company_id
    ) then
      raise exception
        'Empresa associada ao convite não encontrada (company_id: %).',
        v_company_id
        using errcode = 'P0001';
    end if;
  end if;

  -- ── Path B: signup direto sem token ──────────────────────────
  if v_role is null then
    v_role := coalesce(
      nullif(new.raw_user_meta_data->>'role', ''),
      'user'
    );

    -- HARDENING: apenas 'admin' pode criar conta sem convite.
    -- Sellers e users devem sempre chegar via Path A (invite_token).
    -- Um seller/user sem company_id é um estado inválido e silencioso.
    if v_role != 'admin' then
      raise exception
        'Cadastro direto não permitido para a função "%". Utilize um convite válido.',
        v_role
        using errcode = 'P0002';
    end if;
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
    v_company_id   -- NULL para admin em Path B → bootstrap cria empresa
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


-- ── 2. Melhorar bootstrap_company_for_new_user() ─────────────
--
-- Antes: hardcodava 'Minha Empresa' como nome da empresa.
-- Depois: lê company_name de raw_user_meta_data do usuário
--         que está sendo criado. Fallback: 'Minha Empresa'.
--
-- O installer passa company_name no metadata ao criar o admin:
--   raw_user_meta_data: { role: 'admin', company_name: 'Nome Real' }
-- Sem isso, a empresa seria sempre chamada 'Minha Empresa'.
--
-- Técnica: a função é SECURITY DEFINER (roda como postgres),
-- portanto tem acesso a auth.users para ler o metadata.

create or replace function public.bootstrap_company_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id   uuid;
  v_company_name text;
begin
  if new.role = 'admin' and new.company_id is null then
    -- Lê company_name do metadata do usuário que está sendo criado
    select coalesce(
      nullif(raw_user_meta_data->>'company_name', ''),
      'Minha Empresa'
    )
      into v_company_name
      from auth.users
     where id = new.id;

    -- Fallback caso a query não encontre (ex: testes unitários)
    v_company_name := coalesce(v_company_name, 'Minha Empresa');

    insert into public.companies (name)
    values (v_company_name)
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


-- ── 3. CHECK CONSTRAINT em profiles ──────────────────────────
--
-- Invariante: todo profile com role != 'admin' deve ter
-- company_id preenchido. Um seller ou user sem company_id é
-- um estado inválido que passa silenciosamente pelo sistema
-- (RLS retorna zero linhas, sem erro explícito).
--
-- NOT VALID: PostgreSQL não escaneia registros existentes ao
-- adicionar a constraint. Apenas novos inserts e updates são
-- validados. Seguro para deploy em produção com dados legados.
--
-- Para validar retroativamente (opcional, fora desta migration):
--   ALTER TABLE public.profiles VALIDATE CONSTRAINT
--     chk_profiles_non_admin_has_company;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.profiles'::regclass
       and conname  = 'chk_profiles_non_admin_has_company'
  ) then
    alter table public.profiles
      add constraint chk_profiles_non_admin_has_company
      check (role = 'admin' or company_id is not null)
      not valid;
  end if;
end $$;


-- ── 4. Indexes compostos ausentes ────────────────────────────
--
-- Indexes simples (single-column) foram adicionados em 015.
-- Aqui completamos com compostos para queries multi-coluna
-- que aparecem nas views de admin e SellerDetail360.

-- leads → company + owner (filtro de carteira por vendedor)
-- Usado em: Painel360, SellerDetail360 lead count
create index if not exists idx_leads_company_owner
  on public.leads (company_id, owner_id)
  where deleted_at is null;

-- leads → company + won_at (revenue por período, SellerDetail360)
-- Permite index scan em vez de seq scan + filter para queries de faturamento
create index if not exists idx_leads_company_won_at
  on public.leads (company_id, won_at)
  where won_at is not null and deleted_at is null;

-- tasks → user (tarefas por assignee — useTasks com filtro de userId)
create index if not exists idx_tasks_user
  on public.tasks (user_id);

-- tasks → company + status (filtros de status global na view de tarefas)
create index if not exists idx_tasks_company_status
  on public.tasks (company_id, status);
