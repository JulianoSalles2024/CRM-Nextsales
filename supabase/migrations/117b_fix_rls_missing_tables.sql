-- ============================================================
-- Migration 117: Enable RLS nas tabelas sem Row Level Security
--
-- Tabelas identificadas pelo Supabase security advisor:
--   - goal_periods
--   - lead_opportunity_scores
--   - organization_ai_credentials
--   - sdr_settings
--
-- Padrão do projeto: my_company_id() para isolação multi-tenant.
-- Idempotente: políticas verificadas antes de criar.
-- ============================================================


-- ── 1. lead_opportunity_scores ───────────────────────────────
-- Scores de IA por lead. Isolação por company_id.

ALTER TABLE public.lead_opportunity_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lead_opportunity_scores'
      AND policyname = 'lead_opportunity_scores_company'
  ) THEN
    CREATE POLICY "lead_opportunity_scores_company"
      ON public.lead_opportunity_scores
      FOR ALL
      USING (company_id = public.my_company_id());
  END IF;
END $$;


-- ── 2. sdr_settings ──────────────────────────────────────────
-- Configurações do SDR por empresa. Isolação por company_id.

ALTER TABLE public.sdr_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sdr_settings'
      AND policyname = 'sdr_settings_company'
  ) THEN
    CREATE POLICY "sdr_settings_company"
      ON public.sdr_settings
      FOR ALL
      USING (company_id = public.my_company_id());
  END IF;
END $$;


-- ── 3. organization_ai_credentials ───────────────────────────
-- Credenciais de IA da organização (API keys). Sensível.
-- Isolação por organization_id (= company_id no contexto do projeto).
-- Leitura/escrita apenas por admins da empresa.

ALTER TABLE public.organization_ai_credentials ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organization_ai_credentials'
      AND policyname = 'organization_ai_credentials_admin'
  ) THEN
    CREATE POLICY "organization_ai_credentials_admin"
      ON public.organization_ai_credentials
      FOR ALL
      USING (
        organization_id = public.my_company_id()
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;


-- ── 4. goal_periods ──────────────────────────────────────────
-- Períodos de metas. Não tem company_id direto.
-- Isolação via join na tabela goals (que tem company_id).

ALTER TABLE public.goal_periods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'goal_periods'
      AND policyname = 'goal_periods_company'
  ) THEN
    CREATE POLICY "goal_periods_company"
      ON public.goal_periods
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.goals g
          WHERE g.id = goal_periods.goal_id
            AND g.company_id = public.my_company_id()
        )
      );
  END IF;
END $$;
