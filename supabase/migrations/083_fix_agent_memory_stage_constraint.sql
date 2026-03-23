-- ═══════════════════════════════════════════════════════════════════
-- Migration 083 · Fix agent_lead_memory.stage CHECK constraint
-- Adiciona 'transferred' aos valores válidos do campo stage.
-- A migration 082 (transfer_lead_to_closer) tenta setar stage='transferred'
-- mas esse valor não existia no CHECK — causando rollback silencioso.
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
    'transferred'   -- adicionado: usado pelo transfer_lead_to_closer (migration 082)
  ));

NOTIFY pgrst, 'reload schema';
