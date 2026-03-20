# External Integrations

**Analysis Date:** 2026-03-20

## APIs & External Services

**AI Providers (multi-tenant, per-org credentials):**
- Google Gemini - AI text generation via `@google/genai`
  - SDK/Client: `@google/genai` 1.27.0
  - Auth: org API key stored in `organization_ai_credentials` table; server fetches at request time
  - Entry: `api/ai/generate.ts` — never exposed to browser
- OpenAI GPT - AI text generation via `openai`
  - SDK/Client: `openai` 6.22.0
  - Auth: org API key stored in `organization_ai_credentials` table
  - Entry: `api/ai/generate.ts`
- Anthropic Claude - AI text generation via `@anthropic-ai/sdk`
  - SDK/Client: `@anthropic-ai/sdk` 0.78.0
  - Auth: org API key stored in `organization_ai_credentials` table
  - Entry: `api/ai/generate.ts`
  - Model: max_tokens 4096

**Admin credential management:** `api/ai/credentials.ts` — GET lists masked keys, POST upserts/disconnects (admin-only)

**WhatsApp (Evolution API):**
- Evolution API (self-hosted) - WhatsApp instance management; QR code generation; message sending
  - Client: Native `fetch` calls in `api/channels/[action].ts`
  - Auth: `EVOLUTION_API_KEY` env var (sent as `apikey` header)
  - Base URL: `EVOLUTION_API_URL` env var
  - Integration: `WHATSAPP-BAILEYS` driver
  - Actions managed: `connect`, `instance-state`, `register`, `health`, `send`, `disconnect`
  - Instance naming: `ns_${userId.replace(/-/g,'').slice(0,20)}`

**Automation Platform:**
- n8n (self-hosted at `https://n8n.julianosalles.com.br`) - Workflow automation for WhatsApp message routing and AI agent execution
  - Inbound webhook: `N8N_INBOUND_WEBHOOK_URL` — receives Evolution API events (MESSAGES_UPSERT, CONNECTION_UPDATE, etc.)
  - Outbound webhook: `N8N_OUTBOUND_WEBHOOK_URL` — called by `api/channels/[action].ts` `handleSend()` to dispatch outgoing messages
  - Workflow files: `n8n/` directory (WF-01 through WF-08, multiple versions each)
  - Key workflows: WF-01 (WhatsApp inbound routing), WF-06 (agent router cron), WF-07 (AI agent executor), WF-08 (follow-up)

**Error Tracking:**
- Sentry - Frontend error and performance monitoring
  - SDK: `@sentry/react` 10.45.0
  - Auth: `VITE_SENTRY_DSN` env var (Vite build-time)
  - Init: `frontend/index.tsx` — enabled only in production (`import.meta.env.PROD`)
  - Traces: 20% sample rate; `sendDefaultPii: false`

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - Primary data store for all CRM entities
  - Project ref: `lxcjwmvclbfqizwtxpxy` (hosted at `lxcjwmvclbfqizwtxpxy.supabase.co`)
  - Server client: `api/_lib/supabase.ts` — `createClient` with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
  - Frontend client: `frontend/src/lib/supabase.ts` — `createClient` with anon key; supports post-install `localStorage` config override
  - Migrations: 76 SQL files in `supabase/migrations/` (001 through 055+)
  - Key tables: `profiles`, `leads`, `boards`, `stages`, `conversations`, `messages`, `channel_connections`, `organization_ai_credentials`, `outgoing_webhooks`, `playbooks`, `agents`, `activities`, `tasks`
  - RLS: `my_company_id()` RPC function used in all row-level security policies

**Rate Limiting / Caching:**
- Upstash Redis - Sliding-window rate limiting for AI API calls
  - Client: Native `fetch` to Upstash REST API in `api/_lib/rateLimit.ts`
  - Auth: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
  - Limit: 20 requests/minute per user; TTL 2 min per key
  - Fallback: in-memory map when Upstash not configured (dev only)

**File Storage:**
- Not detected — no S3 or Supabase Storage buckets referenced in codebase

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - JWT-based authentication
  - Frontend: `supabase.auth.getSession()` / `supabase.auth.getUser()` via `@supabase/supabase-js`
  - API validation: `api/_lib/auth.ts` `requireAuth()` — validates Bearer JWT by instantiating a per-request Supabase client with the user token, then fetches `profiles` table for `company_id` and `role`
  - Roles: `admin`, `seller`, `user` — enforced in `api/_lib/auth.ts` `requireRole()`
  - Invite flow: `frontend/src/features/auth/InvitePage.tsx` — `/invite/:token` route

**RBAC:**
- Company isolation via `company_id` on all tables + `my_company_id()` RLS function
- `companyId` always derived from JWT on the server — never trusted from request body
- Admin: full access; Seller: restricted menu and data access

## Monitoring & Observability

**Error Tracking:**
- Sentry (`@sentry/react`) — frontend only; see Error Tracking above

**Logs:**
- `console.log` / `console.error` in API handlers; no structured logging library detected
- Frontend uses `safeError()` util from `frontend/src/utils/logger.ts` (wraps console.error)

## CI/CD & Deployment

**Hosting:**
- Vercel — static frontend served from `dist/`; `api/` directory auto-detected as serverless functions
- Build command: `vite build` (configured in `vercel.json`)
- SPA rewrite: all non-`/api/` traffic served `index.html`
- Assets: 1-year immutable cache; HTML: no-cache

**CI Pipeline:**
- Not detected — no GitHub Actions or other CI config found

**Migrations:**
- `api/install/migrate.ts` — Vercel serverless function that reads SQL files from `supabase/migrations/` and applies them via Supabase Management API (`https://api.supabase.com/v1/projects/{ref}/database/query`)
- Accessible at `POST /api/install/migrate` with `{ supabaseUrl, supabasePatToken }` body
- Tracks applied versions to skip already-run migrations

## Environment Configuration

**Required env vars (server-side):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY`)
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `N8N_INBOUND_WEBHOOK_URL`
- `N8N_OUTBOUND_WEBHOOK_URL`
- `UPSTASH_REDIS_REST_URL` (optional — falls back to in-memory)
- `UPSTASH_REDIS_REST_TOKEN` (optional — falls back to in-memory)
- `ENCRYPTION_KEY`

**Required env vars (Vite frontend build):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN` (optional — Sentry disabled if absent)
- `GEMINI_API_KEY` (legacy — exposed via `vite.config.ts` `define` block as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`)

**Secrets location:**
- `.env.local` for local development (gitignored)
- Vercel environment variables for production

## Webhooks & Callbacks

**Incoming (received by n8n, not the app server directly):**
- Evolution API pushes events to `N8N_INBOUND_WEBHOOK_URL` on n8n: `MESSAGES_UPSERT`, `CONNECTION_UPDATE`, `QRCODE_UPDATED`, `SEND_MESSAGE`

**Outgoing (dispatched by the app):**
- `POST N8N_OUTBOUND_WEBHOOK_URL` — called by `api/channels/[action].ts` `handleSend()` to forward agent/user messages to n8n for WhatsApp delivery
- User-configurable outgoing webhooks via `outgoing_webhooks` table (managed in `frontend/src/features/settings/hooks/useOutgoingWebhooks.ts` with Supabase Realtime subscription)

## Supabase Realtime

Supabase Realtime (WebSocket) is used for live data sync:
- `outgoing_webhooks` table — `frontend/src/features/settings/hooks/useOutgoingWebhooks.ts`
- Additional realtime subscriptions throughout `frontend/src/features/` (inbox, conversations, leads)
- CSP in `vercel.json` allows `wss://*.supabase.co` for WebSocket connections

---

*Integration audit: 2026-03-20*
