-- Migration 077 — Fix resolve_or_create_lead: ignore orphan lead_channel_links
--
-- PROBLEM: When a lead is deleted (deleted_at set) and the contact sends a new
-- WhatsApp message, resolve_or_create_lead finds the old lead_channel_links entry
-- and returns the deleted lead (is_new = false). The deleted lead is invisible in
-- the UI, but a conversation is created and appears in Omnichannel — leaving the
-- seller with no lead to work with.
--
-- FIX: The fast-path lookup now JOINs leads and filters out deleted leads.
-- If the link exists but the lead is deleted, the orphan link is cleaned up
-- and a fresh lead + link are created.

CREATE OR REPLACE FUNCTION resolve_or_create_lead(
  p_company_id   uuid,
  p_channel      text,
  p_identifier   text,
  p_contact_name text DEFAULT NULL
)
RETURNS TABLE(lead_id uuid, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Tenant guard: reject cross-tenant calls when running as authenticated user
  IF auth.uid() IS NOT NULL AND p_company_id != my_company_id() THEN
    RAISE EXCEPTION 'unauthorized: company_id mismatch' USING ERRCODE = '42501';
  END IF;

  -- Serialize workers for the same (company, channel, identifier) triplet
  PERFORM pg_advisory_xact_lock(
    hashtext(p_company_id::text || ':' || p_channel),
    hashtext(p_identifier)
  );

  -- Fast path: existing link — only if lead is NOT deleted
  SELECT lcl.lead_id INTO v_lead_id
  FROM lead_channel_links lcl
  JOIN leads l ON l.id = lcl.lead_id
  WHERE lcl.company_id = p_company_id
    AND lcl.channel    = p_channel
    AND lcl.identifier = p_identifier
    AND l.deleted_at   IS NULL;

  IF v_lead_id IS NOT NULL THEN
    RETURN QUERY SELECT v_lead_id, false;
    RETURN;
  END IF;

  -- Orphan link (lead was deleted): clean it up before creating new
  DELETE FROM lead_channel_links
  WHERE company_id = p_company_id
    AND channel    = p_channel
    AND identifier = p_identifier;

  -- Create new lead
  INSERT INTO leads (company_id, name, status, source)
  VALUES (
    p_company_id,
    COALESCE(NULLIF(trim(COALESCE(p_contact_name, '')), ''), 'Lead ' || p_identifier),
    'NOVO',
    'omnichannel_inbound'
  )
  RETURNING id INTO v_lead_id;

  -- Register channel link
  INSERT INTO lead_channel_links (company_id, lead_id, channel, identifier)
  VALUES (p_company_id, v_lead_id, p_channel, p_identifier);

  RETURN QUERY SELECT v_lead_id, true;
END;
$$;

REVOKE ALL ON FUNCTION resolve_or_create_lead(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_or_create_lead(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_or_create_lead(uuid, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
