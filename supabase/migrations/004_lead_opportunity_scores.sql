-- ============================================================
-- CRM Zenius — Lead Opportunity Scores
-- Migration: 004_lead_opportunity_scores
-- Tabela para armazenar scores de oportunidade gerados por IA
-- por lead: conversão, upsell e risco.
-- A análise é gerada via API serverless (service role) e
-- consumida pelo frontend via RLS (authenticated).
-- ============================================================

-- ── 1. Table: lead_opportunity_scores ────────────────────────
create table if not exists public.lead_opportunity_scores (
  id                  uuid        primary key default gen_random_uuid(),

  -- Isolamento multi-tenant
  company_id          uuid        not null references public.companies(id) on delete cascade,

  -- Referências
  lead_id             uuid        not null references public.leads(id) on delete cascade,
  owner_id            uuid        references public.profiles(id) on delete set null,

  -- Scores (0–100)
  conversion_score    numeric(5,2) not null default 0
                        check (conversion_score >= 0 and conversion_score <= 100),
  upsell_score        numeric(5,2) not null default 0
                        check (upsell_score >= 0 and upsell_score <= 100),
  risk_score          numeric(5,2) not null default 0
                        check (risk_score >= 0 and risk_score <= 100),

  -- Classificação
  priority_band       text        not null default 'cold'
                        check (priority_band in ('hot', 'warm', 'cold', 'risk', 'upsell')),

  -- Recomendações geradas por IA
  next_best_action    text,
  recommended_window  text,
  explanation         text,

  -- Sinais brutos usados para gerar os scores (payload livre)
  signals             jsonb       not null default '{}',

  -- Rastreabilidade da geração
  generated_by        text,       -- e.g. 'gemini', 'openai', 'anthropic'
  last_analyzed_at    timestamptz not null default now(),

  -- Timestamps padrão
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Um registro de scores por lead por empresa
  unique (company_id, lead_id)
);

-- ── 2. Trigger: updated_at ────────────────────────────────────
drop trigger if exists set_lead_opportunity_scores_updated_at
  on public.lead_opportunity_scores;

create trigger set_lead_opportunity_scores_updated_at
  before update on public.lead_opportunity_scores
  for each row execute function set_updated_at();

-- ── 3. Trigger: enforce_company_id ───────────────────────────
-- Stampa company_id server-side no INSERT para evitar
-- inconsistência entre estado do frontend e isolamento do DB.
drop trigger if exists trg_enforce_company_id
  on public.lead_opportunity_scores;

create trigger trg_enforce_company_id
  before insert on public.lead_opportunity_scores
  for each row execute function public.enforce_company_id();

-- ── 4. Row Level Security ─────────────────────────────────────
alter table public.lead_opportunity_scores enable row level security;

-- Leitura: qualquer membro autenticado da mesma empresa
-- Escrita (INSERT/UPDATE): feita pela API serverless com service role
--   → bypassa RLS; policy de write não é necessária para authenticated.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'lead_opportunity_scores'
      and policyname = 'OpportunityScores: company members read'
  ) then
    create policy "OpportunityScores: company members read"
      on public.lead_opportunity_scores for select
      using (company_id = public.my_company_id());
  end if;
end $$;

-- ── 5. Indexes ────────────────────────────────────────────────
-- Lookup por empresa (query principal do frontend)
create index if not exists idx_opportunity_scores_company
  on public.lead_opportunity_scores (company_id);

-- Lookup por lead (para exibir score no card/modal do lead)
create index if not exists idx_opportunity_scores_lead
  on public.lead_opportunity_scores (lead_id);

-- Query composta: listar oportunidades da empresa ordenadas por band + score
create index if not exists idx_opportunity_scores_company_band_score
  on public.lead_opportunity_scores (company_id, priority_band, conversion_score desc);

-- ── 6. Schema migration tracking ─────────────────────────────
-- Registrado pelo TypeScript após execução bem-sucedida,
-- não por este arquivo (padrão do projeto).
