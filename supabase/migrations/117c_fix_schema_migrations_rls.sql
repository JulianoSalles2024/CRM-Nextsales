-- ============================================================
-- Migration 117: Enable RLS on schema_migrations
--
-- A tabela schema_migrations é usada para rastrear versões de
-- migrations aplicadas. Ela estava sem RLS habilitado, expondo
-- dados via API pública (Supabase security advisor: rls_disabled_in_public).
--
-- Fix: habilitar RLS sem adicionar políticas permissivas.
-- service_role (backend/n8n) bypassa RLS automaticamente.
-- Usuários anon/authenticated não precisam acessar essa tabela.
-- ============================================================

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- Apenas admins autenticados podem ler (opcional — backend usa service_role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'schema_migrations' AND policyname = 'schema_migrations_admin_read'
  ) THEN
    CREATE POLICY "schema_migrations_admin_read"
      ON public.schema_migrations
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;
