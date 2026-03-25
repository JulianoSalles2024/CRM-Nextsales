-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 100 · RPC close_conversation — Encerramento Unificado
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA RESOLVIDO:
--   Existiam 3 caminhos de encerramento com efeitos colaterais assimétricos:
--   1. IA (WF-07 tool) → só mudava status, sem limpar follow-ups ou marcar lead
--   2. WF-04 (cron)    → completo, mas só para inatividade/exaustão de follow-up
--   3. Botão manual    → só mudava status, sem nenhum cleanup de estado n8n
--
-- SOLUÇÃO:
--   Uma única função atômica chamada pelos 3 caminhos. Garante que o estado
--   do banco seja sempre idêntico, independente de quem disparou o encerramento.
--
-- PARÂMETROS:
--   p_conversation_id · UUID da conversa a encerrar
--   p_company_id      · UUID da empresa (validação de tenant)
--   p_reason          · Texto livre exibido na mensagem de sistema do chat
--   p_outcome         · 'lost'    → lead marcado PERDIDO  (default — inatividade, sem interesse)
--                       'won'     → lead marcado GANHO    (venda concluída)
--                       'neutral' → lead não alterado      (encerramento manual sem julgamento)
--
-- AÇÕES ATÔMICAS (dentro de uma única transação):
--   1. Fecha a conversa: status='resolved', remove ai_agent_id
--   2. Exaure follow-up: current_followup_step=9999 — nenhuma regra de followup_rules
--      terá sequence_order > 9999, então get_pending_followups e
--      get_exhausted_followup_conversations ignoram esta conversa automaticamente
--   3. Arquiva agent_lead_memory: stage=closed_won|closed_lost|inactive,
--      limpa next_action_at — remove o lead da fila get_agent_lead_queue
--   4. Atualiza lead (se outcome != 'neutral'):
--      lost → status='PERDIDO', lost_at=now()
--      won  → status='GANHO',   won_at=now()
--   5. Insere mensagem de sistema no chat com o motivo
--
-- IDEMPOTÊNCIA:
--   - Retorna success=true com reason='already_resolved' se a conversa
--     já estava encerrada — sem erro, sem efeito duplo.
--   - Guards nos UPDATEs de leads evitam sobrescrever estado final duplo.
--
-- GRANTS:
--   service_role  → n8n (WF-07 tool + WF-04 futuro)
--   authenticated → frontend (botão manual via supabase-js com JWT do usuário)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.close_conversation(
  p_conversation_id uuid,
  p_company_id      uuid,
  p_reason          text  DEFAULT 'Conversa encerrada',
  p_outcome         text  DEFAULT 'lost'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id       uuid;
  v_current_status text;
BEGIN

  -- ── Validação de parâmetros ────────────────────────────────────────────────
  IF p_outcome NOT IN ('lost', 'won', 'neutral') THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason',  'invalid_outcome — use: lost | won | neutral'
    );
  END IF;

  -- ── Busca e trava a linha da conversa (FOR UPDATE evita race condition) ────
  SELECT lead_id, status
  INTO   v_lead_id, v_current_status
  FROM   public.conversations
  WHERE  id         = p_conversation_id
    AND  company_id = p_company_id
  FOR UPDATE;

  -- Conversa não existe ou não pertence a esta empresa
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'conversation_not_found');
  END IF;

  -- Já estava encerrada → retorna sucesso sem reprocessar (idempotente)
  IF v_current_status = 'resolved' THEN
    RETURN jsonb_build_object(
      'success',         true,
      'reason',          'already_resolved',
      'lead_id',         v_lead_id,
      'conversation_id', p_conversation_id
    );
  END IF;

  -- ── 1. Encerra a conversa ──────────────────────────────────────────────────
  UPDATE public.conversations
  SET
    status                = 'resolved',
    ai_agent_id           = NULL,           -- remove IA da conversa
    -- Exaure a régua de follow-up: nenhuma followup_rule terá sequence_order > 9999.
    -- Isso protege contra WF-03 (get_pending_followups) disparar mensagens após o
    -- encerramento, mesmo que a RPC do banco não filtre por status='resolved'.
    current_followup_step = 9999,
    last_followup_sent_at = now(),
    updated_at            = now()
  WHERE  id         = p_conversation_id
    AND  company_id = p_company_id;

  -- ── 2. Arquiva a memória do agente ────────────────────────────────────────
  -- Define stage terminal para tirar o lead da fila get_agent_lead_queue.
  -- Limpa next_action_at para que nenhum agente tente uma nova abordagem.
  IF v_lead_id IS NOT NULL THEN
    UPDATE public.agent_lead_memory
    SET
      stage            = CASE p_outcome
                           WHEN 'won'  THEN 'closed_won'
                           WHEN 'lost' THEN 'closed_lost'
                           ELSE             'inactive'
                         END,
      next_action      = NULL,
      next_action_at   = NULL,
      next_action_type = 'none',
      last_action      = 'conversation_closed',
      last_action_at   = now(),
      updated_at       = now()
    WHERE  lead_id    = v_lead_id
      AND  company_id = p_company_id;
    -- Nota: afeta TODOS os agentes com memória deste lead (SDR e Closer).
    -- Se o lead voltar a falar, um novo ciclo de abordagem deve ser iniciado
    -- manualmente via painel — comportamento intencional.
  END IF;

  -- ── 3. Atualiza o status do lead ──────────────────────────────────────────
  IF v_lead_id IS NOT NULL THEN
    IF p_outcome = 'lost' THEN
      UPDATE public.leads
      SET
        status     = 'PERDIDO',
        lost_at    = now(),
        updated_at = now()
      WHERE  id         = v_lead_id
        AND  company_id = p_company_id
        AND  status    <> 'PERDIDO';   -- guard idempotente
    ELSIF p_outcome = 'won' THEN
      UPDATE public.leads
      SET
        status     = 'GANHO',
        won_at     = now(),
        updated_at = now()
      WHERE  id         = v_lead_id
        AND  company_id = p_company_id
        AND  status    <> 'GANHO';    -- guard idempotente
    END IF;
    -- p_outcome = 'neutral' → status do lead não é alterado (decisão humana posterior)
  END IF;

  -- ── 4. Insere mensagem de sistema no chat ─────────────────────────────────
  INSERT INTO public.messages (
    company_id,
    conversation_id,
    direction,
    sender_type,
    content,
    content_type,
    status
  ) VALUES (
    p_company_id,
    p_conversation_id,
    NULL,         -- direction nullable desde migration 040
    'system',
    'Conversa encerrada. Motivo: ' || p_reason,
    'text',
    NULL
  );

  -- ── Retorno ───────────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success',         true,
    'outcome',         p_outcome,
    'lead_id',         v_lead_id,
    'conversation_id', p_conversation_id
  );

END;
$$;

-- Revoga acesso público e concede apenas aos roles necessários
REVOKE ALL    ON FUNCTION public.close_conversation(uuid, uuid, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.close_conversation(uuid, uuid, text, text) TO service_role;
GRANT  EXECUTE ON FUNCTION public.close_conversation(uuid, uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
