-- ============================================================
-- Migration: 015_schema_integrity
--
-- Migration de consistência final.
-- Corrige todos os gaps identificados na auditoria de schema:
--
--   1. Limpa policies duplicadas em seller_scores
--      (001 criou "SellerScores:..." e 008 criou "seller_scores:..."
--       com nomes diferentes mas semântica idêntica)
--
--   2. Adiciona trigger updated_at em organization_ai_credentials
--      (tabela criada em 001 sem trigger de atualização automática)
--
--   3. Adiciona indexes de performance ausentes
--      (leads.board_id, board_stages.board_id, tasks.lead_id,
--       activities.lead_id, goals.user_id, sales.lead_id)
--
--   4. Garante grants de my_role() e my_company_id()
--      (defensive — persiste de migrações anteriores mas garante
--       que installs com resets parciais também tenham os grants)
--
--   5. Corrige política "Invites: anon can read by token"
--      (using(true) expunha todos os tokens para anon —
--       substituída por policy que filtra apenas tokens válidos
--       e não utilizados, mantendo compatibilidade com validate_invite RPC)
--
-- Idempotente: seguro para re-execução.
-- Não quebra ambientes existentes.
-- ============================================================


-- ── 1. Limpar policies duplicadas em seller_scores ────────────
--
-- 001 criou policies com prefixo "SellerScores:" (PascalCase).
-- 008 criou policies com prefixo "seller_scores:" (lowercase).
-- Resultado em banco novo: 6 policies na mesma tabela.
-- Consolidamos para manter somente as versões com IF NOT EXISTS guard.

drop policy if exists "SellerScores: own or same company"  on public.seller_scores;
drop policy if exists "SellerScores: insert own"           on public.seller_scores;
drop policy if exists "SellerScores: update own"           on public.seller_scores;
drop policy if exists "seller_scores: own or same company" on public.seller_scores;
drop policy if exists "seller_scores: insert own"          on public.seller_scores;
drop policy if exists "seller_scores: update own"          on public.seller_scores;

-- Recria com nomes canônicos e IF NOT EXISTS pattern.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'seller_scores'
      and policyname = 'SellerScores: read own or company'
  ) then
    create policy "SellerScores: read own or company"
      on public.seller_scores for select
      using (
        seller_id  = auth.uid()
        or company_id = public.my_company_id()
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'seller_scores'
      and policyname = 'SellerScores: insert own'
  ) then
    create policy "SellerScores: insert own"
      on public.seller_scores for insert
      with check (seller_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'seller_scores'
      and policyname = 'SellerScores: update own'
  ) then
    create policy "SellerScores: update own"
      on public.seller_scores for update
      using (seller_id = auth.uid());
  end if;
end $$;


-- ── 2. Trigger updated_at em organization_ai_credentials ─────
--
-- Tabela criada em 001 com coluna updated_at mas sem trigger.
-- Sem trigger, updated_at só é atualizado se a aplicação o passar
-- explicitamente — comportamento frágil.

drop trigger if exists set_org_ai_credentials_updated_at
  on public.organization_ai_credentials;

create trigger set_org_ai_credentials_updated_at
  before update on public.organization_ai_credentials
  for each row execute function public.set_updated_at();


-- ── 3. Indexes de performance ausentes ───────────────────────
--
-- Indexes críticos não criados nas migrations anteriores.
-- Todas as queries do frontend que filtram por lead_id, board_id
-- ou user_id farão seq scan sem estes indexes.

-- leads → board (useBoards, kanban view)
create index if not exists idx_leads_board
  on public.leads (board_id);

-- board_stages → board (useBoards stage listing)
create index if not exists idx_board_stages_board
  on public.board_stages (board_id);

-- tasks → lead (useTasks filter by lead)
create index if not exists idx_tasks_lead
  on public.tasks (lead_id);

-- activities → lead (useActivities filter by lead)
create index if not exists idx_activities_lead
  on public.activities (lead_id);

-- goals → user (useActiveGoal in SellerDetail360)
create index if not exists idx_goals_user
  on public.goals (user_id);

-- sales → lead (SellerDetail360 revenue queries)
create index if not exists idx_sales_lead
  on public.sales (lead_id);

-- leads → won_at (SellerDetail360 period filters)
create index if not exists idx_leads_won_at
  on public.leads (won_at)
  where won_at is not null;

-- leads → deleted_at + is_archived (useLeads server-side filter)
create index if not exists idx_leads_active
  on public.leads (company_id, is_archived, deleted_at)
  where deleted_at is null and is_archived = false;


-- ── 4. Garantir grants das funções SECURITY DEFINER ──────────
--
-- GRANTs persistem de migrations anteriores mas podem não existir
-- em installs com resets parciais ou ambientes recriados manualmente.

grant execute on function public.my_company_id() to authenticated;
grant execute on function public.my_role()        to authenticated;
grant execute on function public.validate_invite(text) to anon;
grant execute on function public.validate_invite(text) to authenticated;
grant execute on function public.activate_goal(uuid, uuid) to authenticated;
grant execute on function public.accept_invite(uuid)        to authenticated;
grant execute on function public.admin_block_user(uuid)     to authenticated;
grant execute on function public.admin_unblock_user(uuid)   to authenticated;
grant execute on function public.admin_archive_user(uuid)   to authenticated;
grant execute on function public.admin_unarchive_user(uuid) to authenticated;


-- ── 5. Corrigir policy anon de invites ────────────────────────
--
-- "Invites: anon can read by token" usava using(true), expondo
-- todos os registros (token, role, company_id, expires_at, used_at)
-- para qualquer usuário anônimo.
--
-- Nova policy: anon só lê convites ainda válidos (não usados e não
-- expirados). A validate_invite() RPC (SECURITY DEFINER) continua
-- sendo o canal oficial para validação — esta policy é o fallback
-- para leitura direta da tabela.
--
-- NOTA: não altera a RPC validate_invite() que já funciona corretamente.

drop policy if exists "Invites: anon can read by token" on public.invites;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'invites'
      and policyname = 'Invites: anon reads valid'
  ) then
    create policy "Invites: anon reads valid"
      on public.invites for select
      to anon
      using (
        used_at is null
        and (expires_at is null or expires_at > now())
      );
  end if;
end $$;


-- ── 6. RLS enable (defensive) ────────────────────────────────
--
-- Garante que todas as tabelas tenham RLS habilitado.
-- ALTER TABLE ENABLE RLS é idempotente no PostgreSQL.

alter table public.companies               enable row level security;
alter table public.profiles                enable row level security;
alter table public.invites                 enable row level security;
alter table public.contacts                enable row level security;
alter table public.boards                  enable row level security;
alter table public.board_stages            enable row level security;
alter table public.leads                   enable row level security;
alter table public.activities              enable row level security;
alter table public.tasks                   enable row level security;
alter table public.goals                   enable row level security;
alter table public.sales                   enable row level security;
alter table public.seller_scores           enable row level security;
alter table public.organization_ai_credentials enable row level security;
alter table public.lead_opportunity_scores enable row level security;
alter table public.notifications           enable row level security;
alter table public.ai_conversations        enable row level security;
alter table public.user_settings           enable row level security;
alter table public.groups                  enable row level security;
