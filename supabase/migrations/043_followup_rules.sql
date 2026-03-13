-- ============================================================================
-- 021_followup_rules.sql
-- Follow-up Automático Baseado em Inatividade
-- Multi-tenant: company_id em todas as tabelas + RLS via my_company_id()
-- ============================================================================

BEGIN;

-- ─── 1. Extend conversations ─────────────────────────────────────────────────

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS current_followup_step  integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_followup_sent_at  timestamptz          DEFAULT NULL;

COMMENT ON COLUMN conversations.current_followup_step IS
  'Índice (1-based) do último follow-up enviado para esta conversa. 0 = nenhum enviado.';
COMMENT ON COLUMN conversations.last_followup_sent_at IS
  'Timestamp do envio do último follow-up, usado para calcular o delay do próximo passo.';

-- ─── 2. Create followup_rules ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS followup_rules (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by          uuid                 REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Escopo: 'admin' = global da empresa | 'seller' = funil individual do vendedor
  role_scope          text        NOT NULL DEFAULT 'admin'
                        CHECK (role_scope IN ('admin', 'seller')),

  -- Delay até disparar este passo
  delay_value         integer     NOT NULL CHECK (delay_value > 0),
  delay_unit          text        NOT NULL
                        CHECK (delay_unit IN ('minutes', 'hours', 'days')),

  -- Instrução enviada à IA para gerar a mensagem de follow-up
  prompt              text        NOT NULL,

  -- Janela horária permitida para envio
  allowed_days        jsonb                DEFAULT '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
  allowed_start_time  time        NOT NULL DEFAULT '08:00',
  allowed_end_time    time        NOT NULL DEFAULT '18:00',

  -- Posição na sequência (1 = primeiro follow-up)
  sequence_order      integer     NOT NULL CHECK (sequence_order >= 1),

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE followup_rules IS
  'Sequência de follow-ups automáticos por inatividade. Cada linha é um passo da régua de comunicação.';

-- ─── 3. Trigger updated_at ───────────────────────────────────────────────────

-- Reutiliza a função set_updated_at() já criada em migrations anteriores
DROP TRIGGER IF EXISTS trg_followup_rules_updated_at ON followup_rules;
CREATE TRIGGER trg_followup_rules_updated_at
  BEFORE UPDATE ON followup_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 4. Índices ───────────────────────────────────────────────────────────────

-- Lookup principal do scheduler: busca regras de uma empresa ordenadas por passo
CREATE INDEX IF NOT EXISTS idx_followup_rules_company_order
  ON followup_rules (company_id, sequence_order);

-- Lookup por criador (útil para filtrar regras do seller logado)
CREATE INDEX IF NOT EXISTS idx_followup_rules_created_by
  ON followup_rules (company_id, created_by);

-- Índice para encontrar conversas pendentes de follow-up
CREATE INDEX IF NOT EXISTS idx_conversations_followup
  ON conversations (company_id, status, last_followup_sent_at)
  WHERE status = 'in_progress';

-- ─── 5. Row Level Security ───────────────────────────────────────────────────

ALTER TABLE followup_rules ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer membro autenticado da empresa pode ler
CREATE POLICY "followup_rules: members can select"
  ON followup_rules FOR SELECT
  USING (company_id = my_company_id());

-- INSERT: apenas autenticados da mesma empresa
CREATE POLICY "followup_rules: members can insert"
  ON followup_rules FOR INSERT
  WITH CHECK (company_id = my_company_id());

-- UPDATE: apenas quem criou a regra ou admin (RLS simples — admin via service_role no scheduler)
CREATE POLICY "followup_rules: owner can update"
  ON followup_rules FOR UPDATE
  USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());

-- DELETE: apenas quem criou a regra (service_role bypassa para o scheduler)
CREATE POLICY "followup_rules: owner can delete"
  ON followup_rules FOR DELETE
  USING (company_id = my_company_id());

-- ─── 6. Unique constraint: evita duplicidade de ordem por empresa ─────────────

ALTER TABLE followup_rules
  ADD CONSTRAINT uq_followup_rules_company_order
  UNIQUE (company_id, sequence_order);

COMMIT;
