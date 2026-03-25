-- Migration 105: RPC para buscar resumos IA de um lead
-- SECURITY DEFINER ignora a RLS de assignee_id, mas valida company_id.
-- Permite que admin veja resumos sem afetar o isolamento do omnichannel.

CREATE OR REPLACE FUNCTION get_lead_conversation_summaries(p_lead_id uuid)
RETURNS TABLE(
  id                 uuid,
  contact_name       text,
  contact_identifier text,
  ai_summary         text,
  ai_summary_at      timestamptz,
  last_message_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.contact_name,
    c.contact_identifier,
    c.ai_summary,
    c.ai_summary_at,
    c.last_message_at
  FROM conversations c
  WHERE c.lead_id    = p_lead_id
    AND c.company_id = my_company_id()
    AND c.ai_summary IS NOT NULL
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION get_lead_conversation_summaries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_lead_conversation_summaries(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
