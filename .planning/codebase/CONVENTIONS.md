# Coding Conventions

**Analysis Date:** 2026-03-20

## Naming Patterns

**Files:**
- React components: PascalCase, `.tsx` extension — e.g., `AgentCard.tsx`, `LeadsPage.tsx`, `InboxPage.tsx`
- React hooks: camelCase prefixed with `use`, `.ts` extension — e.g., `useLeads.ts`, `useAgents.ts`, `useConversations.ts`
- Utility/lib files: camelCase, `.ts` extension — e.g., `mappers.ts`, `leadStatus.ts`, `permissions.ts`
- API handlers: camelCase, `.ts` extension with `.js` imports at call sites — e.g., `send.ts`, `auth.ts`, `errors.ts`
- Feature directories: camelCase — e.g., `ai-credentials/`, `inbox/`, `leads/`

**Functions:**
- Event handlers: `handle` prefix — e.g., `handleSelectConversation`, `handleDeleteLead`, `handleStatusChange`
- Fetch functions: `fetch` prefix — e.g., `fetchLeads`, `fetchAgents`, `fetchConversations`
- Boolean flags: `is` or `has` prefix — e.g., `isActive`, `isLoading`, `isRoleReady`, `isAdmin`
- CRUD operations: verb + noun — e.g., `createLead`, `updateAgent`, `deleteLead`, `archiveAgent`

**Variables:**
- Local state: camelCase — `activeTab`, `menuOpen`, `pill`, `conversations`
- Constants (lookup tables): SCREAMING_SNAKE_CASE — e.g., `FUNCTION_META`, `TONE_LABELS`, `TAB_PATHS`, `PATH_TAB`
- Supabase query results: destructure `{ data, error }` — standard throughout

**Types:**
- Interfaces: PascalCase with descriptive names — e.g., `AgentCardProps`, `TeamMember`, `AuthContextValue`
- Type aliases (unions): PascalCase — e.g., `AgentFunctionType`, `ConversationStatus`, `LeadsTab`
- Domain entity interfaces: PascalCase, exported from hooks — e.g., `AIAgent`, `OmniConversation`, `AgentRanking`
- DB field names: snake_case (mirroring Supabase columns) within interfaces — e.g., `is_active`, `company_id`

## Code Style

**Formatting:**
- No ESLint or Prettier config files detected — formatting is informal/editor-driven
- TypeScript strict mode is NOT enabled (no `strict: true` in `tsconfig.json`)
- `allowJs: true` — JavaScript files are permitted
- Indentation: 2 spaces in most frontend files, 4 spaces in some older files (`TeamSettings.tsx`, `useAppState.ts`) — inconsistency present

**Linting:**
- Only `tsc --noEmit` runs as lint (package.json `"lint"` script)
- No ESLint, no Biome — type errors are the only automated lint gate
- `// eslint-disable-next-line react-hooks/exhaustive-deps` comments appear, meaning hooks rules are enforced informally

## Import Organization

**Order (observed pattern):**
1. React and React hooks — `import React, { useState, useEffect, useCallback, useRef } from 'react'`
2. Third-party libraries — framer-motion, lucide-react, @dnd-kit, react-router-dom
3. Internal cross-module imports using `@/` alias — `import { supabase } from '@/src/lib/supabase'`
4. Relative intra-module imports — `import { AgentCard } from './AgentCard'`
5. Type-only imports — `import type { AIAgent } from './hooks/useAgents'`

**Path Aliases:**
- `@/*` resolves to `./frontend/*` (set in `tsconfig.json` and `vite.config.ts`)
- Cross-module: `@/src/features/<domain>/` — e.g., `@/src/features/auth/AuthContext`
- Cross-layer: `@/src/lib/supabase`, `@/src/lib/mappers`, `@/src/utils/logger`
- Type imports: `@/types` for top-level shared types
- API layer (ESM): relative imports with `.js` extension mandatory — e.g., `import { supabaseAdmin } from './supabase.js'`

## Error Handling

**Frontend hooks:**
- CRUD mutations: `if (error) throw error` — caller is responsible for catching
- Fetch operations: `if (!error) setData(...)` pattern — errors are silently swallowed on reads in some hooks
- Supabase `.maybeSingle()` used when 0 rows is a valid result; `.single()` when exactly 1 row is expected
- Comment explaining the choice is often included: `// 0 rows é válido — empresa ainda não configurou`

**API layer (`api/` directory):**
- Typed error classes: `AuthError(status, message)` and `AppError(status, message)` in `api/_lib/errors.ts`
- Central handler: `apiError(res, err)` — AuthError/AppError messages reach client; all other errors return generic `"Erro interno"` + `console.error` on server
- All handlers follow try/catch wrapping the entire function body, with `return apiError(res, err)` in catch

**React components:**
- Errors are generally not shown to users via error boundaries — no `ErrorBoundary` components detected
- Some operations fire-and-forget with `.then(() => {})` — e.g., marking messages as read in `InboxPage.tsx`

## Logging

**Framework:** Custom wrapper in `frontend/src/utils/logger.ts`

**Patterns:**
- Use `safeLog`, `safeWarn`, `safeError` from `@/src/utils/logger` — these only emit in `import.meta.env.DEV`
- Prefixes with module name: `safeLog('DEBUG useLeads rows returned from DB:', ...)`
- Exceptions: some hooks and components use raw `console.error` directly (not wrapped) — `useAIConversations.ts`, `useGroupAnalyses.ts`, `usePlaybooks.ts`, `TeamSettings.tsx`
- API layer uses `console.error('[api/error]', err)` — always logs to server stdout regardless of env

## Comments

**When to Comment:**
- Explain non-obvious Supabase behaviors: why `.maybeSingle()` vs `.single()`, why `company_id` is not sent on INSERT
- Explain React hook dependency omissions: `// user?.id — not user object (prevents loop)`
- Explain Realtime patterns: why `fetchRef` pattern prevents stale closures in subscription effects
- Block separators: `// ── Section Name ──────────────────────────────────────────`

**JSDoc/TSDoc:**
- Used sparingly — mainly in `uiStyles.ts` for token documentation
- Function signatures with `/** ... */` blocks only for shared lib functions, not for component props or hooks

## Function Design

**Size:** Some page-level components and hooks are very large (600–1054 lines). `TeamSettings.tsx` (1054 lines), `SellerDetail360.tsx` (1043 lines), `useAppState.ts` (801 lines) exceed a comfortable size. Feature hooks (`useLeads.ts`, `useAgents.ts`) are well-sized (~100–160 lines).

**Parameters:** Component props are typed via `interface XxxProps`. Hooks accept minimal parameters: `useLeads(companyId: string | null)`, `useConversations(statusFilter, search)`.

**Return Values:**
- Hooks return a plain object: `{ data, loading, create, update, delete, refetch }`
- Mutation functions return `Promise<void>` or `Promise<Entity>` — async/await throughout
- Components return `JSX.Element` or `React.FC<Props>`

## Module Design

**Exports:**
- Feature components: mix of named (`export const AgentsPage`) and default (`export default LeadsPage`) exports
- Design system components: named exports only — `export { Button }`, `export { Modal }`
- Hooks: named function exports — `export function useLeads(...)`
- Types: `export interface`, `export type` inline in the defining file

**Barrel Files:**
- Every feature directory that exposes public API has an `index.ts` barrel — `features/leads/index.ts`, `features/auth/index.ts`, etc.
- Barrel files re-export both `default` and named exports
- Not all features use barrel files: `features/inbox/`, `features/agents/`, `features/settings/tabs/` do not have top-level barrels
- Design system has a central barrel at `frontend/src/design-system/index.ts`

## Component Patterns

**Page components:** Stateful, coordinate child components, hold tab/filter state locally with `useState`.

**Sliding-pill tab bars:** Implemented with `useRef` measuring `offsetLeft`/`offsetWidth` of each button. Reusable `SlidingPillTabs` in `TeamSettings.tsx`; inline implementations in `AgentsPage.tsx`, `Dashboard.tsx`, `GlobalSales360.tsx`.

**Lookup tables:** Module-level `const` Record objects (`FUNCTION_META`, `TAB_PATHS`, `STATUS_BADGE`) replace switch statements — declare at file top, outside component.

**Tailwind:** All styling via Tailwind utility classes. Dark theme only (`bg-slate-900`, `bg-[#0B1220]`). Design tokens available in `frontend/src/design-system/tokens.ts` and `frontend/src/lib/uiStyles.ts`.

---

*Convention analysis: 2026-03-20*
