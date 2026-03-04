-- ============================================================
-- 004_diagnostic.sql
-- Run BEFORE applying the structural fix.
-- Execute each block separately and inspect the output.
-- ============================================================

-- ── 1. RLS status ───────────────────────────────────────────
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'invites', 'companies')
ORDER BY tablename;

-- ── 2. Active policies on profiles ──────────────────────────
SELECT policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- ── 3. Active policies on invites ───────────────────────────
SELECT policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'invites'
ORDER BY cmd, policyname;

-- ── 4. Trigger on auth.users ────────────────────────────────
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- ── 5. Check constraints on profiles ────────────────────────
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND contype = 'c';

-- ── 6. Foreign keys on profiles ─────────────────────────────
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND contype = 'f';

-- ── 7. Sellers without company_id (safety check) ────────────
SELECT id, email, role, company_id
FROM public.profiles
WHERE role IN ('admin', 'seller')
  AND company_id IS NULL;
