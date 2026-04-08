-- ─────────────────────────────────────────────────────────────────────────────
-- 116_add_thrill_trial_plan.sql
-- Plano Thrill (Trial 14 dias) — adiciona colunas de billing na tabela companies
-- Idempotente: usa IF NOT EXISTS + UPDATE condicional
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan_status     TEXT        NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS plan_slug       TEXT        NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Empresas já existentes (pré-trial) recebem status 'active'
-- para não serem bloqueadas imediatamente ao fazer deploy.
UPDATE public.companies
SET
  plan_status = 'active',
  plan_slug   = 'legacy'
WHERE plan_status = 'trial';

-- Garante que novos signups recebam trial_ends_at = created_at + 14 dias
-- (o DEFAULT acima já cobre, mas deixamos explícito via função de conveniência)
CREATE OR REPLACE FUNCTION public.get_trial_ends_at()
RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE
AS $$
  SELECT now() + interval '14 days';
$$;
