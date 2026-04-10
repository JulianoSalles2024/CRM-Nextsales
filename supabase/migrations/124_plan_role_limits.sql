-- ============================================================
-- Migration 124: limites por papel (vendedores e admins) nos planos
-- ============================================================

-- Adiciona colunas à plan_configs
ALTER TABLE public.plan_configs
  ADD COLUMN IF NOT EXISTS max_sellers INTEGER,   -- NULL = ilimitado
  ADD COLUMN IF NOT EXISTS max_admins  INTEGER;   -- NULL = ilimitado

-- Atualiza seed com valores por plano
UPDATE public.plan_configs SET max_sellers = 1,    max_admins = 1    WHERE slug = 'trial';
UPDATE public.plan_configs SET max_sellers = 2,    max_admins = 1    WHERE slug = 'starter';
UPDATE public.plan_configs SET max_sellers = 10,   max_admins = 3    WHERE slug = 'growth';
UPDATE public.plan_configs SET max_sellers = NULL, max_admins = NULL WHERE slug = 'scale';

-- Atualiza a RPC get_my_plan_limits (retorna row_to_json — as colunas novas aparecem automaticamente)
-- Nenhuma alteração necessária na RPC pois usa SELECT * via row_to_json.

-- Atualiza admin_upsert_plan_config para aceitar os novos campos
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
    max_sellers, max_admins,
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
    NULLIF((p_config->>'max_sellers'), '')::integer,
    NULLIF((p_config->>'max_admins'), '')::integer,
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
    max_sellers              = EXCLUDED.max_sellers,
    max_admins               = EXCLUDED.max_admins,
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
