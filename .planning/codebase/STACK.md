# Technology Stack

**Analysis Date:** 2026-03-20

## Languages

**Primary:**
- TypeScript ~5.8.2 - All frontend and backend code
- SQL - Supabase migrations in `supabase/migrations/`

**Secondary:**
- HTML/CSS - `frontend/index.html` + Tailwind utility classes

## Runtime

**Environment:**
- Node.js (no version pinned — no `.nvmrc` or `.node-version`; `@types/node ^22` implies Node 22+ in dev)

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`, lockfileVersion 3)

## Frameworks

**Core:**
- React 19.2.0 - UI framework; entry point `frontend/index.tsx`
- react-router-dom 7.13.1 - Client-side routing; `createBrowserRouter` in `frontend/src/app/Router.tsx`
- Express 5.2.1 (devDependency) - Local dev API server; `server.ts` at project root

**Animation / Motion:**
- framer-motion 12.23.24 - Page and component transitions throughout `frontend/src/features/`

**Drag and Drop:**
- @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, @dnd-kit/utilities 3.2.2 - Kanban board drag-and-drop

**Icons:**
- lucide-react 0.548.0 - Icon library used across all views

**QR Code:**
- qrcode.react 4.2.0 - WhatsApp QR code display in `frontend/src/features/onboarding/WhatsAppConnectModal.tsx`

**Build/Dev:**
- Vite 6.2.0 - Frontend bundler; config at `vite.config.ts`; dev server on port 3002, proxies `/api/` to port 3000
- tsx 4.21.0 - Executes `server.ts` directly for local API dev
- concurrently 9.0.0 - Runs Vite + Express together with `npm run dev`

**Testing:**
- Not detected — no test runner configured in `package.json`

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.45.0 - Database, auth, realtime; frontend client in `frontend/src/lib/supabase.ts`; admin client in `api/_lib/supabase.ts`
- @anthropic-ai/sdk 0.78.0 - Anthropic Claude support via `api/ai/generate.ts` (server-side only)
- openai 6.22.0 - OpenAI GPT support via `api/ai/generate.ts` (server-side only)
- @google/genai 1.27.0 - Google Gemini support via `api/ai/generate.ts` (server-side only)
- @sentry/react 10.45.0 - Error tracking; initialized in `frontend/index.tsx` (prod only, 20% trace sample rate)

**Infrastructure:**
- @vercel/node 5.6.15 - Type definitions for Vercel serverless functions; `api/install/migrate.ts` uses `VercelRequest/VercelResponse`

## Configuration

**Environment (server-side — `api/` and `server.ts`):**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses RLS; used only in `api/_lib/supabase.ts`
- `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY` - JWT validation in `api/_lib/auth.ts`
- `EVOLUTION_API_URL` - Self-hosted Evolution API base URL (WhatsApp provider)
- `EVOLUTION_API_KEY` - Evolution API authentication key
- `N8N_INBOUND_WEBHOOK_URL` - n8n webhook that receives new WhatsApp messages
- `N8N_OUTBOUND_WEBHOOK_URL` - n8n webhook for sending messages out
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST endpoint (rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis auth token (rate limiting)
- `ENCRYPTION_KEY` - Generic secret key (referenced in `.env.example`)
- `GEMINI_API_KEY` - Exposed to Vite build via `vite.config.ts` `define` block (legacy; AI generation now uses per-org DB credentials)

**Environment (frontend — Vite `import.meta.env`):**
- `VITE_SUPABASE_URL` - Supabase URL baked at build time
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key baked at build time
- `VITE_SENTRY_DSN` - Sentry project DSN

**Post-install override:**
- `localStorage.getItem('crm_supabase_config')` — installer saves `{url, anonKey}` here so the SPA connects before a redeploy bakes env vars; read in `frontend/src/lib/supabase.ts`

**Build:**
- `vite.config.ts` — root set to `./frontend`, output to `dist/`, port 3002
- `tsconfig.json` — target ES2022, path alias `@/*` → `./frontend/*`, `moduleResolution: bundler`
- `vercel.json` — SPA rewrite for all non-`/api/` routes, long-cache for `/assets/`, CSP headers, `api/install/migrate.ts` bundles `supabase/migrations/**`

## Platform Requirements

**Development:**
- Run `npm run dev` — starts Express API on port 3000 + Vite on port 3002 concurrently
- `.env.local` required with all server-side env vars

**Production:**
- Deployed on Vercel (static frontend + serverless API functions under `api/`)
- `api/` directory maps to Vercel Functions automatically
- Database: Supabase hosted (project ref `lxcjwmvclbfqizwtxpxy`)

---

*Stack analysis: 2026-03-20*
