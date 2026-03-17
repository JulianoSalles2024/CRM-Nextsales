-- Migration 069 — Fix auto_assign_lead_column trigger to also set board_id
--
-- PROBLEM: The trigger in migration 055 sets column_id (board_stages.id) but leaves
-- board_id = NULL. The frontend filters leads with l.boardId === activeBoardId, so
-- any lead with board_id = NULL is invisible in every board view.
-- Leads created via n8n WF-01 (resolve_or_create_lead) always had board_id = NULL.
--
-- FIX: Also populate board_id from board_stages.board_id when assigning column_id.
-- BACKFILL: Update existing leads where board_id IS NULL but column_id IS NOT NULL.

CREATE OR REPLACE FUNCTION auto_assign_lead_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stage_id uuid;
  v_board_id uuid;
BEGIN
  IF NEW.column_id IS NULL THEN
    SELECT bs.id, bs.board_id
    INTO v_stage_id, v_board_id
    FROM board_stages bs
    JOIN boards b ON b.id = bs.board_id
    WHERE b.company_id = NEW.company_id
    ORDER BY b.created_at ASC, bs."order" ASC
    LIMIT 1;

    NEW.column_id := v_stage_id;
    NEW.board_id  := v_board_id;

  ELSIF NEW.board_id IS NULL AND NEW.column_id IS NOT NULL THEN
    -- column_id was provided but board_id was not — resolve it
    SELECT bs.board_id INTO v_board_id
    FROM board_stages bs
    WHERE bs.id = NEW.column_id
    LIMIT 1;

    NEW.board_id := v_board_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_lead_column ON leads;

CREATE TRIGGER trg_auto_assign_lead_column
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_lead_column();

-- Backfill existing leads: populate board_id where it is NULL but column_id is set
UPDATE leads l
SET board_id = bs.board_id
FROM board_stages bs
WHERE l.column_id::uuid = bs.id
  AND l.board_id IS NULL
  AND l.column_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
