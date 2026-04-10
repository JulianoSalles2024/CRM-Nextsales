-- ============================================================
-- Migration 118: Tabela subscriptions + ajustes de billing
-- ============================================================

-- ── subscriptions: estado da assinatura por empresa ──────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_slug              TEXT NOT NULL DEFAULT 'trial',
  billing_interval       TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  status                 TEXT NOT NULL DEFAULT 'trialing'
                           CHECK (status IN ('trialing', 'active', 'past_due', 'unpaid', 'canceled', 'suspended')),
  payment_type           TEXT CHECK (payment_type IN ('boleto', 'pix', 'credit_card')),
  gateway_customer_id    TEXT,              -- Asaas customer id
  gateway_subscription_id TEXT,             -- reservado para uso futuro
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  grace_period_end       TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false,
  canceled_at            TIMESTAMPTZ,
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Admin pode ver a própria subscription
DROP POLICY IF EXISTS "admin_read_subscriptions" ON public.subscriptions;
CREATE POLICY "admin_read_subscriptions" ON public.subscriptions
  FOR SELECT USING (
    company_id = my_company_id()
    AND public.my_role() = 'admin'
  );

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Realtime para subscriptions e invoices ───────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  END IF;
END $$;

-- ── Criar subscription de trial para empresas existentes ─────
-- (novas empresas recebem via trigger ou função de signup)
INSERT INTO public.subscriptions (company_id, plan_slug, status)
SELECT id, 'trial', 'trialing'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.company_id = c.id
);

-- ── Trigger: criar subscription ao cadastrar nova empresa ────

CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.subscriptions (company_id, plan_slug, status)
  VALUES (NEW.id, 'trial', 'trialing')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created_billing ON public.companies;
CREATE TRIGGER on_company_created_billing
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.create_trial_subscription();

-- ── RPC: status consolidado de billing ───────────────────────

CREATE OR REPLACE FUNCTION public.get_billing_status(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_company  RECORD;
  v_sub      RECORD;
BEGIN
  SELECT plan_status, plan_slug, trial_ends_at, plan_expires_at, asaas_customer_id
  INTO v_company
  FROM public.companies WHERE id = p_company_id;

  SELECT status, billing_interval, payment_type, current_period_end,
         grace_period_end, cancel_at_period_end, canceled_at
  INTO v_sub
  FROM public.subscriptions WHERE company_id = p_company_id;

  RETURN jsonb_build_object(
    'plan_status',        v_company.plan_status,
    'plan_slug',          v_company.plan_slug,
    'trial_ends_at',      v_company.trial_ends_at,
    'plan_expires_at',    v_company.plan_expires_at,
    'sub_status',         v_sub.status,
    'billing_interval',   v_sub.billing_interval,
    'payment_type',       v_sub.payment_type,
    'current_period_end', v_sub.current_period_end,
    'grace_period_end',   v_sub.grace_period_end,
    'cancel_at_period_end', v_sub.cancel_at_period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_billing_status(UUID) TO authenticated;
