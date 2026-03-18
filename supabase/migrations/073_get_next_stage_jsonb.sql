-- Migration 073: atualiza get_next_stage para retornar jsonb
-- Evita problema de n8n não parsear scalar string do PostgREST

DROP FUNCTION IF EXISTS public.get_next_stage(uuid);

CREATE OR REPLACE FUNCTION public.get_next_stage(p_current_stage_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('next_stage_id', s2.id)
  FROM   public.board_stages s1
  JOIN   public.board_stages s2
      ON  s2.board_id    = s1.board_id
      AND s2.company_id  = s1.company_id
      AND s2."order"     > s1."order"
  WHERE  s1.id = p_current_stage_id
  ORDER  BY s2."order" ASC
  LIMIT  1;
$$;

NOTIFY pgrst, 'reload schema';
