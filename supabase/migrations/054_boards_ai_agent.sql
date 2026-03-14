-- Migration 054: Add AI Agent columns to boards table
-- ai_enabled:     liga/desliga o agente no pipeline
-- ai_prompt:      instruções específicas para o agente
-- ai_methodology: metodologia escolhida (ex: 'SDR Agressivo', 'Suporte Resolutivo')

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS ai_enabled     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_prompt      text,
  ADD COLUMN IF NOT EXISTS ai_methodology text;

-- RLS: a policy existente "Boards: company members" já cobre FOR ALL
-- (SELECT + INSERT + UPDATE + DELETE) para qualquer membro da company_id.
-- Sellers podem dar UPDATE nessas colunas sem alteração adicional.

NOTIFY pgrst, 'reload schema';
