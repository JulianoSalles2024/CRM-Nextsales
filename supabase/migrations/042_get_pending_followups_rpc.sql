-- ============================================================================
-- 042_get_pending_followups_rpc.sql
-- RPC: get_pending_followups()
--
-- Chamada a cada minuto pelo n8n (cron) com Service Role.
-- Retorna todas as conversas que devem receber o próximo follow-up agora,
-- já passando o contexto completo que o worker precisa para chamar a IA
-- e despachar a mensagem via Evolution API.
--
-- Regras encapsuladas aqui (fora do n8n):
--   1. status = 'in_progress'
--   2. Próxima regra existe (sequence_order = current_followup_step + 1)
--   3. Delay esgotado (referência = maior entre last_message_at e
--      last_followup_sent_at — última interação de qualquer lado)
--   4. Dia da semana dentro de allowed_days (jsonb)
--   5. Horário atual (America/Sao_Paulo) dentro da janela comercial
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_pending_followups()
RETURNS TABLE (
  conversation_id      uuid,
  company_id           uuid,
  contact_identifier   text,
  contact_name         text,
  agent_name           text,
  company_name         text,
  instance_name        text,       -- nome do canal/instância no Evolution API
  prompt_rule          text,       -- instrução cadastrada pelo vendedor para a IA
  next_followup_step   integer,    -- valor que será gravado em current_followup_step após envio
  conversation_history jsonb       -- últimas 10 msgs (não-sistema) em ordem cronológica
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$

  -- ── Contexto de tempo no fuso de São Paulo ─────────────────────────────────
  --
  --  now_sp       → timestamp completo no fuso (usado para extrair hora e dia)
  --  current_dow  → dia da semana em lowercase sem padding, ex: 'friday'
  --                 Usamos FMDay (FM = "fill mode", remove trailing spaces)
  --  current_tod  → hora do dia como TIME, para comparar com a janela comercial
  --
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

    -- ── Histórico recente: últimas 10 mensagens não-sistema ───────────────
    --
    -- O sub-select pega os 10 registros mais recentes (ORDER BY DESC + LIMIT),
    -- e o jsonb_agg externo os reordena cronologicamente (ASC) para
    -- que a IA receba a conversa na sequência correta.
    --
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

  -- ── Próxima regra da sequência ────────────────────────────────────────────
  --
  -- JOIN direto: só retorna linha quando a regra exata existe.
  -- A UNIQUE constraint (company_id, sequence_order) garante no máximo 1 match.
  --
  JOIN public.followup_rules r
    ON  r.company_id      = c.company_id
    AND r.sequence_order  = c.current_followup_step + 1

  -- ── Dados do agente responsável ───────────────────────────────────────────
  LEFT JOIN public.profiles p
    ON  p.id         = c.assignee_id
    AND p.company_id = c.company_id

  -- ── Nome da empresa ───────────────────────────────────────────────────────
  LEFT JOIN public.companies co
    ON  co.id = c.company_id

  -- ── Instância do canal (Evolution API) ───────────────────────────────────
  LEFT JOIN public.channel_connections cc
    ON  cc.id         = c.channel_connection_id
    AND cc.company_id = c.company_id

  -- ── Cross join para ter acesso ao contexto de fuso ────────────────────────
  CROSS JOIN tz_ctx

  WHERE
    -- 1. Conversa ativa
    c.status = 'in_progress'

    -- 2. Existe atividade prévia para usar como referência
    AND c.last_message_at IS NOT NULL

    -- 3. Delay esgotado ────────────────────────────────────────────────────
    --
    --  Referência = a interação mais recente de qualquer lado.
    --  • Passo 1 (current_followup_step = 0): last_message_at é o único
    --    ponto de referência (last_followup_sent_at ainda é NULL).
    --  • Passo 2+ : usa o MAIOR entre last_message_at e last_followup_sent_at
    --    para cobrir o caso em que o cliente respondeu após um follow-up
    --    (reiniciando o clock) ou não respondeu (clock continua a partir
    --    do último envio automático).
    --
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

    -- 4. Dia da semana permitido ─────────────────────────────────────────────
    --
    --  O operador `?` em jsonb verifica se a string existe como elemento
    --  de array (ou chave de objeto). Ex:
    --    '["monday","friday"]'::jsonb ? 'friday'  → true
    --
    AND r.allowed_days ? tz_ctx.current_dow

    -- 5. Dentro da janela horária comercial ─────────────────────────────────
    AND tz_ctx.current_tod BETWEEN r.allowed_start_time AND r.allowed_end_time
  ;

$$;

-- ── Comentário da função ──────────────────────────────────────────────────────
COMMENT ON FUNCTION public.get_pending_followups() IS
  'Retorna conversas in_progress que devem receber o próximo follow-up automático agora.
   Chamada pelo cron do n8n a cada minuto via REST com Service Role.
   Encapsula toda a lógica de delay, janela horária e sequência de passos.';

-- ── Permissão de execução ─────────────────────────────────────────────────────
--
-- service_role é o papel usado pelo n8n via API REST do Supabase.
-- anon e authenticated NÃO devem executar esta função diretamente.
--
REVOKE ALL    ON FUNCTION public.get_pending_followups() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_pending_followups() TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
