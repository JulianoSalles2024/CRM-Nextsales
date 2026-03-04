-- ─────────────────────────────────────────────────────────────────────────────
-- 006_fix_role_default.sql  (versão validada)
--
-- Correções vs 005:
--   1. Remove COALESCE(..., 'admin') — sem promoção silenciosa.
--   2. Detecta OAuth (provider != 'email') e bloqueia criação sem invite.
--   3. GET DIAGNOSTICS: invite só é consumido se o profile foi inserido de fato.
--
-- Pré-requisito no cliente:
--   AuthContext.register() deve passar options.data.role = 'admin' no signUp
--   para o fluxo de auto-registro de admin funcionar.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token          text;
  v_role           text;
  v_company_id     uuid;
  v_invite_found   boolean := false;
  v_rows_inserted  integer := 0;
BEGIN
  v_token := new.raw_user_meta_data->>'invite_token';

  -- ── Path A: usuário convidado (invite_token presente) ────────────────────
  IF v_token IS NOT NULL THEN
    SELECT role, company_id
      INTO v_role, v_company_id
      FROM public.invites
     WHERE token    = v_token
       AND used_at  IS NULL
       AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1;

    IF FOUND THEN
      v_invite_found := true;
    ELSE
      -- Token inválido, expirado ou já usado → falha explícita, sem fallback
      RAISE EXCEPTION 'Invite token "%" is invalid, expired or already used', v_token;
    END IF;
  END IF;

  -- ── Path B: signup direto sem invite_token ───────────────────────────────
  IF v_role IS NULL THEN

    -- Bloqueia OAuth (Google, GitHub etc.) sem invite
    -- Esses providers não passam invite_token nem role no metadata
    IF new.app_metadata->>'provider' IS DISTINCT FROM 'email' THEN
      RAISE EXCEPTION
        'OAuth signup sem invite não é permitido. Solicite um convite ao admin. (provider: %)',
        COALESCE(new.app_metadata->>'provider', 'unknown');
    END IF;

    -- Signup por e-mail direto: exige role='admin' explícito no metadata
    -- (AuthContext.register deve passar options.data.role = 'admin')
    v_role := new.raw_user_meta_data->>'role';

    IF v_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION
        'Signup direto requer role=admin no metadata ou um invite_token válido. Role recebido: "%"',
        COALESCE(v_role, 'null');
    END IF;

    -- Admin auto-registro: cria empresa automaticamente
    INSERT INTO public.companies (name)
    VALUES (
      COALESCE(
        NULLIF(new.raw_user_meta_data->>'company_name', ''),
        NULLIF(new.raw_user_meta_data->>'name', ''),
        new.email
      )
    )
    RETURNING id INTO v_company_id;

  END IF;

  -- ── Guard: company_id obrigatório para admin e seller ────────────────────
  IF v_role IN ('admin', 'seller') AND v_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id não pode ser NULL para role "%"', v_role;
  END IF;

  -- ── Insert profile ────────────────────────────────────────────────────────
  INSERT INTO public.profiles (id, email, name, role, company_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(NULLIF(new.raw_user_meta_data->>'name', ''), new.email),
    v_role,
    v_company_id
  )
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  -- ── Marca invite como usado SOMENTE se o profile foi inserido ─────────────
  -- Se já existia um profile (ON CONFLICT), o invite não é consumido,
  -- permitindo que o admin reenvie o link ou que o cliente tente novamente.
  IF v_invite_found AND v_rows_inserted > 0 THEN
    UPDATE public.invites
    SET used_at = now()
    WHERE token   = v_token
      AND used_at IS NULL;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
