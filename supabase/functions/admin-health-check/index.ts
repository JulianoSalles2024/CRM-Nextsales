/**
 * admin-health-check — proxy seguro para o n8n API
 *
 * Requer JWT válido com role = platform_admin (app_metadata).
 * Busca workflows pela tag "nextsales", execuções recentes com erro
 * e retorna status consolidado.
 *
 * Secrets: N8N_API_KEY, N8N_BASE_URL
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_API_KEY           = Deno.env.get('N8N_API_KEY') ?? ''
const N8N_BASE_URL          = Deno.env.get('N8N_BASE_URL') ?? 'https://n8n.julianosalles.com.br'
const N8N_TAG               = 'Nextsales'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

async function isPlatformAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return false
  return user.app_metadata?.role === 'platform_admin'
}

async function fetchTaggedWorkflows(): Promise<{ workflows: any[]; n8nOnline: boolean }> {
  const all: any[] = []
  let cursor: string | undefined

  try {
    while (true) {
      const url = new URL(`${N8N_BASE_URL}/api/v1/workflows`)
      url.searchParams.set('tags', N8N_TAG)
      url.searchParams.set('limit', '100')
      if (cursor) url.searchParams.set('cursor', cursor)

      const res = await fetch(url.toString(), {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) return { workflows: [], n8nOnline: false }

      const json = await res.json()
      all.push(...(json.data ?? []))

      cursor = json.nextCursor
      if (!cursor || (json.data ?? []).length === 0) break
    }
    return { workflows: all, n8nOnline: true }
  } catch {
    return { workflows: [], n8nOnline: false }
  }
}

async function fetchRecentErrors(): Promise<any[]> {
  try {
    const url = new URL(`${N8N_BASE_URL}/api/v1/executions`)
    url.searchParams.set('status', 'error')
    url.searchParams.set('limit', '20')

    const res = await fetch(url.toString(), {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })

  const isAdmin = await isPlatformAdmin(req.headers.get('authorization'))
  if (!isAdmin) return respond({ error: 'Unauthorized' }, 401)

  const [{ workflows, n8nOnline }, errors] = await Promise.all([
    fetchTaggedWorkflows(),
    fetchRecentErrors(),
  ])

  const taggedIds = new Set(workflows.map((w: any) => w.id))
  const taggedErrors = errors.filter((e: any) => taggedIds.has(e.workflowId))

  return respond({
    n8nOnline,
    workflows: workflows.map((w: any) => ({
      id:        w.id,
      name:      w.name,
      active:    w.active,
      updatedAt: w.updatedAt,
    })),
    errors: taggedErrors.map((e: any) => ({
      id:           e.id,
      workflowId:   e.workflowId,
      workflowName: workflows.find((w: any) => w.id === e.workflowId)?.name ?? e.workflowId,
      startedAt:    e.startedAt,
      stoppedAt:    e.stoppedAt,
      status:       e.status,
    })),
    checkedAt: new Date().toISOString(),
  })
})
