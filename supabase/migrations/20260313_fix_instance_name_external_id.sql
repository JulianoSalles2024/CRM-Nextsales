-- Fix: use external_id (Evolution API instance name) instead of display name
-- cc.external_id = Evolution API instance name (e.g. "nextsale-teste")
-- cc.name        = display name (e.g. "WhatsApp Principal")

CREATE OR REPLACE FUNCTION public.get_pending_followups()
RETURNS TABLE (
  conversation_id      uuid,
  company_id           uuid,
  contact_identifier   text,
  contact_name         text,
  agent_name           text,
  company_name         text,
  instance_name        text,
  prompt_rule          text,
  next_followup_step   integer,
  conversation_history jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  WITH tz_ctx AS (
    SELECT
      now() AT TIME ZONE 'America/Sao_Paulo'                           AS now_sp,
      lower(to_char(
        now() AT TIME ZONE 'America/Sao_Paulo', 'FMDay'
      ))                                                               AS current_dow,
      (now() AT TIME ZONE 'America/Sao_Paulo')::time                  AS current_tod
  )
  SELECT
    c.id                                                               AS conversation_id,
    c.company_id,
    c.contact_identifier,
    COALESCE(c.contact_name, c.contact_identifier)                     AS contact_name,
    COALESCE(p.name, 'Agente')                                         AS agent_name,
    COALESCE(co.name, '')                                              AS company_name,
    COALESCE(cc.external_id, cc.name, '')                              AS instance_name,
    r.prompt                                                           AS prompt_rule,
    r.sequence_order                                                   AS next_followup_step,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'direction',  hist.direction,
            'content',    hist.content,
            'created_at', hist.created_at
          )
          ORDER BY hist.created_at ASC
        )
        FROM (
          SELECT direction, content, created_at
          FROM   public.messages
          WHERE  conversation_id = c.id
            AND  company_id      = c.company_id
            AND  sender_type    != 'system'
            AND  content        IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 10
        ) hist
      ),
      '[]'::jsonb
    )                                                                  AS conversation_history
  FROM public.conversations c
  JOIN public.followup_rules r
    ON  r.company_id      = c.company_id
    AND r.sequence_order  = c.current_followup_step + 1
  LEFT JOIN public.profiles p
    ON  p.id         = c.assignee_id
    AND p.company_id = c.company_id
  LEFT JOIN public.companies co
    ON  co.id = c.company_id
  LEFT JOIN public.channel_connections cc
    ON  cc.id         = c.channel_connection_id
    AND cc.company_id = c.company_id
  CROSS JOIN tz_ctx
  WHERE
    c.status = 'in_progress'
    AND c.last_message_at IS NOT NULL
    AND GREATEST(
          c.last_message_at,
          COALESCE(c.last_followup_sent_at, '-infinity'::timestamptz)
        )
        + make_interval(
            mins  := CASE WHEN r.delay_unit = 'minutes' THEN r.delay_value ELSE 0 END,
            hours := CASE WHEN r.delay_unit = 'hours'   THEN r.delay_value ELSE 0 END,
            days  := CASE WHEN r.delay_unit = 'days'    THEN r.delay_value ELSE 0 END
          )
        <= now()
    AND r.allowed_days ? tz_ctx.current_dow
    AND tz_ctx.current_tod BETWEEN r.allowed_start_time AND r.allowed_end_time
  ;
$$;

REVOKE ALL     ON FUNCTION public.get_pending_followups() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_pending_followups() TO service_role;

NOTIFY pgrst, 'reload schema';
