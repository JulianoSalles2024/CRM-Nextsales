-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 101 · get_agent_lead_queue — Cooldown de contacto recente
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA RESOLVIDO:
--   Leads sem registro em agent_lead_memory (m.id IS NULL) retornavam na fila
--   em TODA execução do WF-06 (a cada 30 min), gerando spam de mensagens
--   idênticas. 43 mensagens foram enviadas para o mesmo lead em ~5 horas.
--
-- CAUSA RAIZ:
--   get_agent_lead_queue v1 incluía leads onde m.id IS NULL sem qualquer
--   verificação de contato recente. Leads sem memória nunca "desapareciam"
--   da fila porque o PATCH do WF-06 (next_action_at = null) não tinha target
--   em agent_lead_memory.
--
-- SOLUÇÃO:
--   Adicionar filtro NOT EXISTS que verifica a última mensagem outbound do
--   agente na conversa ativa. Se há mensagem de agente nas últimas 4h, o lead
--   não entra na fila proativa — independente de ter ou não registro de memória.
--   4 horas é o cooldown mínimo; para follow-ups mais frequentes, o agente
--   deve usar a tool agendar_followup (WF-08 cuida desses).
--
-- ═══════════════════════════════════════════════════════════════════════════════

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
  -- Join com conversa ativa (se existir)
  LEFT JOIN public.conversations c
    ON  c.lead_id    = l.id
    AND c.company_id = v_company_id
    AND c.status     NOT IN ('resolved')
  -- Join com memória do agente (se existir)
  LEFT JOIN public.agent_lead_memory m
    ON  m.agent_id = p_agent_id
    AND m.lead_id  = l.id
  WHERE
    l.company_id = v_company_id
    AND (l.is_archived IS NULL OR l.is_archived = false)
    AND (l.deleted_at IS NULL)
    -- Inclui leads sem memória (novos) OU com next_action_at vencido
    AND (
      m.id IS NULL
      OR (m.next_action_at IS NOT NULL AND m.next_action_at <= now())
    )
    -- Não inclui leads já ganhos/perdidos ou inativos
    AND COALESCE(m.stage, 'new') NOT IN ('closed_won','closed_lost','inactive')
    -- Conversa deve estar aguardando (ou não existir — para abordagem inicial)
    AND (c.id IS NULL OR c.status = 'waiting')
    -- ── COOLDOWN: não retornar lead se o agente mandou mensagem nas últimas 4h ──
    -- Protege tanto leads sem memória (m.id IS NULL) quanto leads com next_action_at
    -- vencido que já foram contatados recentemente.
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
    -- Leads com next_action_at vencido têm prioridade
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
