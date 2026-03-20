# Testing Patterns

**Analysis Date:** 2026-03-20

## Test Framework

**Runner:** None — no test framework is installed or configured.

**Assertion Library:** None detected.

**Config files:** No `jest.config.*`, `vitest.config.*`, or equivalent found in project root or `frontend/`.

**Run Commands:**
```bash
# No test command configured in package.json
# "scripts" only contains: dev, dev:api, dev:ui, build, preview, lint
```

**Type checking (only automated quality gate):**
```bash
npm run lint   # runs: tsc --noEmit
```

## Test File Organization

**Location:** No test files exist anywhere in the project.

**Pattern:** No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files were found.

## Test Structure

**Suite Organization:** Not applicable — no tests exist.

**Patterns:** Not applicable.

## Mocking

**Framework:** None.

**Patterns:** Not applicable.

## Fixtures and Factories

**Test Data:** Not applicable.

**Location:** No fixture or factory files detected.

## Coverage

**Requirements:** None enforced — no coverage tooling configured.

**View Coverage:** Not applicable.

## Test Types

**Unit Tests:** None.

**Integration Tests:** None.

**E2E Tests:** None — no Playwright, Cypress, or similar framework installed.

## Manual Testing Context

Although there is no automated testing, the codebase has patterns that indicate where tests would be highest value:

**Data mappers** (`frontend/src/lib/mappers.ts`):
- `mapLeadFromDb`, `mapLeadToDb`, `mapActivityFromDb`, `mapActivityToDb`, `mapTaskFromDb`, `mapTaskToDb`
- Pure functions with clear input/output contracts — ideal unit test candidates

**Business logic utilities** (`frontend/src/lib/leadStatus.ts`):
- `getLeadComputedStatus(lead, columnType)` — pure function with priority-ordered branching logic
- `STATUS_DOT_COLOR`, `STATUS_BADGE` lookup tables

**Permissions** (`frontend/src/lib/permissions.ts`):
- `PERMISSIONS` record mapping role to feature flags — straightforward to assert against

**API handlers** (`api/` directory):
- `api/_lib/errors.ts` — `apiError` dispatcher, typed error classes
- `api/_lib/auth.ts` — `requireAuth`, `requireRole` — critical auth logic with no test coverage
- `api/_utils.ts` — `encrypt`/`decrypt` AES-256-CBC functions — cryptographic correctness untested

**Supabase hooks** (`frontend/src/hooks/`):
- `useLeads`, `useAgents`, `useConversations` — Supabase client calls, Realtime subscriptions
- Currently tested only by manual use in the browser

## Recommended Setup (if tests are added)

Based on the stack (Vite + TypeScript + React):

**Framework to adopt:** Vitest (native Vite integration, no config friction)

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

**Suggested vitest config addition to `vite.config.ts`:**
```typescript
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./frontend/src/test/setup.ts'],
}
```

**Where to place test files:**
- Co-located with source: `frontend/src/lib/mappers.test.ts` alongside `mappers.ts`
- Or in `frontend/src/test/` subdirectory

**Highest-priority files to test first:**
1. `frontend/src/lib/mappers.ts` — pure transforms, easy to test
2. `frontend/src/lib/leadStatus.ts` — branching logic, pure function
3. `api/_lib/errors.ts` — `apiError` dispatcher behavior
4. `api/_lib/auth.ts` — `requireAuth`/`requireRole` with mocked Supabase client
5. `api/_utils.ts` — `encrypt`/`decrypt` round-trip test

---

*Testing analysis: 2026-03-20*
