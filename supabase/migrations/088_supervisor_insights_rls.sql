-- Migration 088: RLS para supervisor_insights

CREATE TABLE IF NOT EXISTS supervisor_insights (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id       uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  profile_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type           text NOT NULL DEFAULT 'general' CHECK (type IN ('performance_drop','script_issue','channel_weak','goal_risk','general')),
  severity       text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  content        text NOT NULL,
  recommendation text,
  is_read        boolean NOT NULL DEFAULT false,
  is_applied     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supervisor_insights_company ON supervisor_insights(company_id, created_at DESC);

ALTER TABLE supervisor_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_read" ON supervisor_insights;
CREATE POLICY "company_read" ON supervisor_insights FOR SELECT USING (company_id = public.my_company_id());

DROP POLICY IF EXISTS "company_update" ON supervisor_insights;
CREATE POLICY "company_update" ON supervisor_insights FOR UPDATE USING (company_id = public.my_company_id()) WITH CHECK (company_id = public.my_company_id());
