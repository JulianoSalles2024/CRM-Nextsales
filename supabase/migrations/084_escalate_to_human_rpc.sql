-- ═══════════════════════════════════════════════════════════════════
-- Migration 084 · RPC escalate_to_human
-- Escala conversa do agente IA para um humano de forma atômica:
--   1. Remove o agente IA da conversa (ai_agent_id = NULL)
--   2. Define status = 'in_progress'
--   3. Garante que o assignee_id é o owner do canal (ou mantém o atual)
--   4. Cria notificação para o vendedor responsável
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.escalate_to_human(
  p_conversation_id uuid,
  p_company_id      uuid,
  p_reason          text DEFAULT 'Escalado pelo agente IA'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id        uuid;
  v_lead_name      text;
  v_assignee_id    uuid;
  v_channel_conn   uuid;
BEGIN

  -- ── 1. Busca dados da conversa ─────────────────────────────────────
  SELECT lead_id, assignee_id, channel_connection_id
  INTO   v_lead_id, v_assignee_id, v_channel_conn
  FROM   public.conversations
  WHERE  id         = p_conversation_id
    AND  company_id = p_company_id;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'conversation_not_found');
  END IF;

  -- ── 2. Se não há assignee, tenta o owner do canal ─────────────────
  IF v_assignee_id IS NULL AND v_channel_conn IS NOT NULL THEN
    SELECT owner_id INTO v_assignee_id
    FROM   public.channel_connections
    WHERE  id = v_channel_conn;
  END IF;

  -- ── 3. Nome do lead para a notificação ────────────────────────────
  SELECT name INTO v_lead_name
  FROM   public.leads
  WHERE  id = v_lead_id;

  -- ── 4. Atualiza a conversa: remove IA, coloca in_progress ─────────
  UPDATE public.conversations
  SET    ai_agent_id = NULL,
         status      = 'in_progress',
         assignee_id = COALESCE(v_assignee_id, assignee_id),
         updated_at  = now()
  WHERE  id         = p_conversation_id
    AND  company_id = p_company_id;

  -- ── 5. Cria notificação para o humano responsável ─────────────────
  INSERT INTO public.notifications (
    company_id, user_id, type, title, body, lead_id, metadata
  ) VALUES (
    p_company_id,
    v_assignee_id,
    'human_escalation',
    'Atendimento aguardando você',
    COALESCE(v_lead_name, 'Lead') || ' precisa de atendimento humano. ' || p_reason,
    v_lead_id,
    jsonb_build_object(
      'conversation_id', p_conversation_id,
      'reason',          p_reason
    )
  );

  -- ── 6. Resultado ──────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success',       true,
    'assignee_id',   v_assignee_id,
    'lead_id',       v_lead_id
  );

END;
$$;

REVOKE ALL   ON FUNCTION public.escalate_to_human(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escalate_to_human(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.escalate_to_human(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
