-- Migration 094: FK constraints na supervisor_insights
-- PostgREST precisa das FKs para resolver joins no .select()

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supervisor_insights_company_id_fkey'
  ) THEN
    ALTER TABLE supervisor_insights
      ADD CONSTRAINT supervisor_insights_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supervisor_insights_agent_id_fkey'
  ) THEN
    ALTER TABLE supervisor_insights
      ADD CONSTRAINT supervisor_insights_agent_id_fkey
        FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supervisor_insights_profile_id_fkey'
  ) THEN
    ALTER TABLE supervisor_insights
      ADD CONSTRAINT supervisor_insights_profile_id_fkey
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;
