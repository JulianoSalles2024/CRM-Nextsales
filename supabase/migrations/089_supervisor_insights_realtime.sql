-- Migration 089: Habilita realtime para supervisor_insights
ALTER PUBLICATION supabase_realtime ADD TABLE supervisor_insights;
