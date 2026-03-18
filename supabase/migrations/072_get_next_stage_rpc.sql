-- Migration 072: RPC get_next_stage
-- Retorna o UUID do próximo estágio do board (por ordem), dado o estágio atual.
-- Usado pelo WF-05 V4 (cadência inteligente) para auto-mover leads.

CREATE OR REPLACE FUNCTION public.get_next_stage(p_current_stage_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s2.id
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
