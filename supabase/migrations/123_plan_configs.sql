-- ============================================================
-- Migration 123: plan_configs — configuração dinâmica de planos
-- ============================================================

-- ── Tabela principal ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plan_configs (
  slug                    TEXT PRIMARY KEY,

  -- Metadados de exibição
  display_name            TEXT NOT NULL,
  description             TEXT,
  is_popular              BOOLEAN NOT NULL DEFAULT false,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  sort_order              INTEGER NOT NULL DEFAULT 0,

  -- Preços (centavos)
  price_monthly_cents     INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents      INTEGER NOT NULL DEFAULT 0,

  -- Limites numéricos (NULL = ilimitado)
  max_pipelines           INTEGER,
  max_leads               INTEGER,
  max_users               INTEGER,
  max_agents              INTEGER,
  max_whatsapp_instances  INTEGER,
  max_playbooks           INTEGER,
  max_custom_fields       INTEGER,

  -- Features (boolean flags)
  has_whatsapp            BOOLEAN NOT NULL DEFAULT false,
  has_ai_sdr              BOOLEAN NOT NULL DEFAULT false,
  has_ai_closer           BOOLEAN NOT NULL DEFAULT false,
  has_ai_followup         BOOLEAN NOT NULL DEFAULT false,
  has_portfolio           BOOLEAN NOT NULL DEFAULT false,
  has_reports_advanced    BOOLEAN NOT NULL DEFAULT false,
  has_api_access          BOOLEAN NOT NULL DEFAULT false,
  has_priority_support    BOOLEAN NOT NULL DEFAULT false,
  has_dedicated_onboarding BOOLEAN NOT NULL DEFAULT false,
  has_community           BOOLEAN NOT NULL DEFAULT false,
  has_custom_fields       BOOLEAN NOT NULL DEFAULT false,
  has_sla                 BOOLEAN NOT NULL DEFAULT false,

  -- Agentes liberados (array de slugs: "sdr", "closer", "followup")
  allowed_agents          JSONB NOT NULL DEFAULT '[]',

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler (o CRM precisa para exibir limites)
DROP POLICY IF EXISTS "authenticated_read" ON public.plan_configs;
CREATE POLICY "authenticated_read" ON public.plan_configs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas platform_admin pode modificar
DROP POLICY IF EXISTS "platform_admin_write" ON public.plan_configs;
CREATE POLICY "platform_admin_write" ON public.plan_configs
  FOR ALL USING (public.is_platform_admin());

DROP TRIGGER IF EXISTS plan_configs_updated_at ON public.plan_configs;
CREATE TRIGGER plan_configs_updated_at
  BEFORE UPDATE ON public.plan_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed: valores iniciais dos planos ────────────────────────

INSERT INTO public.plan_configs (
  slug, display_name, description, is_popular, sort_order,
  price_monthly_cents, price_yearly_cents,
  max_pipelines, max_leads, max_users, max_agents,
  max_whatsapp_instances, max_playbooks, max_custom_fields,
  has_whatsapp, has_ai_sdr, has_ai_closer, has_ai_followup,
  has_portfolio, has_reports_advanced, has_api_access,
  has_priority_support, has_dedicated_onboarding,
  has_community, has_custom_fields, has_sla,
  allowed_agents
) VALUES
-- trial / thrill
(
  'trial', 'Thrill (Trial)', 'Período de avaliação gratuita', false, 0,
  0, 0,
  1, 50, 1, 1,
  1, 1, 3,
  true, true, false, false,
  false, false, false,
  false, false,
  false, true, false,
  '["sdr"]'
),
-- starter
(
  'starter', 'Starter', 'Ideal para times pequenos começando com IA', false, 1,
  29700, 267300,
  1, 500, 2, 1,
  1, 2, 5,
  true, true, false, false,
  false, false, false,
  false, false,
  true, true, false,
  '["sdr"]'
),
-- growth
(
  'growth', 'Growth', 'Para times em crescimento com automações avançadas', true, 2,
  69700, 627300,
  3, 2000, 5, 2,
  2, 5, 15,
  true, true, true, true,
  true, true, false,
  false, false,
  true, true, false,
  '["sdr","closer","followup"]'
),
-- scale
(
  'scale', 'Scale', 'Para operações completas sem limitações', false, 3,
  149700, 1347300,
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  true, true, true, true,
  true, true, true,
  true, true,
  true, true, true,
  '["sdr","closer","followup"]'
)
ON CONFLICT (slug) DO NOTHING;

-- ── RPC: retorna limites do plano da empresa logada ──────────

CREATE OR REPLACE FUNCTION public.get_my_plan_limits()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_plan_slug TEXT;
  v_config    RECORD;
BEGIN
  -- Pega o plan_slug da empresa atual
  SELECT COALESCE(s.plan_slug, c.plan_slug, 'trial')
  INTO v_plan_slug
  FROM companies c
  LEFT JOIN subscriptions s ON s.company_id = c.id
  WHERE c.id = my_company_id();

  -- Busca configuração do plano
  SELECT * INTO v_config FROM plan_configs WHERE slug = v_plan_slug;

  -- Fallback para trial se slug não existe na tabela
  IF NOT FOUND THEN
    SELECT * INTO v_config FROM plan_configs WHERE slug = 'trial';
  END IF;

  RETURN row_to_json(v_config)::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_plan_limits() TO authenticated;

-- ── RPC: listagem para o back-office ─────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_plan_configs()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN COALESCE(
    (SELECT jsonb_agg(row_to_json(t) ORDER BY t.sort_order)
     FROM plan_configs t),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_plan_configs() TO authenticated;

-- ── RPC: criar ou atualizar plano ────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_upsert_plan_config(p_config JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_slug TEXT := p_config->>'slug';
  v_result RECORD;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_slug IS NULL OR v_slug = '' THEN
    RAISE EXCEPTION 'slug é obrigatório';
  END IF;

  INSERT INTO public.plan_configs (
    slug, display_name, description, is_popular, is_active, sort_order,
    price_monthly_cents, price_yearly_cents,
    max_pipelines, max_leads, max_users, max_agents,
    max_whatsapp_instances, max_playbooks, max_custom_fields,
    has_whatsapp, has_ai_sdr, has_ai_closer, has_ai_followup,
    has_portfolio, has_reports_advanced, has_api_access,
    has_priority_support, has_dedicated_onboarding,
    has_community, has_custom_fields, has_sla,
    allowed_agents
  ) VALUES (
    v_slug,
    COALESCE(p_config->>'display_name', v_slug),
    p_config->>'description',
    COALESCE((p_config->>'is_popular')::boolean, false),
    COALESCE((p_config->>'is_active')::boolean, true),
    COALESCE((p_config->>'sort_order')::integer, 99),
    COALESCE((p_config->>'price_monthly_cents')::integer, 0),
    COALESCE((p_config->>'price_yearly_cents')::integer, 0),
    NULLIF((p_config->>'max_pipelines'), '')::integer,
    NULLIF((p_config->>'max_leads'), '')::integer,
    NULLIF((p_config->>'max_users'), '')::integer,
    NULLIF((p_config->>'max_agents'), '')::integer,
    NULLIF((p_config->>'max_whatsapp_instances'), '')::integer,
    NULLIF((p_config->>'max_playbooks'), '')::integer,
    NULLIF((p_config->>'max_custom_fields'), '')::integer,
    COALESCE((p_config->>'has_whatsapp')::boolean, false),
    COALESCE((p_config->>'has_ai_sdr')::boolean, false),
    COALESCE((p_config->>'has_ai_closer')::boolean, false),
    COALESCE((p_config->>'has_ai_followup')::boolean, false),
    COALESCE((p_config->>'has_portfolio')::boolean, false),
    COALESCE((p_config->>'has_reports_advanced')::boolean, false),
    COALESCE((p_config->>'has_api_access')::boolean, false),
    COALESCE((p_config->>'has_priority_support')::boolean, false),
    COALESCE((p_config->>'has_dedicated_onboarding')::boolean, false),
    COALESCE((p_config->>'has_community')::boolean, false),
    COALESCE((p_config->>'has_custom_fields')::boolean, false),
    COALESCE((p_config->>'has_sla')::boolean, false),
    COALESCE(p_config->'allowed_agents', '[]'::jsonb)
  )
  ON CONFLICT (slug) DO UPDATE SET
    display_name             = EXCLUDED.display_name,
    description              = EXCLUDED.description,
    is_popular               = EXCLUDED.is_popular,
    is_active                = EXCLUDED.is_active,
    sort_order               = EXCLUDED.sort_order,
    price_monthly_cents      = EXCLUDED.price_monthly_cents,
    price_yearly_cents       = EXCLUDED.price_yearly_cents,
    max_pipelines            = EXCLUDED.max_pipelines,
    max_leads                = EXCLUDED.max_leads,
    max_users                = EXCLUDED.max_users,
    max_agents               = EXCLUDED.max_agents,
    max_whatsapp_instances   = EXCLUDED.max_whatsapp_instances,
    max_playbooks            = EXCLUDED.max_playbooks,
    max_custom_fields        = EXCLUDED.max_custom_fields,
    has_whatsapp             = EXCLUDED.has_whatsapp,
    has_ai_sdr               = EXCLUDED.has_ai_sdr,
    has_ai_closer            = EXCLUDED.has_ai_closer,
    has_ai_followup          = EXCLUDED.has_ai_followup,
    has_portfolio            = EXCLUDED.has_portfolio,
    has_reports_advanced     = EXCLUDED.has_reports_advanced,
    has_api_access           = EXCLUDED.has_api_access,
    has_priority_support     = EXCLUDED.has_priority_support,
    has_dedicated_onboarding = EXCLUDED.has_dedicated_onboarding,
    has_community            = EXCLUDED.has_community,
    has_custom_fields        = EXCLUDED.has_custom_fields,
    has_sla                  = EXCLUDED.has_sla,
    allowed_agents           = EXCLUDED.allowed_agents,
    updated_at               = now()
  RETURNING * INTO v_result;

  RETURN row_to_json(v_result)::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_plan_config(JSONB) TO authenticated;
