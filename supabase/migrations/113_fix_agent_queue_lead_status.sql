-- Migration 111: fix get_agent_lead_queue to exclude closed leads
--
-- Problem: leads with status 'GANHO' or 'PERDIDO' were still appearing in the
--          agent work queue (WF-06), triggering unintended follow-up messages.
--
-- Fix: added `AND l.status NOT IN ('GANHO', 'PERDIDO')` to the WHERE clause,
--      immediately after the `AND (l.deleted_at IS NULL)` guard, so that
--      closed/won/lost leads are blocked from the queue at the DB level.

DROP FUNCTION IF EXISTS public.get_agent_lead_queue(uuid, int);

CREATE OR REPLACE FUNCTION public.get_agent_lead_queue(
  p_agent_id uuid,
  p_limit    int DEFAULT 20
)
RETURNS TABLE (
  lead_id         uuid,
  lead_name       text,
  lead_phone      text,
  column_id       text,
  conversation_id uuid,
  conv_status     text,
  memory_stage    text,
  next_action_at  timestamptz,
  approach_count  integer,
  followup_count  integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id    uuid;
  v_max_followups int;
BEGIN
  SELECT
    a.company_id,
    COALESCE((a.escalate_rules->>'max_followups')::int, 5)
  INTO
    v_company_id,
    v_max_followups
  FROM public.ai_agents a
  WHERE a.id = p_agent_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'agent not found: %', p_agent_id;
  END IF;

  RETURN QUERY
  SELECT
    l.id                          AS lead_id,
    l.name                        AS lead_name,
    l.phone                       AS lead_phone,
    l.column_id                   AS column_id,
    c.id                          AS conversation_id,
    c.status                      AS conv_status,
    COALESCE(m.stage, 'new')      AS memory_stage,
    m.next_action_at              AS next_action_at,
    COALESCE(m.approach_count, 0) AS approach_count,
    COALESCE(m.followup_count, 0) AS followup_count

  FROM public.leads l

  LEFT JOIN public.conversations c
    ON  c.lead_id    = l.id
    AND c.company_id = v_company_id
    AND c.status     NOT IN ('resolved')

  LEFT JOIN public.agent_lead_memory m
    ON  m.agent_id = p_agent_id
    AND m.lead_id  = l.id

  LEFT JOIN LATERAL (
    SELECT COALESCE(
      MAX(msg_in.created_at),
      '-infinity'::timestamptz
    ) AS last_inbound_at
    FROM public.messages msg_in
    WHERE msg_in.conversation_id = c.id
      AND msg_in.direction       = 'inbound'
  ) last_in ON (c.id IS NOT NULL)

  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS agent_seq_count
    FROM public.messages msg_out
    WHERE msg_out.conversation_id = c.id
      AND msg_out.direction       = 'outbound'
      AND msg_out.sender_type     IN ('agent', 'bot')
      AND msg_out.created_at      > last_in.last_inbound_at
  ) agent_seq ON (c.id IS NOT NULL)

  WHERE
    l.company_id = v_company_id
    AND (l.is_archived IS NULL OR l.is_archived = false)
    AND (l.deleted_at  IS NULL)
    AND l.status NOT IN ('GANHO', 'PERDIDO')   -- bloqueia leads encerrados da fila

    AND (
      m.id IS NULL
      OR (m.next_action_at IS NOT NULL AND m.next_action_at <= now())
    )

    AND COALESCE(m.stage, 'new') NOT IN ('closed_won', 'closed_lost', 'inactive')

    AND (c.id IS NULL OR c.status = 'waiting')

    AND NOT EXISTS (
      SELECT 1
      FROM   public.messages   cooldown_msg
      JOIN   public.conversations c_cd
        ON   c_cd.id          = cooldown_msg.conversation_id
      WHERE  c_cd.lead_id     = l.id
        AND  c_cd.company_id  = v_company_id
        AND  cooldown_msg.sender_type = 'agent'
        AND  cooldown_msg.created_at  > now() - INTERVAL '4 hours'
    )

    AND (
      c.id IS NULL
      OR COALESCE(agent_seq.agent_seq_count, 0) < v_max_followups
    )

  ORDER BY
    CASE WHEN m.next_action_at IS NOT NULL AND m.next_action_at <= now() THEN 0 ELSE 1 END,
    m.next_action_at ASC NULLS LAST,
    l.created_at ASC

  LIMIT p_limit;
END;
$$;

REVOKE ALL    ON FUNCTION public.get_agent_lead_queue(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_agent_lead_queue(uuid, int) TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_agent_lead_queue(uuid, int) TO authenticated;

NOTIFY pgrst, 'reload schema';
