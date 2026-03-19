-- Migration 076 — Fix resolve_or_create_conversation: ignore orphan conversations
--
-- PROBLEM: When a lead is deleted and the contact sends a new WhatsApp message,
-- resolve_or_create_conversation finds the old conversation (whose lead_id points
-- to a deleted lead) and returns it instead of creating a new one.
-- The new lead is created but never gets a conversation linked to it.
--
-- FIX: Steps 1 and 2 now skip conversations whose lead_id references a deleted lead.
-- A conversation with lead_id IS NULL or lead.deleted_at IS NULL is still valid.

CREATE OR REPLACE FUNCTION resolve_or_create_conversation(
  p_company_id               uuid,
  p_channel_connection_id    uuid,
  p_channel                  text,
  p_contact_identifier       text,
  p_contact_name             text    DEFAULT NULL,
  p_external_conversation_id text    DEFAULT NULL,
  p_lead_id                  uuid    DEFAULT NULL,
  p_assignee_id              uuid    DEFAULT NULL
)
RETURNS TABLE(conversation_id uuid, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id     uuid;
  v_assignee_id uuid;
BEGIN
  -- Tenant guard
  IF auth.uid() IS NOT NULL AND p_company_id != my_company_id() THEN
    RAISE EXCEPTION 'unauthorized: company_id mismatch' USING ERRCODE = '42501';
  END IF;

  -- Resolve assignee: use explicit param, or fall back to channel_connection owner_id
  v_assignee_id := p_assignee_id;
  IF v_assignee_id IS NULL THEN
    SELECT owner_id INTO v_assignee_id
    FROM channel_connections
    WHERE id         = p_channel_connection_id
      AND company_id = p_company_id;
  END IF;

  -- Step 1: match by external_conversation_id (skip if lead was deleted)
  IF p_external_conversation_id IS NOT NULL THEN
    SELECT c.id INTO v_conv_id
    FROM conversations c
    WHERE c.company_id               = p_company_id
      AND c.channel_connection_id    = p_channel_connection_id
      AND c.external_conversation_id = p_external_conversation_id
      AND c.status NOT IN ('resolved')
      AND (
        c.lead_id IS NULL
        OR EXISTS (
          SELECT 1 FROM leads l
          WHERE l.id = c.lead_id AND l.deleted_at IS NULL
        )
      )
    LIMIT 1;

    IF v_conv_id IS NOT NULL THEN
      RETURN QUERY SELECT v_conv_id, false;
      RETURN;
    END IF;
  END IF;

  -- Step 2: match by active contact (skip if lead was deleted)
  SELECT c.id INTO v_conv_id
  FROM conversations c
  WHERE c.company_id            = p_company_id
    AND c.channel_connection_id = p_channel_connection_id
    AND c.contact_identifier    = p_contact_identifier
    AND c.status NOT IN ('resolved')
    AND (
      c.lead_id IS NULL
      OR EXISTS (
        SELECT 1 FROM leads l
        WHERE l.id = c.lead_id AND l.deleted_at IS NULL
      )
    )
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    -- If conversation exists but has no assignee, assign now
    IF v_assignee_id IS NOT NULL THEN
      UPDATE conversations
      SET assignee_id = v_assignee_id, updated_at = now()
      WHERE id = v_conv_id AND assignee_id IS NULL;
    END IF;
    RETURN QUERY SELECT v_conv_id, false;
    RETURN;
  END IF;

  -- Step 3: INSERT new conversation
  INSERT INTO conversations (
    company_id,
    channel_connection_id,
    lead_id,
    contact_identifier,
    contact_name,
    external_conversation_id,
    assignee_id,
    status
  )
  VALUES (
    p_company_id,
    p_channel_connection_id,
    p_lead_id,
    p_contact_identifier,
    p_contact_name,
    p_external_conversation_id,
    v_assignee_id,
    'waiting'
  )
  ON CONFLICT (channel_connection_id, contact_identifier)
  WHERE status NOT IN ('resolved')
  DO NOTHING
  RETURNING id INTO v_conv_id;

  -- ON CONFLICT: re-query winner (also skip orphans)
  IF v_conv_id IS NULL THEN
    SELECT c.id INTO v_conv_id
    FROM conversations c
    WHERE c.company_id            = p_company_id
      AND c.channel_connection_id = p_channel_connection_id
      AND c.contact_identifier    = p_contact_identifier
      AND c.status NOT IN ('resolved')
      AND (
        c.lead_id IS NULL
        OR EXISTS (
          SELECT 1 FROM leads l
          WHERE l.id = c.lead_id AND l.deleted_at IS NULL
        )
      )
    LIMIT 1;

    RETURN QUERY SELECT v_conv_id, false;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_conv_id, true;
END;
$$;

REVOKE ALL ON FUNCTION resolve_or_create_conversation(uuid,uuid,text,text,text,text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_or_create_conversation(uuid,uuid,text,text,text,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_or_create_conversation(uuid,uuid,text,text,text,text,uuid,uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
