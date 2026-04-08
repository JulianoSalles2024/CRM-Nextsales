-- Migration 119 · Reduz trial de 14 para 7 dias
-- Altera default da coluna e recria a função auxiliar usada pelo trigger de novo signup.

-- 1. Novo default na coluna (afeta apenas novos registros)
ALTER TABLE public.companies
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');

-- 2. Atualiza função auxiliar get_trial_ends_at()
CREATE OR REPLACE FUNCTION public.get_trial_ends_at()
RETURNS timestamptz
LANGUAGE sql STABLE
AS $$
  SELECT now() + interval '7 days';
$$;
