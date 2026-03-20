# Architecture

**Analysis Date:** 2026-03-20

## Pattern Overview

**Overall:** Single-Page Application with feature-slice frontend + Vercel serverless API backend

**Key Characteristics:**
- Feature-sliced frontend: code organized by business domain under `frontend/src/features/`
- Global state managed via one giant custom hook (`useAppState`) exposed through React Context
- Direct Supabase access from frontend hooks (anon key + RLS) for most reads/writes
- Vercel serverless functions in `api/` handle operations requiring server-side secrets (AI API keys, service role)
- Multi-tenant isolation enforced at DB level via Supabase RLS using `my_company_id()` RPC and `company_id` column on every table
- Supabase Realtime channels subscribed per-entity per-company-id for live updates

## Layers

**Routing Layer:**
- Purpose: Browser URL routing and initial provider setup
- Location: `frontend/src/app/Router.tsx`
- Contains: `createBrowserRouter` definition with three top-level routes: `/install/*`, `/invite/:token`, `/*`
- Depends on: React Router DOM, `AppProviders`, `InstallProvider`
- Used by: `frontend/index.tsx` (app entry point)

**Auth Layer:**
- Purpose: Supabase session management, role resolution, company isolation
- Location: `frontend/src/features/auth/AuthContext.tsx`
- Contains: `AuthProvider` context, `useAuth` hook; resolves `currentUserRole` (`admin`|`seller`|`user`), `companyId`, `isRoleReady` flag
- Depends on: `frontend/src/lib/supabase.ts` (anon client), `frontend/src/lib/permissions.ts`
- Used by: nearly all feature hooks and the app shell

**App State Layer:**
- Purpose: Central state aggregation — merges all Supabase hooks + business logic handlers
- Location: `frontend/src/app/useAppState.ts`
- Contains: All entity state (leads, tasks, activities, boards, groups, playbooks, tags, users), all UI modal state, all business logic handlers (create/update/delete/move for each entity)
- Depends on: `frontend/src/hooks/use*.ts` (data hooks), feature hooks, `AuthContext`
- Used by: `frontend/App.tsx` (feeds `AppContext.Provider`)

**App Context Layer:**
- Purpose: Distribute global app state down the component tree without prop drilling
- Location: `frontend/src/app/AppContext.tsx`
- Contains: Loosely typed (`Record<string, any>`) context — `AppContextValue`
- Used by: `frontend/src/app/RootLayout.tsx` via `useAppContext()`

**Layout / Shell Layer:**
- Purpose: Renders the chrome (Sidebar, Header, modals, banners) and delegates view rendering
- Location: `frontend/src/app/RootLayout.tsx`
- Contains: `Sidebar`, `Header`, all global modals (`CreateEditLeadModal`, `LeadDetailSlideover`, `LostLeadModal`, etc.), WhatsApp banner, onboarding guard
- Depends on: `AppContext`, `AuthContext`, all modal components
- Used by: `frontend/App.tsx`

**View Routing Layer:**
- Purpose: Renders the active page view based on `activeView` string state
- Location: `frontend/src/app/AppRouter.tsx`
- Contains: `switch(activeView)` mapping view names to page components; enforces RBAC (seller cannot see Painel 360, etc.)
- Depends on: All page-level feature components
- Used by: `RootLayout.tsx` as `<main>` content

**Feature Layer:**
- Purpose: Business-domain UI pages and their scoped logic
- Location: `frontend/src/features/<domain>/`
- Contains: Page components, sub-components, domain-specific hooks (`hooks/`), types, services
- Depends on: Shared hooks (`frontend/src/hooks/`), `AuthContext`, `frontend/src/lib/supabase.ts`
- Used by: `AppRouter.tsx`

**Data Hooks Layer:**
- Purpose: Supabase data access abstraction — fetch, CRUD, Realtime subscription per entity
- Location: `frontend/src/hooks/use*.ts`
- Contains: One hook per entity: `useLeads`, `useTasks`, `useActivities`, `useBoards`, `useUsers`, `useGroups`, `usePlaybooks`, `useTags`, `useGoals`, `useChannelConnections`, etc.
- Pattern: Each hook fetches on mount, exposes create/update/delete callbacks, subscribes to a named Supabase Realtime channel `<entity>-realtime-<companyId>`
- Depends on: `frontend/src/lib/supabase.ts`, `frontend/src/lib/mappers.ts`
- Used by: `useAppState.ts` (global) and individual feature hooks

**Mapper Layer:**
- Purpose: Bidirectional translation between Supabase snake_case rows and frontend camelCase domain types
- Location: `frontend/src/lib/mappers.ts`
- Contains: `mapLeadFromDb`, `mapLeadToDb`, `mapActivityFromDb`, `mapActivityToDb`, `mapTaskFromDb`, `mapTaskToDb`
- Used by: Data hooks in `frontend/src/hooks/`

**API (Serverless) Layer:**
- Purpose: Server-side operations that require secrets never exposed to the browser
- Location: `api/` (Vercel Functions, TypeScript with `.js` relative imports)
- Contains: AI generation (`api/ai/generate.ts`, `api/ai/generate-playbook.ts`, `api/ai/followup/generate.ts`), AI credentials management (`api/ai/credentials.ts`), channel management (`api/channels/[action].ts`), messages (`api/messages/send.ts`), API keys (`api/api-keys/`), installer (`api/install/migrate.ts`), opportunities (`api/opportunities/[action].ts`)
- Auth pattern: Every handler calls `await requireAuth(req)` from `api/_lib/auth.ts`, which validates JWT + fetches `companyId` from profiles — `companyId` never comes from the request body
- Depends on: `api/_lib/supabase.ts` (service-role client), `api/_lib/auth.ts`, `api/_lib/rateLimit.ts`, `api/_lib/errors.ts`

## Data Flow

**Standard CRUD Flow (e.g., creating a lead):**

1. User action triggers handler in `useAppState.ts` (e.g., `handleCreateOrUpdateLead`)
2. Handler calls `createLead()` from `useLeads` hook
3. `useLeads` maps data via `mapLeadToDb()` and calls `supabase.from('leads').insert()`
4. Supabase DB trigger `enforce_company_id()` stamps `company_id` server-side
5. `fetchLeads()` re-fetches the full list after mutation
6. Supabase Realtime channel `leads-realtime-<companyId>` fires `postgres_changes` event
7. Realtime callback calls `fetchLeadsRef.current()` — all subscribers refresh
8. `useAppState` holds updated leads array; `AppContext` propagates to all consumers

**AI Generation Flow:**

1. Frontend calls `POST /api/ai/generate` with JWT in `Authorization` header
2. `requireAuth(req)` validates JWT, extracts `companyId` from Supabase profiles table
3. Handler queries `organization_ai_credentials` for configured provider (gemini/openai/anthropic)
4. API key from DB is used server-side — never sent to browser
5. Result text returned as `{ text: string }` JSON response

**Auth/Navigation Flow:**

1. `frontend/index.tsx` mounts `RouterProvider` with `ErrorBoundary` + Sentry
2. `Router.tsx` matches path: `/*` → `AppProviders` → `AuthProvider` → `AuthGate` → `App`
3. `AuthGate` checks Supabase session; redirects to `AuthPage` if unauthenticated
4. On successful auth, `AuthContext` fetches role + `company_id` from `profiles` table; sets `isRoleReady = true`
5. `App.tsx` calls `useAppState()` → all data hooks fire their initial fetches
6. `RootLayout` renders Sidebar/Header/content; `AppRouter` switches on `activeView` string
7. URL kept in sync with `activeView` via `useEffect` in `RootLayout` using `VIEW_PATHS` map

**State Management:**
- Global entity state lives in `useAppState` (passed through `AppContext`)
- Feature-local state lives in domain-specific hooks under `features/<domain>/hooks/`
- UI preferences (card settings, minimized columns/leads) persisted to `localStorage` via `useLocalStorage` helper in `useAppState`
- Theme persisted to `localStorage` key `crm-theme`

## Key Abstractions

**AppState (God Hook):**
- Purpose: Single aggregation point for all app state and handlers
- Location: `frontend/src/app/useAppState.ts`
- Pattern: Composes many small hooks; returns ~80 values/handlers; exposed via `AppContext`

**Data Hook Pattern:**
- Purpose: Each entity gets one hook with fetch + CRUD + Realtime
- Examples: `frontend/src/hooks/useLeads.ts`, `frontend/src/hooks/useTasks.ts`, `frontend/src/hooks/useBoards.ts`
- Pattern: `fetchRef` trick — Realtime subscriber holds a ref to latest fetch function to prevent stale-closure loops and React 18 Strict Mode double-subscribe

**Mapper Pattern:**
- Purpose: Decouple DB column naming from frontend type naming
- Location: `frontend/src/lib/mappers.ts`
- Pattern: `mapXFromDb(row)` → domain type; `mapXToDb(partial)` → DB payload with `omitUndefined()`

**Feature Module:**
- Purpose: Collocate all UI + logic for a business domain
- Examples: `frontend/src/features/leads/`, `frontend/src/features/inbox/`, `frontend/src/features/agents/`
- Pattern: `index.ts` barrel re-exports public API; `hooks/` sub-directory for domain-specific hooks

**View Navigation:**
- Purpose: String-keyed SPA navigation without full React Router path-per-view
- Location: `frontend/src/app/viewPaths.ts`
- Pattern: `VIEW_PATHS` maps view name → URL path; `PATH_VIEWS` is the inverse; `RootLayout` keeps URL in sync via `navigate()`

## Entry Points

**Browser Entry:**
- Location: `frontend/index.tsx`
- Triggers: Vite dev server or production bundle load
- Responsibilities: Mount React root, init Sentry, provide `RouterProvider`

**App Shell Entry:**
- Location: `frontend/App.tsx`
- Triggers: Matched by `Router.tsx` catch-all `/*` route after auth providers
- Responsibilities: Call `useAppState()`, provide `AppContext`, render `RootLayout`

**API Entry (per function):**
- Location: `api/**/*.ts` (each file is one Vercel Function)
- Triggers: HTTP request to matching `/api/` path
- Responsibilities: Validate JWT via `requireAuth()`, execute business logic, return JSON

**Installer Entry:**
- Location: `frontend/src/features/install/InstallRouter.tsx`
- Triggers: Route `/install/*`
- Responsibilities: Multi-step onboarding wizard for setting up Supabase + migrations

## Error Handling

**Strategy:** Centralized boundaries + per-handler try/catch + `apiError` helper in API layer

**Patterns:**
- `ErrorBoundary` class component in `frontend/src/app/providers.tsx` wraps entire app; renders red error screen with stack trace on uncaught React errors
- Sentry `init` in `frontend/index.tsx`; production-only (`enabled: import.meta.env.PROD`)
- API handlers wrap all logic in `try/catch` calling `apiError(res, err)` from `api/_lib/errors.ts`
- `AppError` and `AuthError` typed error classes in `api/_lib/errors.ts` carry HTTP status codes
- Frontend handlers catch errors and call `showNotification(msg, 'error')` for user feedback
- Supabase `.maybeSingle()` used (not `.single()`) when zero rows is a valid result

## Cross-Cutting Concerns

**Logging:** `frontend/src/utils/logger.ts` exports `safeLog` (dev-only console.log) and `safeError`; API uses direct `console.error`

**Validation:** Minimal — mostly nullish checks in handlers; no dedicated validation library detected

**Authentication:** JWT-based via Supabase Auth; frontend uses anon client with session; API validates every request with `requireAuth()` which verifies JWT and fetches `companyId` from profiles — `companyId` never trusted from client

**Multi-tenancy:** `company_id` stamped by DB trigger `enforce_company_id()` on insert; RLS policies on all tables use `my_company_id()` RPC function; `companyId` from `AuthContext` gates all data hook queries

**RBAC:** Three roles: `admin`, `seller`, `user` (defined in `frontend/src/lib/permissions.ts`); `isRoleReady` flag prevents rendering until role resolves; `AppRouter.tsx` enforces view-level access; API uses `requireRole()` for admin-only endpoints; Seller sees filtered data (own leads/tasks only)

---

*Architecture analysis: 2026-03-20*
