-- ============================================================
-- Migration 122: Backoffice admin — plataforma NextSales
-- ============================================================

-- Helper: verifica se o JWT atual tem role platform_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin',
    false
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- ============================================================
-- HELPER: mapa de preços (R$ centavos/mês)
-- ============================================================
CREATE OR REPLACE FUNCTION public.plan_mrr_cents(p_slug TEXT, p_interval TEXT DEFAULT 'monthly')
RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_slug
    WHEN 'starter' THEN CASE p_interval WHEN 'yearly' THEN ROUND(29700 * 10.0 / 12)::INTEGER ELSE 29700 END
    WHEN 'growth'  THEN CASE p_interval WHEN 'yearly' THEN ROUND(69700 * 10.0 / 12)::INTEGER ELSE 69700 END
    WHEN 'scale'   THEN CASE p_interval WHEN 'yearly' THEN ROUND(149700 * 10.0 / 12)::INTEGER ELSE 149700 END
    ELSE 0
  END
$$;

-- ============================================================
-- RPC: KPIs da plataforma
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_kpis()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN jsonb_build_object(
    'total_companies',  (SELECT COUNT(*) FROM companies),
    'active',           (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
    'trialing',         (SELECT COUNT(*) FROM subscriptions WHERE status = 'trialing'),
    'past_due',         (SELECT COUNT(*) FROM subscriptions WHERE status = 'past_due'),
    'canceled',         (SELECT COUNT(*) FROM subscriptions WHERE status = 'canceled'),
    'new_last_30d',     (SELECT COUNT(*) FROM companies WHERE created_at >= NOW() - INTERVAL '30 days'),
    'total_users',      (SELECT COUNT(*) FROM profiles WHERE is_active = true),
    'mrr_cents',        (
      SELECT COALESCE(SUM(
        public.plan_mrr_cents(s.plan_slug, COALESCE(s.billing_interval, 'monthly'))
      ), 0)
      FROM subscriptions s
      WHERE s.status IN ('active', 'past_due')
    ),
    'mrr_by_plan',      (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'plan',      sub.plan_slug,
        'count',     sub.cnt,
        'mrr_cents', sub.mrr
      )), '[]'::jsonb)
      FROM (
        SELECT
          s.plan_slug,
          COUNT(*)::INTEGER AS cnt,
          SUM(public.plan_mrr_cents(s.plan_slug, COALESCE(s.billing_interval, 'monthly')))::INTEGER AS mrr
        FROM subscriptions s
        WHERE s.status IN ('active', 'past_due')
        GROUP BY s.plan_slug
      ) sub
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_kpis() TO authenticated;

-- ============================================================
-- RPC: listagem paginada de companies
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_companies(
  p_limit   INT     DEFAULT 50,
  p_offset  INT     DEFAULT 0,
  p_status  TEXT    DEFAULT NULL,
  p_plan    TEXT    DEFAULT NULL,
  p_search  TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          c.id                                          AS company_id,
          c.name                                        AS company_name,
          c.created_at,
          c.plan_slug                                   AS company_plan_slug,
          c.plan_status                                 AS company_plan_status,
          c.trial_ends_at,
          COALESCE(s.plan_slug,   c.plan_slug)          AS plan_slug,
          COALESCE(s.status,      c.plan_status)        AS sub_status,
          s.current_period_end,
          s.grace_period_end,
          s.billing_interval,
          (
            SELECT COUNT(*) FROM profiles p2
            WHERE p2.company_id = c.id AND p2.is_active = true
          )                                             AS member_count,
          (
            SELECT COUNT(*) FROM leads l
            WHERE l.company_id = c.id
          )                                             AS lead_count,
          (
            SELECT p3.email FROM profiles p3
            WHERE p3.company_id = c.id AND p3.role = 'admin'
            ORDER BY p3.created_at ASC
            LIMIT 1
          )                                             AS owner_email
        FROM companies c
        LEFT JOIN subscriptions s ON s.company_id = c.id
        WHERE
          (p_status IS NULL OR COALESCE(s.status, c.plan_status) = p_status)
          AND (p_plan IS NULL OR COALESCE(s.plan_slug, c.plan_slug) = p_plan)
          AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%')
        ORDER BY c.created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) t
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_companies(INT, INT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- RPC: listagem de usuários
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_limit  INT  DEFAULT 100,
  p_offset INT  DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          u.id                                                          AS user_id,
          u.email,
          u.created_at,
          u.last_sign_in_at,
          (u.banned_until IS NOT NULL AND u.banned_until > NOW())       AS is_disabled,
          pr.name                                                        AS full_name,
          pr.role,
          pr.company_id,
          c.name                                                         AS company_name,
          COALESCE(s.plan_slug, c.plan_slug)                             AS plan_slug,
          COALESCE(s.status, c.plan_status)                              AS sub_status
        FROM auth.users u
        LEFT JOIN public.profiles pr ON pr.id = u.id
        LEFT JOIN public.companies c  ON c.id = pr.company_id
        LEFT JOIN public.subscriptions s ON s.company_id = c.id
        WHERE
          (
            p_search IS NULL
            OR u.email ILIKE '%' || p_search || '%'
            OR pr.name ILIKE '%' || p_search || '%'
          )
        ORDER BY u.created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) t
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(INT, INT, TEXT) TO authenticated;

-- ============================================================
-- RPC: banir/desbanir usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_banned(
  p_user_id UUID,
  p_banned  BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_banned AND (
    SELECT COALESCE((raw_app_meta_data ->> 'role') = 'platform_admin', false)
    FROM auth.users WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Não é permitido desabilitar outro administrador da plataforma';
  END IF;

  UPDATE auth.users
  SET banned_until = CASE WHEN p_banned THEN 'infinity'::timestamptz ELSE NULL END
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_banned(UUID, BOOLEAN) TO authenticated;

-- ============================================================
-- RPC: atualizar plano de uma empresa manualmente
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_update_company_plan(
  p_company_id UUID,
  p_plan_slug  TEXT,
  p_status     TEXT DEFAULT 'active'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.companies
  SET plan_slug = p_plan_slug, plan_status = p_status, updated_at = NOW()
  WHERE id = p_company_id;

  UPDATE public.subscriptions
  SET plan_slug = p_plan_slug, status = p_status, updated_at = NOW()
  WHERE company_id = p_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_company_plan(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================
-- RPC: últimas faturas (cross-tenant)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_invoices(p_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          i.id,
          i.company_id,
          c.name   AS company_name,
          i.plan_slug,
          i.status,
          i.payment_type,
          i.amount_cents,
          i.due_date,
          i.paid_at,
          i.created_at
        FROM invoices i
        LEFT JOIN companies c ON c.id = i.company_id
        ORDER BY i.created_at DESC
        LIMIT p_limit
      ) t
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_invoices(INT) TO authenticated;
