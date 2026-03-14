-- Migration 051: Add media_url to messages + update insert_message RPC
-- Stores the URL of image/audio/video/document received via WhatsApp.
-- RPC gains optional p_media_url parameter (backward-compatible — defaults to NULL).

-- ── 1. Add column ─────────────────────────────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url text;

-- ── 2. Replace insert_message with new signature ──────────────────────────────
CREATE OR REPLACE FUNCTION public.insert_message(
  p_company_id          uuid,
  p_conversation_id     uuid,
  p_external_message_id text        DEFAULT NULL,
  p_direction           text        DEFAULT 'inbound',
  p_sender_type         text        DEFAULT 'lead',
  p_sender_id           uuid        DEFAULT NULL,
  p_content             text        DEFAULT NULL,
  p_content_type        text        DEFAULT 'text',
  p_metadata            jsonb       DEFAULT '{}',
  p_sent_at             timestamptz DEFAULT NULL,
  p_status              text        DEFAULT NULL,
  p_media_url           text        DEFAULT NULL
)
RETURNS TABLE(message_id uuid, is_duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id     uuid;
  v_is_dup     boolean := false;
  v_preview    text;
  v_sent_at    timestamptz;
BEGIN
  -- Tenant guard
  IF auth.uid() IS NOT NULL AND p_company_id != my_company_id() THEN
    RAISE EXCEPTION 'unauthorized: company_id mismatch' USING ERRCODE = '42501';
  END IF;

  v_sent_at := COALESCE(p_sent_at, now());

  -- Layer 1: fast-path duplicate check
  IF p_external_message_id IS NOT NULL THEN
    SELECT id INTO v_msg_id
    FROM messages
    WHERE company_id           = p_company_id
      AND external_message_id  = p_external_message_id;

    IF v_msg_id IS NOT NULL THEN
      RETURN QUERY SELECT v_msg_id, true;
      RETURN;
    END IF;
  END IF;

  -- Layer 2: insert with ON CONFLICT for race-condition safety
  INSERT INTO messages (
    company_id,
    conversation_id,
    external_message_id,
    direction,
    sender_type,
    sender_id,
    content,
    content_type,
    media_url,
    metadata,
    sent_at,
    status
  )
  VALUES (
    p_company_id,
    p_conversation_id,
    p_external_message_id,
    p_direction,
    p_sender_type,
    p_sender_id,
    p_content,
    p_content_type,
    p_media_url,
    COALESCE(p_metadata, '{}'),
    v_sent_at,
    COALESCE(p_status, CASE WHEN p_direction = 'inbound' THEN 'delivered' ELSE 'sent' END)
  )
  ON CONFLICT (company_id, external_message_id)
  WHERE external_message_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_msg_id;

  IF v_msg_id IS NULL THEN
    -- ON CONFLICT fired — retrieve existing
    v_is_dup := true;
    SELECT id INTO v_msg_id
    FROM messages
    WHERE company_id          = p_company_id
      AND external_message_id = p_external_message_id;
  ELSE
    -- New message — update conversation metadata
    v_preview := CASE
      WHEN p_content_type = 'text'     THEN left(p_content, 120)
      WHEN p_content_type = 'image'    THEN '📷 Imagem'
      WHEN p_content_type = 'audio'    THEN '🎵 Áudio'
      WHEN p_content_type = 'video'    THEN '🎥 Vídeo'
      WHEN p_content_type = 'document' THEN '📎 Documento'
      ELSE '💬 Mensagem'
    END;

    UPDATE conversations
    SET
      last_message_at      = v_sent_at,
      last_message_preview = v_preview,
      unread_count         = CASE
        WHEN p_direction = 'inbound' THEN unread_count + 1
        ELSE 0
      END,
      updated_at = now()
    WHERE company_id = p_company_id
      AND id         = p_conversation_id;
  END IF;

  RETURN QUERY SELECT v_msg_id, v_is_dup;
END;
$$;

-- Revoke old signature (11 params) and grant new (12 params)
REVOKE ALL ON FUNCTION public.insert_message(uuid, uuid, text, text, text, uuid, text, text, jsonb, timestamptz, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_message(uuid, uuid, text, text, text, uuid, text, text, jsonb, timestamptz, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_message(uuid, uuid, text, text, text, uuid, text, text, jsonb, timestamptz, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
