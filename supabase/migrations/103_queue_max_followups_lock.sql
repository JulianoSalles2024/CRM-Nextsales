-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 103 · get_agent_lead_queue — max_followups lock baseado em mensagens
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA RESOLVIDO:
--   O limite max_followups configurado no agente (escalate_rules->>'max_followups')
--   não era respeitado pelo WF-06 porque a única fonte de contagem era
--   agent_lead_memory.followup_count — tabela que pode ficar órfã se algum
--   trigger falhar em criar o registro.
--
-- PRINCÍPIO — Single Source of Truth:
--   A contagem é feita diretamente em public.messages, que é o registro real e
--   imutável do que foi enviado. Não depende de nenhuma tabela auxiliar.
--
-- LÓGICA DE CONTAGEM:
--   Para cada lead com conversa ativa, conta as mensagens consecutivas de saída
--   do agente/bot (sender_type IN ('agent','bot'), direction='outbound') DESDE
--   a última mensagem de entrada do lead (direction='inbound') ou desde o início
--   da conversa se não houver nenhuma resposta.
--
--   Se essa contagem >= max_followups do agente → lead NÃO retorna na fila.
--   Lead sem conversa ainda (c.id IS NULL) → sempre elegível para primeira abordagem.
--   Lead que respondeu → contador reinicia (contagem após última resposta).
--
-- EFICIÊNCIA:
--   Dois LATERAL JOINs com index scan em messages(conversation_id, direction,
--   created_at) e messages(conversation_id, direction, sender_type, created_at).
--   max_followups resolvido em um único SELECT na tabela ai_agents (1 row).
--   O filtro de cooldown de 4h (migration 102) permanece como guarda primário;
--   este filtro é o guarda definitivo.
--
-- EXEMPLOS:
--   max_followups=2, agente enviou 2 mensagens, lead não respondeu → BLOQUEADO
--   max_followups=2, agente enviou 2 mensagens, lead respondeu depois → LIBERADO
--   max_followups=2, agente enviou 1 mensagem → LIBERADO (1 < 2)
--   Lead sem conversa → LIBERADO (primeira abordagem)
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
  v_company_id    uuid;
  v_max_followups int;
BEGIN
  -- Resolve company e max_followups em uma única leitura da tabela ai_agents
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

  -- Conversa ativa do lead (se existir)
  LEFT JOIN public.conversations c
    ON  c.lead_id    = l.id
    AND c.company_id = v_company_id
    AND c.status     NOT IN ('resolved')

  -- Memória do agente para este lead (pode ser NULL)
  LEFT JOIN public.agent_lead_memory m
    ON  m.agent_id = p_agent_id
    AND m.lead_id  = l.id

  -- LATERAL 1: created_at da última mensagem inbound do lead nesta conversa
  -- Retorna '-infinity' se não há nenhuma mensagem do lead (nunca respondeu)
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      MAX(msg_in.created_at),
      '-infinity'::timestamptz
    ) AS last_inbound_at
    FROM public.messages msg_in
    WHERE msg_in.conversation_id = c.id
      AND msg_in.direction       = 'inbound'
  ) last_in ON (c.id IS NOT NULL)

  -- LATERAL 2: quantas mensagens outbound de agent/bot foram enviadas
  -- APÓS a última resposta do lead (ou desde o início se nunca respondeu)
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

    -- Leads sem memória (novos) OU com next_action_at vencido
    AND (
      m.id IS NULL
      OR (m.next_action_at IS NOT NULL AND m.next_action_at <= now())
    )

    -- Ignorar leads já em estágio terminal
    AND COALESCE(m.stage, 'new') NOT IN ('closed_won', 'closed_lost', 'inactive')

    -- Conversa aguardando resposta ou lead ainda sem conversa
    AND (c.id IS NULL OR c.status = 'waiting')

    -- ── COOLDOWN 4h (migration 102) ─────────────────────────────────────────
    -- Guarda primário: impede re-disparo imediato mesmo sem memória
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

    -- ── MAX FOLLOWUPS (migration 103) ────────────────────────────────────────
    -- Guarda definitivo: bloqueia quando atingiu o limite de tentativas sem resposta.
    -- Lead sem conversa (c.id IS NULL) → sempre elegível para primeira abordagem.
    -- Lead com conversa → conta mensagens consecutivas do agente/bot desde a
    -- última resposta. Se >= max_followups → excluído da fila.
    AND (
      c.id IS NULL
      OR COALESCE(agent_seq.agent_seq_count, 0) < v_max_followups
    )

  ORDER BY
    -- Prioridade 1: next_action_at vencido (WF-08 agendou contato)
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
