-- ============================================================
-- Migration 117: Billing tables for NextSales Asaas integration
-- ============================================================

-- ── billing_events: idempotent event log from Asaas webhooks ─

CREATE TABLE IF NOT EXISTS public.billing_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway      TEXT NOT NULL DEFAULT 'asaas',
  event_id     TEXT NOT NULL,          -- payment.id:EVENT_TYPE
  event_type   TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}',
  processed    BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gateway, event_id)
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_only" ON public.billing_events;
CREATE POLICY "service_only" ON public.billing_events USING (false);

-- ── invoices: cobrança por empresa ────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  gateway_invoice_id   TEXT,            -- Asaas payment id
  gateway_customer_id  TEXT,            -- Asaas customer id
  plan_slug            TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, canceled, refunded
  payment_type         TEXT NOT NULL DEFAULT 'pix',     -- pix, boleto, credit_card
  amount_cents         INTEGER NOT NULL,
  due_date             DATE,
  paid_at              TIMESTAMPTZ,
  payment_url          TEXT,
  bank_slip_url        TEXT,
  pix_qr_code          TEXT,
  pix_qr_code_image    TEXT,
  description          TEXT,
  gateway_response     JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read" ON public.invoices;
CREATE POLICY "admin_read" ON public.invoices
  FOR SELECT USING (
    company_id = my_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Add gateway_customer_id to companies (para reuso no Asaas) ─

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- ── updated_at trigger for invoices ──────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
