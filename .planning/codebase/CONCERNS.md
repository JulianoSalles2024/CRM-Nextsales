# Codebase Concerns

**Analysis Date:** 2026-03-20

---

## Tech Debt

**`useAppState.ts` is a 801-line God Hook:**
- Issue: Single hook exports ~80 values, orchestrates all Supabase hooks, all UI state, all modal state, display settings, notifications, and domain handlers. Makes testing and splitting impossible.
- Files: `frontend/src/app/useAppState.ts`
- Impact: Any change to shared state requires navigating 800 lines. Re-renders in one domain propagate everywhere. Adding new features compounds the file further.
- Fix approach: Split into domain slices (`useLeadsState`, `useTasksState`, `useUIState`) and compose in a thin root hook or Context.

**`safeError` locally re-defined in multiple files instead of importing the shared logger:**
- Issue: `const safeError = (...args: unknown[]) => console.error(...args)` is copy-pasted in `useAppState.ts` (line 38), `ProfileView.tsx` (line 9), `InvitePage.tsx` (line 21), `AuthContext.tsx` (line 70 area), `useAIProviders.ts` (line 6). The shared logger at `frontend/src/utils/logger.ts` is ignored in these files.
- Files: `frontend/src/app/useAppState.ts`, `frontend/src/features/profile/ProfileView.tsx`, `frontend/src/features/auth/InvitePage.tsx`, `frontend/src/features/ai-credentials/useAIProviders.ts`
- Impact: Inconsistent log suppression — these local wrappers always fire even in production, while `logger.ts` gates on `import.meta.env.DEV`.
- Fix approach: Remove local re-definitions and `import { safeError } from '@/src/utils/logger'`.

**`FUNCTION_META` constant duplicated between `AgentCard.tsx` and `AgentDetail.tsx`:**
- Issue: Both files define an identical `FUNCTION_META` record mapping `AgentFunctionType` to label/color/icon/bg. They diverge slightly (AgentDetail adds `ring` property).
- Files: `frontend/src/features/agents/AgentCard.tsx` (lines 9-23), `frontend/src/features/agents/AgentDetail.tsx` (lines 12-21)
- Impact: Any new agent function type requires updating two places. Risk of visual inconsistency.
- Fix approach: Extract to `frontend/src/features/agents/agentMeta.ts` and import in both components.

**`eslint-disable react-hooks/exhaustive-deps` suppression in 8+ locations:**
- Issue: Dependencies are intentionally omitted from `useEffect` hooks with silenced lint warnings rather than fixing the stale-closure correctly.
- Files: `frontend/src/features/onboarding/WhatsAppConnectModal.tsx` (lines 89, 111, 125), `frontend/src/features/leads/CreateBoardModal.tsx` (line 200), `frontend/src/features/inbox/components/MessageComposer.tsx` (line 46), `frontend/src/features/agents/AgentsCommandCenter.tsx` (line 47), `frontend/src/features/agents/AgentsPage.tsx` (line 55), `frontend/src/features/install/context/InstallContext.tsx` (line 58)
- Impact: Stale closure bugs can silently read outdated values; hard to diagnose in production.
- Fix approach: Audit each site individually — wrap callbacks in `useCallback` or restructure effects to declare stable dependencies.

**Large component files with mixed concerns:**
- Issue: Several TSX files exceed 800 lines and mix data fetching, business logic, and rendering.
- Files: `frontend/src/features/settings/TeamSettings.tsx` (1054 lines), `frontend/src/features/dashboard/SellerDetail360.tsx` (1043 lines), `frontend/src/features/settings/IntegrationsPage.tsx` (902 lines), `frontend/src/features/dashboard/GlobalSales360.tsx` (854 lines), `frontend/src/features/leads/PipelineAIModal.tsx` (840 lines)
- Impact: Hard to review, test, or extend. Merge conflicts frequent.
- Fix approach: Extract sub-components to separate files; move data-fetching logic to dedicated hooks.

**`any` type usage scattered through hooks and services:**
- Issue: `any` is used in mapper functions, hook callbacks, error catches, and install service functions rather than typed interfaces.
- Files: `frontend/src/hooks/useGroups.ts`, `frontend/src/hooks/useAIConversations.ts`, `frontend/src/hooks/useBoards.ts`, `frontend/src/features/install/services/installService.ts`, `frontend/src/services/ai/aiService.ts`
- Impact: Type errors are hidden; regressions not caught at compile time.
- Fix approach: Replace `any` with generated Supabase types or explicit interfaces per domain.

**n8n workflow version sprawl:**
- Issue: 14+ versions of WF-07 and 13+ versions of WF-01 accumulate in `n8n/` with no version registry or deprecation marker. Build scripts (`build-v*.cjs`, `make_*.js`) also accumulate.
- Files: `n8n/` directory (55 files)
- Impact: Unclear which version is active in production; risk of reimporting a stale version. Storage bloat.
- Fix approach: Archive old versions to `n8n/archive/`, document active version per workflow in a `n8n/README.md`.

---

## Known Bugs

**WF-07 V14 `HTTP - Send WhatsApp` connection lost:**
- Symptoms: WhatsApp messages not sent from the AI agent engine after WF-07 V14 import; card does not advance.
- Files: `n8n/WF-07-AGENT-EXECUTOR-V14.json`, `n8n/build-wf07-v14.cjs`
- Trigger: WF-07 V14 was imported but the Send WhatsApp HTTP node lost its connection configuration.
- Workaround: WF-07 V13 (`n8n/WF-07-AGENT-EXECUTOR-V13.json`) is still functional. Reimport V14 with corrected node.

**Lead not created when an orphan conversation exists (deleted lead + new WhatsApp message):**
- Symptoms: Sending a new WhatsApp message to a phone number whose previous lead was deleted creates an orphan conversation with no associated lead. Lead card never appears in the pipeline.
- Files: `supabase/migrations/076_fix_orphan_conversation_deleted_lead.sql`, `supabase/migrations/077_fix_orphan_lead_channel_link.sql`
- Trigger: Delete a lead → send new inbound WhatsApp from same number. Migrations 076/077 fixed the RPC but the edge case may persist depending on execution order in WF-01.
- Workaround: Manually delete the orphan `lead_channel_links` row and orphan `conversations` row, then send a new message.

**WF-08 (Agent Follow-up) not tested:**
- Symptoms: Unknown — workflow was created but never run end-to-end.
- Files: `n8n/WF-08-AGENT-FOLLOWUP-V1.json`
- Trigger: Any n8n cron trigger for WF-08.
- Workaround: None. Do not enable WF-08 in production until tested.

**Human Takeover "Voltar para Agente" button does not re-activate the AI agent:**
- Symptoms: Clicking "Voltar para Agente" in `ConversationPanel.tsx` sets the conversation status back to `waiting`, but the AI agent (WF-06/WF-07) does not automatically resume processing for that conversation.
- Files: `frontend/src/features/inbox/ConversationPanel.tsx` (lines 263-273)
- Trigger: Take over a conversation (status → `in_progress`), then click "Voltar para Agente" (status → `waiting`). WF-06 router may not re-pick conversations already in a `waiting` state after they were `in_progress`.
- Workaround: Manually reassign AI agent via the "Trocar Agente IA" menu option to force WF-06 to re-evaluate.

**AgentCard top stripe shows incorrect color for 3rd+ agents:**
- Symptoms: The top accent stripe on `AgentCard` uses `agent.avatar_color` inline style, which overrides the `meta.bg` Tailwind class. For agents where `avatar_color` is the default `#60a5fa`, the stripe renders correctly only for the first two palette colors.
- Files: `frontend/src/features/agents/AgentCard.tsx` (lines 52-55)
- Trigger: Create 3+ agents with different function types; the stripe color for `closer` (emerald), `followup` (violet), etc. is replaced by whatever `avatar_color` the user picked in the wizard.
- Workaround: No user-facing workaround.

**AgentDetail shows `null` for `tokens_input` / `tokens_output`:**
- Symptoms: Token counts display as `0` or `—` in the AgentDetail drawer for all runs because WF-07 does not currently save token counts.
- Files: `frontend/src/features/agents/AgentDetail.tsx` (line 302), `frontend/src/features/agents/hooks/useAgentDetail.ts` (line 43)
- Trigger: Open any agent detail drawer and view run history.
- Workaround: None until WF-07 is updated to write `tokens_input` / `tokens_output` to `ai_agent_runs`.

**SellerDetail360 period filter broken for `custom` range:**
- Symptoms: The "Personalizado" period option in `SellerDetail360.tsx` is defined in the `Period` type (line 39) and in `getDateRange`, but no date picker UI exists for custom range selection. Selecting it falls through without filtering.
- Files: `frontend/src/features/dashboard/SellerDetail360.tsx` (lines 39, 60-80)
- Trigger: Navigate to Painel 360 → click a seller → select custom period.
- Workaround: Use `hoje`, `semana`, `mes`, or `ano` periods.

---

## Security Considerations

**AI provider API keys stored unencrypted in Supabase (`organization_ai_credentials.ai_api_key`):**
- Risk: Third-party AI API keys (OpenAI, Anthropic, Gemini) are stored as plaintext strings in the `organization_ai_credentials` table. A Supabase service-key leak or overly broad RLS would expose all keys.
- Files: `api/ai/credentials.ts` (lines 82-91), `api/ai/generate.ts` (line 36), `api/ai/generate-playbook.ts` (line 94), `api/ai/followup/generate.ts` (line 131)
- Current mitigation: API keys never returned to browser (masked as `********`); all reads happen server-side via `supabaseAdmin`. RLS on the table restricts access.
- Recommendations: Encrypt keys at rest before upsert using the `encrypt()` function already present in `frontend/src/features/ai-credentials/aiProviders.utils.ts`; decrypt server-side only.

**`ENCRYPTION_KEY` fallback to hardcoded default:**
- Risk: `frontend/src/features/ai-credentials/aiProviders.utils.ts` line 6 falls back to `"default-encryption-key-32-chars-!!"` if `process.env.ENCRYPTION_KEY` is not set. Any data encrypted with the default key is trivially decryptable by anyone who reads the source.
- Files: `frontend/src/features/ai-credentials/aiProviders.utils.ts` (line 6)
- Current mitigation: The encrypt/decrypt functions are not currently used on production paths (keys stored plain — see above).
- Recommendations: Remove the fallback; throw an error if `ENCRYPTION_KEY` is absent. Set the env var in Vercel.

**`aiProviders.utils.ts` bundles Node.js crypto + AI SDKs in frontend module:**
- Risk: The file is in `frontend/src/features/ai-credentials/` and imports `crypto`, `@google/genai`, `openai`, and `@anthropic-ai/sdk`. If this file is included in the browser bundle, it exposes SDK internals and inflates bundle size. `process.env.ENCRYPTION_KEY` will always be `undefined` in the browser.
- Files: `frontend/src/features/ai-credentials/aiProviders.utils.ts`
- Current mitigation: The `testProviderConnection` function may only be called from API routes, not from browser code — unclear without tracing all imports.
- Recommendations: Move this file to `api/_lib/aiProviders.ts` so it is only executed server-side. Add a Vite bundle analysis step.

**Rate limiter is fail-open when Upstash Redis is unavailable:**
- Risk: `api/_lib/rateLimit.ts` catches Redis errors and returns `false` (allows the request). If Redis goes down, all rate limiting is bypassed for all AI generation endpoints.
- Files: `api/_lib/rateLimit.ts` (line 56)
- Current mitigation: In-memory fallback is used for local dev. Upstash is used in production.
- Recommendations: Acceptable for most failure modes; document the behavior explicitly. Consider a circuit-breaker with degraded limits instead of full fail-open.

**Supabase connection config (URL + anon key) persisted in `localStorage`:**
- Risk: `frontend/src/lib/supabase.ts` reads `crm_supabase_config` from `localStorage` as priority 1. The anon key in localStorage is accessible to any JavaScript running on the same origin (XSS vector).
- Files: `frontend/src/lib/supabase.ts` (lines 8-17)
- Current mitigation: The anon key has limited surface area (RLS restricts what it can access). This pattern is intentional for the post-install bootstrap flow.
- Recommendations: After Vercel redeploy bakes env vars, clear `crm_supabase_config` from localStorage to reduce exposure window.

---

## Performance Bottlenecks

**No pagination on leads query — entire company dataset loaded at once:**
- Problem: `useLeads` fetches all leads for `companyId` without pagination or cursor. For companies with hundreds/thousands of leads, this creates a large initial payload and blocks render.
- Files: `frontend/src/hooks/useLeads.ts`
- Cause: Design choice for client-side Kanban filtering, but unscalable as data grows.
- Improvement path: Add server-side pagination (keyset or offset), lazy-load columns, or use Supabase's streaming with `limit`/`range`.

**`useAppState` aggregates all domain hooks — entire app re-renders on any change:**
- Problem: `useAppState` subscribes to leads, tasks, activities, boards, users, groups, playbooks, groupAnalyses, tags, notifications, and AI providers simultaneously. Any state change in any domain triggers a re-render of the entire component tree consuming this hook.
- Files: `frontend/src/app/useAppState.ts`
- Cause: Monolithic hook with no memoization boundary.
- Improvement path: Split into focused Context providers per domain with `React.memo` at component boundaries.

**Supabase Realtime subscriptions created per-conversation in `useMessages`:**
- Problem: Each open conversation creates a new Realtime channel. With many concurrent users, this multiplies active WebSocket subscriptions.
- Files: `frontend/src/features/inbox/hooks/useMessages.ts` (lines 46-68)
- Cause: Per-conversation filter on `postgres_changes`.
- Improvement path: Use a single company-level channel and filter client-side, or use Supabase broadcast channels instead.

---

## Fragile Areas

**Inbox media rendering depends on Evolution API media URLs being publicly accessible:**
- Files: `frontend/src/features/inbox/MessageBubble.tsx` (lines 31-64)
- Why fragile: `media_url` is fetched from Supabase Storage (`frontend/src/features/inbox/MessageBubble.tsx`). If Supabase Storage bucket policies change or presigned URL TTL expires, media silently fails to render with no error state.
- Safe modification: Always add an `onError` fallback for `<img>` and `<audio>` tags. Check migration `053_storage_inbox_media.sql` to verify bucket is public.
- Test coverage: No tests for media rendering paths.

**`resolve_or_create_conversation` RPC has had 5+ migrations to fix edge cases:**
- Files: `supabase/migrations/041_fix_resolve_conversation_status_waiting.sql`, `supabase/migrations/068_fix_conversation_status_open_to_waiting.sql`, `supabase/migrations/076_fix_orphan_conversation_deleted_lead.sql`
- Why fragile: The RPC handles race conditions between simultaneous inbound messages from the same contact. Each fix introduced a new edge case. Adding multi-channel support will likely require another revision.
- Safe modification: Run the RPC only from within WF-01 (single writer). Avoid calling it from frontend code. Add a DB-level test in `supabase/seed.sql`.
- Test coverage: None — logic is tested only by manual WhatsApp message sends.

**Playbooks `created_by` migration not applied — pending schema drift:**
- Files: `frontend/src/hooks/usePlaybooks.ts`, migration SQL pending in `MEMORY.md`
- Why fragile: The frontend already injects `created_by` on insert (via `usePlaybooks.ts`), but the column does not exist in production Supabase. This creates a silent insert error or a mismatch where existing playbooks become invisible once the migration is applied (all existing rows have `created_by = null`).
- Safe modification: Apply the migration in a maintenance window and backfill `created_by` for existing playbooks before enabling the new RLS policy.
- Test coverage: None.

**AgentWizard uses a hardcoded palette of 8 colors for `avatar_color`:**
- Files: `frontend/src/features/agents/AgentWizard.tsx` (lines 37-39)
- Why fragile: The top stripe rendering in `AgentCard.tsx` mixes inline `style={{ background: agent.avatar_color }}` with Tailwind utility classes. The inline style always wins over the function-type color mapping, so the stripe color depends entirely on user color picker selection rather than agent function type. This creates visual identity confusion when the user picks a color that doesn't match the function type.
- Safe modification: Either use `avatar_color` exclusively for the avatar circle and keep the stripe driven by `meta.bg`, or document clearly that the stripe = avatar color.
- Test coverage: None.

**`install/` flow modifies Supabase credentials in `localStorage` during install:**
- Files: `frontend/src/features/install/context/InstallContext.tsx`, `frontend/src/lib/supabase.ts`
- Why fragile: The installer writes `crm_supabase_config` to `localStorage` before the Vercel build redeploys. During the window between install and redeploy, the Supabase client is bootstrapped from `localStorage`. If the user clears browser storage in this window, the app becomes unconfigured with no recovery path except re-running the installer.
- Safe modification: Add a recovery UI at `/install` that detects `supabaseUrl` is empty and prompts re-configuration.
- Test coverage: None.

---

## Scaling Limits

**n8n single-tenant deployment on `n8n.julianosalles.com.br`:**
- Current capacity: One n8n instance handling WF-01, WF-06, WF-07, WF-08 for all companies.
- Limit: WF-06 runs on a 5-minute cron and WF-07 processes one lead at a time. As agent count and conversation volume grow, the cron will be processing the previous batch when the next one fires.
- Scaling path: Switch WF-06 to a webhook-triggered fan-out pattern; add queue worker nodes inside WF-07.

**Supabase Realtime with one channel per conversation:**
- Current capacity: Each active `ConversationPanel` creates one Realtime subscription.
- Limit: Supabase free/pro plans have connection and message rate limits. 50+ concurrent agents each viewing a conversation would approach or exceed plan limits.
- Scaling path: Company-level broadcast channel with client-side filtering; or upgrade Supabase plan.

---

## Dependencies at Risk

**`n8n` self-hosted — manual upgrade dependency:**
- Risk: n8n API and node behavior change between minor versions; workflows use node-specific parameters that break on upgrade without testing.
- Impact: Entire AI agent layer stops working after an unvalidated upgrade.
- Migration plan: Pin n8n to a specific version in deployment; test each workflow in a staging n8n instance before upgrading production.

**Evolution API (WhatsApp):**
- Risk: External dependency not vendored. Endpoint (`channel_connections.external_id` = instance_name) is tightly coupled to Evolution API's instance model.
- Impact: Any Evolution API breaking change requires updates to WF-01, WF-07, `useChannelConnections`, and `ConversationPanel`.
- Migration plan: Abstract Evolution API calls behind a thin adapter service (`api/channels/[action].ts` already exists); expand it to encapsulate all Evolution API calls.

---

## Missing Critical Features

**No automated tests anywhere in the codebase:**
- Problem: Zero test files found (`find . -name "*.test.*" -o -name "*.spec.*"` returned empty). No Jest/Vitest config present.
- Blocks: Confident refactoring of `useAppState`, database RPC changes, n8n workflow updates.

**No CI pipeline:**
- Problem: No GitHub Actions or CI config detected. Pushes go directly to `main` with no lint, type-check, or build verification step.
- Blocks: Catching TypeScript errors, broken builds, or failed migrations before they hit production.

---

## Test Coverage Gaps

**All Supabase RPCs untested:**
- What's not tested: `resolve_or_create_conversation`, `resolve_or_create_lead`, `auto_assign_lead_column` trigger, `get_pending_followups`, all RLS policies.
- Files: `supabase/migrations/` (076, 077, 055, APPLY_NOW_followup_setup.sql)
- Risk: Edge-case bugs (orphan conversations, duplicate leads) discovered only in production via real WhatsApp messages.
- Priority: High

**AI agent run recording untested:**
- What's not tested: WF-07 writing `tokens_input`/`tokens_output` to `ai_agent_runs`; AgentDetail correctly displaying token totals.
- Files: `frontend/src/features/agents/AgentDetail.tsx` (line 302), `frontend/src/features/agents/hooks/useAgentDetail.ts`
- Risk: Token billing data is invisible; no cost tracking.
- Priority: Medium

**Omnichannel media pipeline untested:**
- What's not tested: Upload of images/audio from Evolution API → Supabase Storage → `MessageBubble` render path.
- Files: `frontend/src/features/inbox/MessageBubble.tsx`, `supabase/migrations/053_storage_inbox_media.sql`
- Risk: Media silently fails in production; users see broken placeholders.
- Priority: Medium

---

*Concerns audit: 2026-03-20*
