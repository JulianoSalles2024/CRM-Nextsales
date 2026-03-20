# Codebase Structure

**Analysis Date:** 2026-03-20

## Directory Layout

```
CRM-Fity/
├── api/                        # Vercel serverless functions (TypeScript, ESM)
│   ├── _lib/                   # Shared API utilities (auth, errors, rateLimit, supabase)
│   ├── ai/                     # AI generation endpoints
│   │   └── followup/           # Follow-up generation sub-route
│   ├── ai-keys/                # API key CRUD
│   ├── channels/               # WhatsApp channel management
│   ├── install/                # Database migration endpoint
│   ├── messages/               # Message send endpoint
│   └── opportunities/          # Opportunity scoring endpoints
├── frontend/                   # Vite root (configured in vite.config.ts)
│   ├── App.tsx                 # Root React component — mounts AppContext
│   ├── index.tsx               # Browser entry point — Sentry, RouterProvider
│   ├── components/             # Legacy/one-off components (pre-feature-slice)
│   │   ├── onboarding/         # OnboardingModal
│   │   └── opportunities/      # PredictiveOpportunitiesModal
│   └── src/
│       ├── app/                # App shell: routing, layout, global state
│       ├── design-system/      # Design tokens, base UI components
│       ├── features/           # Business-domain feature modules
│       ├── hooks/              # Shared Supabase data hooks (one per entity)
│       ├── lib/                # Core utilities: supabase client, mappers, permissions
│       ├── pages/              # Standalone pages (InvitePage — outside main app shell)
│       ├── services/           # Cross-feature service modules (AI)
│       ├── shared/             # Shared presentational components (GlassCard, etc.)
│       └── utils/              # Pure utilities (logger)
├── supabase/
│   └── migrations/             # SQL migration files (sequential numbering)
├── n8n/                        # n8n workflow JSON exports
├── docs/
│   └── plans/                  # Feature planning documents
├── dist/                       # Vite build output (gitignored)
├── vite.config.ts              # Vite config — root: ./frontend, alias @/ → ./frontend
├── vercel.json                 # Vercel deployment config (rewrites, headers, CSP)
├── tsconfig.json               # TypeScript config
└── package.json                # Root package (all deps here, not in frontend/)
```

## Directory Purposes

**`api/`:**
- Purpose: Vercel serverless functions; handles server-side secrets and privileged operations
- Contains: One `.ts` file per endpoint; shared utilities in `_lib/`
- Key files: `api/_lib/auth.ts` (JWT validation), `api/_lib/supabase.ts` (service-role client), `api/ai/generate.ts` (AI proxy)
- Import rule: All imports must use relative paths with `.js` extension (ESM requirement for Vercel Functions)

**`api/_lib/`:**
- Purpose: Shared helpers for all API functions
- Key files: `auth.ts` (requireAuth + requireRole), `supabase.ts` (supabaseAdmin singleton), `errors.ts` (AppError, AuthError, apiError), `rateLimit.ts`

**`frontend/src/app/`:**
- Purpose: Application shell — routing, layout, global state management
- Key files:
  - `Router.tsx` — top-level React Router config (3 routes)
  - `providers.tsx` — `AppProviders` wrapper (AuthProvider + AuthGate) and `ErrorBoundary`
  - `App.tsx` (at `frontend/App.tsx`) — mounts `AppContext.Provider` with `useAppState()`
  - `useAppState.ts` — global state aggregation hook (~800 lines); owns all handlers
  - `AppContext.tsx` — React context (`Record<string, any>`)
  - `RootLayout.tsx` — chrome: Sidebar, Header, all global modals
  - `AppRouter.tsx` — `switch(activeView)` view renderer
  - `Sidebar.tsx` — navigation; RBAC-aware menu items
  - `Header.tsx` — top bar with user info, theme toggle, SDR bot button
  - `viewPaths.ts` — `VIEW_PATHS` and `PATH_VIEWS` bidirectional URL mapping
  - `viewPaths.ts` — all view names: `'Dashboard'`, `'Pipeline'`, `'Leads'`, `'Omnichannel'`, `'Agentes'`, etc.

**`frontend/src/features/`:**
- Purpose: Feature-sliced business domain modules; each feature owns its UI, local hooks, and types
- Contains one directory per domain:

| Directory | Domain |
|-----------|--------|
| `auth/` | Login, registration, AuthContext, AuthGate, InvitePage |
| `leads/` | Pipeline (Kanban), lead list, lead creation/editing, recovery |
| `dashboard/` | Dashboard, DashboardPage, Painel360, GlobalSales360, GroupsDashboard |
| `inbox/` | Omnichannel inbox — conversations, messages, MessageComposer |
| `agents/` | AI Agents — AgentsPage, AgentCard, AgentDetail, AgentWizard |
| `ai/` | SDR Assistant chat, AI Hub view, prompt editor |
| `ai-credentials/` | AI provider credentials management (Gemini/OpenAI/Anthropic) |
| `tasks/` | Activities, tasks, calendar |
| `settings/` | SettingsPage, TeamSettings, GoalsTab, pipeline config |
| `notifications/` | Realtime notifications bell + dropdown |
| `playbooks/` | Playbook CRUD and application UI |
| `groups/` | Lead groups management |
| `reports/` | Analytics/reports page and PDF export |
| `profile/` | User profile view |
| `onboarding/` | Pipeline + WhatsApp connect onboarding flows |
| `install/` | Multi-step self-hosted installer wizard |
| `chat/` | Legacy chat module (ChatView, InboxView — pre-omnichannel) |
| `activities/` | LeadDetailSlideover (activity feed + full lead detail) |

**`frontend/src/hooks/`:**
- Purpose: Shared data hooks — one per Supabase entity; all follow the same fetch + CRUD + Realtime pattern
- Key files: `useLeads.ts`, `useTasks.ts`, `useActivities.ts`, `useBoards.ts`, `useUsers.ts`, `useGroups.ts`, `usePlaybooks.ts`, `useTags.ts`, `useGoals.ts`, `useChannelConnections.ts`, `useTeamMembers.ts`
- Pattern used by: `useAppState.ts` and domain-specific feature hooks

**`frontend/src/lib/`:**
- Purpose: Core shared utilities that do not belong to any single feature
- Key files:
  - `supabase.ts` — Supabase anon client singleton; exports `supabaseUrl` (used in `AuthGate` to detect unconfigured installs)
  - `mappers.ts` — DB↔frontend type conversion (Lead, Activity, Task)
  - `permissions.ts` — `AppRole` type, `PERMISSIONS` record, `Permissions` interface
  - `uiStyles.ts` — design system style constants (button-tab patterns, modal classes, etc.)
  - `leadStatus.ts` — `getLeadComputedStatus()` helper

**`frontend/src/design-system/`:**
- Purpose: Base UI component library and design tokens
- Key files: `Button.tsx`, `Card.tsx`, `Input.tsx`, `Modal.tsx`, `Toggle.tsx`, `Dropdown.tsx`, `index.ts` (barrel), `tokens.ts`, `colors.ts`, `spacing.ts`, `typography.ts`

**`frontend/src/shared/components/`:**
- Purpose: Cross-feature presentational components too generic for any feature module
- Key files: `GlassCard.tsx`, `GlassSection.tsx`, `VercelAvatar.tsx`

**`frontend/src/services/ai/`:**
- Purpose: Client-side AI service abstraction that calls `/api/ai/generate`
- Key files: `aiService.ts`, `config.ts`, `generator.ts`, `index.ts`

**`supabase/migrations/`:**
- Purpose: Sequential SQL migration files applied to the Supabase database
- Naming: Numeric prefix (e.g., `001_...sql`, `020_...sql`); applied via `api/install/migrate.ts`

## Key File Locations

**Entry Points:**
- `frontend/index.tsx`: Browser entry — Sentry init, `ReactDOM.createRoot`, `RouterProvider`
- `frontend/App.tsx`: React app root — `useAppState()` + `AppContext.Provider` + `RootLayout`
- `frontend/src/app/Router.tsx`: Route definitions — 3 top-level routes
- `frontend/src/app/providers.tsx`: `AppProviders` and `ErrorBoundary`

**Configuration:**
- `vite.config.ts`: Vite — root `./frontend`, alias `@/` → `./frontend`, dev port 3002, proxy `/api/` → `localhost:3000`
- `vercel.json`: Deployment — SPA rewrite, CSP headers, function file inclusions
- `tsconfig.json`: TypeScript compiler options

**Core Logic:**
- `frontend/src/app/useAppState.ts`: All business logic handlers and global state (~800 lines)
- `frontend/src/app/AppRouter.tsx`: View-to-component mapping + RBAC enforcement
- `frontend/src/app/RootLayout.tsx`: Shell layout + all global modals
- `frontend/src/lib/mappers.ts`: DB↔frontend data translation
- `frontend/src/lib/permissions.ts`: Role definitions and permission map
- `api/_lib/auth.ts`: JWT validation and role extraction for API layer

**Global Types:**
- `types.ts` (project root, referenced as `@/types`): All shared TypeScript types (Lead, Task, Activity, Board, User, Group, etc.)
- `frontend/src/types.ts`: Re-export shim from `@/types` (deprecated, kept for compatibility)

**Testing:**
- No test files detected in the codebase

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `KanbanBoard.tsx`, `LeadDetailSlideover.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useLeads.ts`, `useAppState.ts`)
- Services/utilities: `camelCase.ts` (e.g., `mappers.ts`, `leadStatus.ts`)
- Feature barrel files: `index.ts` (named exports, not default)
- API handlers: `camelCase.ts` or `[param].ts` for dynamic routes

**Directories:**
- Feature modules: `camelCase` (e.g., `leads/`, `aiCredentials/` appears as `ai-credentials/`)
- API sub-routes: `camelCase` matching URL segment (e.g., `api/ai/`, `api/messages/`)

**View Names:**
- String literals in Portuguese (e.g., `'Pipeline'`, `'Leads'`, `'Omnichannel'`, `'Agentes'`, `'Configurações'`)
- Defined in `frontend/src/app/viewPaths.ts`

## Where to Add New Code

**New Feature/Page:**
- Create directory: `frontend/src/features/<featureName>/`
- Add page component: `frontend/src/features/<featureName>/<FeatureName>Page.tsx`
- Add barrel: `frontend/src/features/<featureName>/index.ts`
- Register view: Add entry to `VIEW_PATHS` in `frontend/src/app/viewPaths.ts`
- Register route: Add `case 'ViewName':` in `frontend/src/app/AppRouter.tsx`
- Add navigation item: Add to `Sidebar.tsx` nav items array (with RBAC filter if needed)

**New Data Entity:**
- Add types to `types.ts` (project root)
- Add mapper functions to `frontend/src/lib/mappers.ts`
- Create hook: `frontend/src/hooks/use<EntityName>.ts` following the fetch+CRUD+Realtime pattern
- Wire into global state: Add hook call to `useAppState.ts` and expose values in return object

**New API Endpoint:**
- Create file: `api/<category>/<action>.ts`
- Always start with `const ctx = await requireAuth(req);`
- Import shared utils with relative `.js` extensions: `import { supabaseAdmin } from '../_lib/supabase.js'`
- Use `supabaseAdmin` (service role) for DB operations in API layer

**New Domain Hook (feature-scoped):**
- Create: `frontend/src/features/<domain>/hooks/use<HookName>.ts`
- These are for logic local to one feature only; cross-feature data goes in `frontend/src/hooks/`

**New Shared UI Component:**
- Generic enough for any feature: `frontend/src/shared/components/<ComponentName>.tsx`
- Belongs to design system: `frontend/src/design-system/components/<ComponentName>.tsx` + export from `frontend/src/design-system/index.ts`

**New Setting/Configuration UI:**
- Add tab to: `frontend/src/features/settings/SettingsPage.tsx`
- Create tab component: `frontend/src/features/settings/tabs/<TabName>Tab.tsx` or a root-level settings file
- Add any supporting hook: `frontend/src/features/settings/hooks/use<Setting>.ts`

**New Supabase Migration:**
- Add file: `supabase/migrations/<nextNumber>_<description>.sql`
- Apply via `api/install/migrate.ts` endpoint or Supabase Dashboard

## Special Directories

**`api/_lib/`:**
- Purpose: Shared server-side utilities (auth, db client, error handling, rate limiting)
- Generated: No
- Committed: Yes
- Note: Never import from frontend — service role key lives here

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes (by `vite build`)
- Committed: No (gitignored)

**`supabase/migrations/`:**
- Purpose: SQL DDL migration files for the Supabase database
- Generated: No (hand-authored)
- Committed: Yes — included in `api/install/migrate.ts` Vercel Function via `vercel.json` `includeFiles`

**`n8n/`:**
- Purpose: n8n automation workflow JSON exports for AI agent workflows (WF-01, WF-05, WF-06, WF-07, WF-08)
- Generated: No (exported from n8n UI)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents (phase plans, codebase analysis)
- Generated: No
- Committed: Yes

**`credentials/`:**
- Purpose: Credential configuration for self-hosted install (default-org setup)
- Generated: No
- Committed: Yes (check for sensitive content before pushing)

---

*Structure analysis: 2026-03-20*
