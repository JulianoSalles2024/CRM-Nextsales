-- Migration 102 · Fix get_agent_lead_queue — column_id type text (not uuid)
-- leads.column_id is text in the live schema; the previous migration declared
-- it as uuid causing a type mismatch error.

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
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.ai_agents
  WHERE id = p_agent_id;

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
  WHERE
    l.company_id = v_company_id
    AND (l.is_archived IS NULL OR l.is_archived = false)
    AND (l.deleted_at IS NULL)
    AND (
      m.id IS NULL
      OR (m.next_action_at IS NOT NULL AND m.next_action_at <= now())
    )
    AND COALESCE(m.stage, 'new') NOT IN ('closed_won','closed_lost','inactive')
    AND (c.id IS NULL OR c.status = 'waiting')
    -- COOLDOWN: não retornar lead se o agente mandou mensagem nas últimas 4h
    AND NOT EXISTS (
      SELECT 1
      FROM   public.messages   msg
      JOIN   public.conversations c2
        ON   c2.id         = msg.conversation_id
      WHERE  c2.lead_id    = l.id
        AND  c2.company_id = v_company_id
        AND  msg.sender_type = 'agent'
        AND  msg.created_at  > now() - INTERVAL '4 hours'
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
