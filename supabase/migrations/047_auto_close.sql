-- Migration 047: Auto-close conversations — company_settings table + RPC
-- Adds per-company configuration for automatic conversation closing after inactivity.
-- The n8n supervisor (WF-04) will call get_expired_conversations() every hour.

-- ─── TABELA company_settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_settings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Encerramento automático por inatividade.
  -- NULL = funcionalidade desativada para a empresa.
  -- Valor mínimo: 1 hora.
  auto_close_hours  int         CHECK (auto_close_hours IS NULL OR auto_close_hours > 0),

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings: members can read own"
  ON public.company_settings
  FOR SELECT
  USING (company_id = my_company_id());

-- Apenas admins devem escrever; a policy de escrita usa a mesma função
-- (controle de role é feito no frontend/API — sem overhead de subquery aqui)
CREATE POLICY "company_settings: members can write own"
  ON public.company_settings
  FOR ALL
  USING (company_id = my_company_id());

-- ─── REALTIME ────────────────────────────────────────────────────────────────
-- Necessário para que alterações em auto_close_hours reflitam imediatamente
-- na UI sem recarregar a página.
ALTER TABLE public.company_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'company_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_settings;
  END IF;
END $$;

-- ─── RPC get_expired_conversations ───────────────────────────────────────────
-- Retorna todas as conversas in_progress cuja última mensagem é mais antiga
-- do que o limite configurado em company_settings.auto_close_hours.
-- Chamada exclusivamente pelo n8n com service_role (cron a cada hora).
-- O n8n é responsável por:
--   1. Marcar conversations.status = 'resolved'
--   2. Marcar leads.status = 'PERDIDO' + leads.lost_at = now() (se lead_id não for null)
--   3. Inserir mensagem de sistema registrando o encerramento automático
CREATE OR REPLACE FUNCTION public.get_expired_conversations()
RETURNS TABLE (
  conversation_id  uuid,
  lead_id          uuid,
  company_id       uuid,
  contact_name     text,
  hours_inactive   numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id                                                                          AS conversation_id,
    c.lead_id,
    c.company_id,
    COALESCE(c.contact_name, c.contact_identifier)                               AS contact_name,
    ROUND(EXTRACT(EPOCH FROM (now() - c.last_message_at)) / 3600, 1)             AS hours_inactive
  FROM conversations c
  JOIN company_settings cs ON cs.company_id = c.company_id
  WHERE
    c.status           = 'in_progress'
    AND cs.auto_close_hours IS NOT NULL
    AND c.last_message_at  IS NOT NULL
    AND c.last_message_at  < now() - make_interval(hours => cs.auto_close_hours)
  ORDER BY c.last_message_at ASC;
$$;

-- Restringe a execução ao service_role (n8n); nenhum usuário autenticado pode chamar.
REVOKE ALL ON FUNCTION public.get_expired_conversations() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_expired_conversations() TO service_role;
