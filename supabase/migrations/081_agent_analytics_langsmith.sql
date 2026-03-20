-- ═══════════════════════════════════════════════════════════════════
-- Migration 081 · Agent Analytics + LangSmith columns
-- Adds cost_usd, duration_ms, langsmith_run_id to agent_runs
-- Adds cost_usd to agent_performance
-- Updates aggregate_agent_performance and get_agent_ranking RPCs
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. agent_runs — new columns ────────────────────────────────────
ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS cost_usd         numeric(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms      integer       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS langsmith_run_id text;

-- ── 2. agent_performance — add cost_usd ────────────────────────────
ALTER TABLE public.agent_performance
  ADD COLUMN IF NOT EXISTS cost_usd numeric(10,4) NOT NULL DEFAULT 0;

-- ── 3. aggregate_agent_performance — include cost_usd ──────────────
DROP FUNCTION IF EXISTS public.aggregate_agent_performance(uuid, date);

CREATE OR REPLACE FUNCTION public.aggregate_agent_performance(
  p_company_id uuid,
  p_date       date DEFAULT (current_date - interval '1 day')::date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agent_performance (
    agent_id, company_id, period_date,
    approaches, responses, qualified, meetings, sales, escalations,
    revenue, tokens_used, cost_usd
  )
  SELECT
    r.agent_id,
    p_company_id,
    p_date,
    COUNT(*) FILTER (WHERE r.run_type = 'approach')                           AS approaches,
    COUNT(*) FILTER (WHERE r.outcome  = 'responded')                          AS responses,
    COUNT(*) FILTER (WHERE r.outcome  = 'qualified')                          AS qualified,
    COUNT(*) FILTER (WHERE r.outcome  = 'meeting_scheduled')                  AS meetings,
    COUNT(*) FILTER (WHERE r.outcome  = 'sale')                               AS sales,
    COUNT(*) FILTER (WHERE r.outcome  = 'escalated')                          AS escalations,
    0                                                                         AS revenue,
    COALESCE(SUM(r.tokens_input + r.tokens_output), 0)                        AS tokens_used,
    COALESCE(SUM(r.cost_usd), 0)                                              AS cost_usd
  FROM public.agent_runs r
  WHERE r.company_id = p_company_id
    AND r.created_at >= p_date::timestamptz
    AND r.created_at <  (p_date + interval '1 day')::timestamptz
  GROUP BY r.agent_id
  ON CONFLICT ON CONSTRAINT uq_agent_performance_day DO UPDATE SET
    approaches  = EXCLUDED.approaches,
    responses   = EXCLUDED.responses,
    qualified   = EXCLUDED.qualified,
    meetings    = EXCLUDED.meetings,
    sales       = EXCLUDED.sales,
    escalations = EXCLUDED.escalations,
    tokens_used = EXCLUDED.tokens_used,
    cost_usd    = EXCLUDED.cost_usd;
END;
$$;

REVOKE ALL ON FUNCTION public.aggregate_agent_performance(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aggregate_agent_performance(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.aggregate_agent_performance(uuid, date) TO authenticated;


-- ── 4. get_agent_ranking — include cost ────────────────────────────
DROP FUNCTION IF EXISTS public.get_agent_ranking(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_agent_ranking(
  p_company_id uuid,
  p_start      date DEFAULT (date_trunc('month', current_date))::date,
  p_end        date DEFAULT current_date
)
RETURNS TABLE (
  agent_id          uuid,
  agent_name        text,
  function_type     text,
  avatar_color      text,
  is_active         boolean,
  total_approaches  integer,
  total_responses   integer,
  total_qualified   integer,
  total_meetings    integer,
  total_sales       integer,
  total_escalations integer,
  total_revenue     numeric,
  total_tokens      integer,
  total_cost        numeric,
  response_rate     numeric,
  conversion_rate   numeric,
  avg_duration_ms   integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id                                                                        AS agent_id,
    a.name                                                                      AS agent_name,
    a.function_type,
    a.avatar_color,
    a.is_active,
    COALESCE(SUM(p.approaches)::integer,    0)                                  AS total_approaches,
    COALESCE(SUM(p.responses)::integer,     0)                                  AS total_responses,
    COALESCE(SUM(p.qualified)::integer,     0)                                  AS total_qualified,
    COALESCE(SUM(p.meetings)::integer,      0)                                  AS total_meetings,
    COALESCE(SUM(p.sales)::integer,         0)                                  AS total_sales,
    COALESCE(SUM(p.escalations)::integer,   0)                                  AS total_escalations,
    COALESCE(SUM(p.revenue),                0)                                  AS total_revenue,
    COALESCE(SUM(p.tokens_used)::integer,   0)                                  AS total_tokens,
    COALESCE(SUM(p.cost_usd),               0)                                  AS total_cost,
    CASE
      WHEN COALESCE(SUM(p.approaches), 0) = 0 THEN 0
      ELSE ROUND(SUM(p.responses)::numeric / SUM(p.approaches) * 100, 1)
    END                                                                         AS response_rate,
    CASE
      WHEN COALESCE(SUM(p.meetings), 0) = 0 THEN 0
      ELSE ROUND(SUM(p.sales)::numeric / NULLIF(SUM(p.meetings), 0) * 100, 1)
    END                                                                         AS conversion_rate,
    COALESCE(
      (SELECT AVG(r.duration_ms)::integer
       FROM public.agent_runs r
       WHERE r.agent_id   = a.id
         AND r.created_at >= p_start::timestamptz
         AND r.created_at <= (p_end + interval '1 day')::timestamptz
         AND r.duration_ms > 0),
      0
    )                                                                           AS avg_duration_ms
  FROM public.ai_agents a
  LEFT JOIN public.agent_performance p
    ON  p.agent_id    = a.id
    AND p.period_date >= p_start
    AND p.period_date <= p_end
  WHERE a.company_id  = p_company_id
    AND a.is_archived = false
  GROUP BY a.id, a.name, a.function_type, a.avatar_color, a.is_active
  ORDER BY total_revenue DESC, total_sales DESC, total_meetings DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_agent_ranking(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_agent_ranking(uuid, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_agent_ranking(uuid, date, date) TO authenticated;


-- ── 5. get_company_analytics — visão geral da empresa ──────────────
DROP FUNCTION IF EXISTS public.get_company_analytics(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_company_analytics(
  p_company_id uuid,
  p_start      date DEFAULT (date_trunc('month', current_date))::date,
  p_end        date DEFAULT current_date
)
RETURNS TABLE (
  total_runs        bigint,
  total_tokens      bigint,
  total_cost        numeric,
  total_approaches  bigint,
  total_responses   bigint,
  total_qualified   bigint,
  total_meetings    bigint,
  total_sales       bigint,
  avg_response_rate numeric,
  avg_conversion    numeric,
  avg_duration_ms   integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(r.id)                                                               AS total_runs,
    COALESCE(SUM(r.tokens_input + r.tokens_output), 0)                        AS total_tokens,
    COALESCE(SUM(r.cost_usd), 0)                                              AS total_cost,
    COUNT(*) FILTER (WHERE r.run_type = 'approach')                           AS total_approaches,
    COUNT(*) FILTER (WHERE r.outcome  = 'responded')                          AS total_responses,
    COUNT(*) FILTER (WHERE r.outcome  = 'qualified')                          AS total_qualified,
    COUNT(*) FILTER (WHERE r.outcome  = 'meeting_scheduled')                  AS total_meetings,
    COUNT(*) FILTER (WHERE r.outcome  = 'sale')                               AS total_sales,
    CASE
      WHEN COUNT(*) FILTER (WHERE r.run_type = 'approach') = 0 THEN 0
      ELSE ROUND(COUNT(*) FILTER (WHERE r.outcome = 'responded')::numeric
           / COUNT(*) FILTER (WHERE r.run_type = 'approach') * 100, 1)
    END                                                                       AS avg_response_rate,
    CASE
      WHEN COUNT(*) FILTER (WHERE r.outcome = 'meeting_scheduled') = 0 THEN 0
      ELSE ROUND(COUNT(*) FILTER (WHERE r.outcome = 'sale')::numeric
           / NULLIF(COUNT(*) FILTER (WHERE r.outcome = 'meeting_scheduled'), 0) * 100, 1)
    END                                                                       AS avg_conversion,
    COALESCE(AVG(r.duration_ms) FILTER (WHERE r.duration_ms > 0), 0)::integer AS avg_duration_ms
  FROM public.agent_runs r
  WHERE r.company_id = p_company_id
    AND r.created_at >= p_start::timestamptz
    AND r.created_at <  (p_end + interval '1 day')::timestamptz;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_analytics(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_analytics(uuid, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_company_analytics(uuid, date, date) TO authenticated;
