-- ============================================================
-- 004_multitenant_rbac.sql
-- Structural fix: multi-tenant RBAC + correct trigger
-- Run AFTER 004_diagnostic.sql confirms the current state.
-- ============================================================

-- ── STEP 1: Enable RLS ──────────────────────────────────────
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites   ENABLE ROW LEVEL SECURITY;

-- ── STEP 2: Drop ALL existing policies (clean slate) ────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('companies', 'profiles', 'invites')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── STEP 3: Fix check constraint on profiles ────────────────
-- Covers both admin and seller (not just seller from migration 003)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_seller_has_company;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_company_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_company_check
  CHECK (
    (role IN ('admin', 'seller') AND company_id IS NOT NULL)
    OR role = 'user'
  );

-- ── STEP 4: Helper — avoids recursive self-join in RLS ──────
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ── STEP 5: companies policies ──────────────────────────────

-- Any member of the company can read it
CREATE POLICY "companies: member select"
  ON public.companies FOR SELECT
  USING (id = public.my_company_id());

-- Only admins of the company can update it
CREATE POLICY "companies: admin update"
  ON public.companies FOR UPDATE
  USING (
    id = public.my_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── STEP 6: profiles policies ───────────────────────────────

-- INSERT: own id only
-- (trigger is SECURITY DEFINER → bypasses RLS; this covers direct inserts)
CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- SELECT: own profile OR any profile in the same company
CREATE POLICY "profiles: select same company"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR company_id = public.my_company_id()
  );

-- UPDATE: own profile only (cannot modify others or escalate role)
CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING   (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── STEP 7: invites policies ────────────────────────────────

-- SELECT: same company
CREATE POLICY "invites: select same company"
  ON public.invites FOR SELECT
  USING (company_id = public.my_company_id());

-- INSERT: admin of the same company only
CREATE POLICY "invites: admin insert"
  ON public.invites FOR INSERT
  WITH CHECK (
    company_id = public.my_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE (revoke / edit): admin of the same company only
CREATE POLICY "invites: admin update"
  ON public.invites FOR UPDATE
  USING (
    company_id = public.my_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE (revoke): admin of the same company only
CREATE POLICY "invites: admin delete"
  ON public.invites FOR DELETE
  USING (
    company_id = public.my_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── STEP 8: Trigger function ─────────────────────────────────
-- SECURITY DEFINER → bypasses RLS entirely.
-- Sources role + company_id from the invites table, never from client metadata.
-- Admin self-signup (no token) → creates a new company automatically.
-- Marks invite as used after profile is inserted (atomic, same transaction).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token         text;
  v_role          text;
  v_company_id    uuid;
  v_invite_found  boolean := false;
BEGIN
  v_token := new.raw_user_meta_data->>'invite_token';

  -- ── Path A: invited user ──────────────────────────────────
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
      RAISE EXCEPTION 'Invite token "%" is invalid, expired or already used', v_token;
    END IF;
  END IF;

  -- ── Path B: admin self-signup (no invite token) ───────────
  IF v_role IS NULL THEN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'admin');

    IF v_role = 'admin' THEN
      -- Auto-create a company for this admin
      INSERT INTO public.companies (name)
      VALUES (
        COALESCE(
          NULLIF(new.raw_user_meta_data->>'company_name', ''),
          NULLIF(new.raw_user_meta_data->>'name', ''),
          new.email
        )
      )
      RETURNING id INTO v_company_id;
    ELSE
      RAISE EXCEPTION 'Role "%" requires a valid invite token', v_role;
    END IF;
  END IF;

  -- ── Guard ─────────────────────────────────────────────────
  IF v_role IN ('admin', 'seller') AND v_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id cannot be NULL for role "%"', v_role;
  END IF;

  -- ── Insert profile ────────────────────────────────────────
  INSERT INTO public.profiles (id, email, name, role, company_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(NULLIF(new.raw_user_meta_data->>'name', ''), new.email),
    v_role,
    v_company_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Mark invite as used (after successful profile insert) ──
  IF v_invite_found THEN
    UPDATE public.invites
    SET used_at = now()
    WHERE token = v_token
      AND used_at IS NULL;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── STEP 9: Verification ─────────────────────────────────────
SELECT 'trigger'           AS item,
       trigger_name        AS name,
       'OK'                AS status
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND trigger_name = 'on_auth_user_created'

UNION ALL

SELECT 'function', routine_name, 'OK'
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'my_company_id')

UNION ALL

SELECT 'constraint', conname, 'OK'
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname = 'profiles_role_company_check'

UNION ALL

SELECT 'rls_' || tablename, tablename,
       CASE WHEN rowsecurity THEN 'ON' ELSE 'OFF ← PROBLEM' END
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'invites', 'companies')

UNION ALL

SELECT 'policies_count',
       tablename,
       count(*)::text || ' policies'
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'invites', 'companies')
GROUP BY tablename

ORDER BY item;
