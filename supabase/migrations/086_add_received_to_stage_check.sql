-- ═══════════════════════════════════════════════════════════════════
-- Migration 086 · Fix agent_lead_memory.stage CHECK constraint
-- Adiciona 'received' aos valores válidos do campo stage.
-- O RPC transfer_lead_to_closer (migration 082) tenta inserir
-- stage='received' para o Closer, mas esse valor não estava na
-- constraint — causando erro 23514 e impedindo a transferência.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.agent_lead_memory
  DROP CONSTRAINT IF EXISTS agent_lead_memory_stage_check;

ALTER TABLE public.agent_lead_memory
  ADD CONSTRAINT agent_lead_memory_stage_check
  CHECK (stage IN (
    'new',
    'approached',
    'responded',
    'qualifying',
    'qualified',
    'meeting_scheduled',
    'proposal_sent',
    'negotiating',
    'closed_won',
    'closed_lost',
    'inactive',
    'transferred',  -- adicionado em migration 083
    'received'      -- adicionado agora: usado por transfer_lead_to_closer para o Closer
  ));

NOTIFY pgrst, 'reload schema';
