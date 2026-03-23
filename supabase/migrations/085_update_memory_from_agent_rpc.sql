-- ═══════════════════════════════════════════════════════════════════
-- Migration 085 · RPC update_memory_from_agent
-- Wrapper com parâmetros flat (string/numeric/boolean) sobre
-- upsert_agent_lead_memory. Permite que o n8n toolHttpRequest
-- passe cada campo individualmente via $fromAI() sem precisar
-- montar um objeto JSON aninhado.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_memory_from_agent(
  p_agent_id        uuid,
  p_lead_id         uuid,
  p_company_id      uuid,
  -- campos opcionais — apenas os enviados são aplicados
  p_stage           text    DEFAULT NULL,
  p_interest_level  text    DEFAULT NULL,
  p_budget          numeric DEFAULT NULL,
  p_decision_maker  boolean DEFAULT NULL,
  p_notes           text    DEFAULT NULL,
  p_last_action     text    DEFAULT NULL,
  p_next_action     text    DEFAULT NULL,
  p_next_action_at  text    DEFAULT NULL,  -- ISO 8601 string
  p_next_action_type text   DEFAULT NULL,
  p_timeline        text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updates jsonb := '{}';
BEGIN

  IF p_stage            IS NOT NULL THEN v_updates := v_updates || jsonb_build_object('stage', p_stage); END IF;
  IF p_interest_level   IS NOT NULL THEN v_updates := v_updates || jsonb_build_object('interest_level', p_interest_level); END IF;
  IF p_budget           IS NOT NULL THEN v_updates := v_updates || jsonb_build_object('budget_detected', p_budget); END IF;
  IF p_decision_maker   IS NOT NULL THEN v_updates := v_updates || jsonb_build_object('decision_maker', p_decision_maker); END IF;
  IF p_notes            IS NOT NULL THEN v_updates := v_updates || jsonb_build_object('notes', p_notes); END IF;
  IF p_last_action      IS NOT NULL THEN v_updates := v_updates || jsonb_build_object('last_action', p_last_action); END IF;
  IF p_next_action      IS NOT NULL THEN v_updates := v_updates || jsonb_build_object('next_action', p_next_action); END IF;
  IF p_next_action_type IS NOT NULL THEN v_updates := v_updates || jsonb_build_object('next_action_type', p_next_action_type); END IF;
  IF p_timeline         IS NOT NULL THEN v_updates := v_updates || jsonb_build_object('timeline_detected', p_timeline); END IF;
  IF p_next_action_at   IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('next_action_at', p_next_action_at::timestamptz);
  END IF;

  RETURN public.upsert_agent_lead_memory(p_agent_id, p_lead_id, p_company_id, v_updates);

END;
$$;

REVOKE ALL   ON FUNCTION public.update_memory_from_agent FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_memory_from_agent TO service_role;
GRANT EXECUTE ON FUNCTION public.update_memory_from_agent TO authenticated;

NOTIFY pgrst, 'reload schema';
