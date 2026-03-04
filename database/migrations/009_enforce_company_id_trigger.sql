-- ============================================================
-- 009_enforce_company_id_trigger.sql
--
-- Problem: INSERT on leads/tasks/activities fails with 400 when
-- frontend companyId diverges from get_user_company_id() called
-- inside the RLS WITH CHECK. Also normalizes function name to
-- public.my_company_id() which is the canonical helper in this schema.
--
-- Solution:
--   1. Shared trigger function that stamps company_id server-side
--      using public.my_company_id() — same source of truth as RLS.
--   2. BEFORE INSERT trigger on leads, tasks, activities.
--   3. Fix leads RLS policy to use public.my_company_id() consistently.
--
-- DOES NOT remove RLS. DOES NOT use service_role.
-- ============================================================


-- ── 1. Trigger function ──────────────────────────────────────
-- SECURITY DEFINER: runs with definer rights so it can read
-- profiles even when the RLS on profiles is restrictive.
-- Raises a clear exception if the user has no company assigned,
-- instead of silently failing with a cryptic 400/403.

CREATE OR REPLACE FUNCTION public.enforce_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  v_company_id := public.my_company_id();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION
      'Usuário % não possui company_id. Contate o administrador.',
      auth.uid()
      USING ERRCODE = 'P0001';
  END IF;

  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$;


-- ── 2. Apply trigger to leads ────────────────────────────────
DROP TRIGGER IF EXISTS trg_enforce_company_id ON public.leads;

CREATE TRIGGER trg_enforce_company_id
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_id();


-- ── 3. Apply trigger to tasks ────────────────────────────────
DROP TRIGGER IF EXISTS trg_enforce_company_id ON public.tasks;

CREATE TRIGGER trg_enforce_company_id
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_id();


-- ── 4. Apply trigger to activities ──────────────────────────
DROP TRIGGER IF EXISTS trg_enforce_company_id ON public.activities;

CREATE TRIGGER trg_enforce_company_id
  BEFORE INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_id();


-- ── 5. Normalize leads RLS to use my_company_id() ───────────
-- The existing tenant_isolation policy may reference get_user_company_id()
-- which is not the canonical function in this schema.
-- Replace it with the correct function name.

DROP POLICY IF EXISTS "tenant_isolation" ON public.leads;

CREATE POLICY "tenant_isolation"
  ON public.leads
  TO authenticated
  USING  (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());


-- ── 6. Verification ──────────────────────────────────────────
SELECT
  'trigger' AS item,
  trigger_name AS name,
  event_object_table AS target,
  'OK' AS status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trg_enforce_company_id'

UNION ALL

SELECT
  'function', routine_name, '', 'OK'
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'enforce_company_id'

UNION ALL

SELECT
  'policy',
  policyname,
  tablename,
  CASE WHEN qual LIKE '%my_company_id%' THEN 'OK — uses my_company_id()'
       ELSE 'WARN — check function reference'
  END
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'leads'
  AND policyname = 'tenant_isolation'

ORDER BY item, target;
