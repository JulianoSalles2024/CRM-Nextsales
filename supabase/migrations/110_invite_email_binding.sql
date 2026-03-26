-- ============================================================
-- Migration: 110_invite_email_binding
--
-- Corrige a brecha de segurança no sistema de convites onde
-- o e-mail do destinatário não era armazenado, permitindo que
-- qualquer pessoa com o link criasse conta com qualquer e-mail.
--
-- Mudanças:
--   1. Adiciona coluna `email` na tabela `invites` (nullable para
--      retrocompatibilidade com convites já existentes).
--
--   2. Recria validate_invite() retornando também o campo `email`,
--      permitindo que o frontend valide se o e-mail digitado
--      coincide com o e-mail para o qual o convite foi enviado.
--
--   3. Deprecia a função accept_invite() (o trigger handle_new_user
--      já faz todo o trabalho de atribuir company_id e role, e
--      ainda marcava used_at antes do RPC ser chamado, causando
--      o erro P0003 "Este convite já foi utilizado"). A função é
--      mantida no banco mas o frontend não a chamará mais.
--
-- Retrocompatibilidade:
--   - Convites existentes terão email = NULL. O frontend trata
--     NULL como "convite legado — sem restrição de e-mail",
--     exibindo apenas um aviso informativo ao usuário.
--   - Não há NOT NULL constraint nem DEFAULT, para não invalidar
--     convites pendentes que já foram enviados.
--
-- Idempotente: seguro para re-execução.
-- ============================================================


-- ── 1. Adicionar coluna email na tabela invites ──────────────

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.invites.email IS
  'E-mail do destinatário do convite. NULL para convites legados '
  '(criados antes da migration 110). Quando preenchido, o frontend '
  'valida que o usuário está se cadastrando com este e-mail exato.';


-- ── 2. Recriar validate_invite() incluindo o campo email ─────
--
-- A assinatura de retorno muda: adiciona `email text`.
-- O frontend (InvitePage.tsx) lê este campo para validar o
-- e-mail digitado no formulário.
--
-- IMPORTANTE: DROP antes de CREATE OR REPLACE porque o tipo de
-- retorno mudou (nova coluna). Sem DROP, o Postgres rejeita.

DROP FUNCTION IF EXISTS public.validate_invite(text);

CREATE OR REPLACE FUNCTION public.validate_invite(p_token text)
RETURNS TABLE (
  role       text,
  company_id uuid,
  expires_at timestamptz,
  used_at    timestamptz,
  email      text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role, company_id, expires_at, used_at, email
  FROM   public.invites
  WHERE  token = p_token
  LIMIT  1;
$$;

-- Mantém acesso anon: usuário ainda não está autenticado quando
-- chega na InvitePage e precisa validar o token.
GRANT EXECUTE ON FUNCTION public.validate_invite(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite(text) TO authenticated;


-- ── 3. Nota sobre accept_invite() ───────────────────────────
--
-- A função accept_invite() (migration 098) é mantida no banco
-- para não quebrar deploys anteriores, mas o frontend não a
-- chamará mais após a Etapa 3 (fix do InvitePage.tsx).
--
-- O trigger handle_new_user() (migration 016) já é responsável
-- por marcar used_at, atribuir company_id e role ao profile
-- no momento exato do signUp. Chamar accept_invite() depois
-- causava o erro P0003 porque o invite já estava consumido.
--
-- Nenhuma alteração em accept_invite() é necessária aqui.
