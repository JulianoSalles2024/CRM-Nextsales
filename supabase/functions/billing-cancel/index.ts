// ============================================================
// EDGE FUNCTION: billing-cancel
// POST /functions/v1/billing-cancel
// Body: { company_id: string, reason: string }
// Marca cancel_at_period_end = true — acesso mantido até vencer
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

    // ── Auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado' }, 401)

    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth:   { persistSession: false },
    })
    const { data: { user } } = await anonClient.auth.getUser()
    if (!user) return json({ error: 'Não autorizado' }, 401)

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    const { company_id, reason } = await req.json()
    if (!company_id) return json({ error: 'company_id obrigatório' }, 400)

    // ── Verificar que é admin ──────────────────────────────────
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .eq('company_id', company_id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return json({ error: 'Sem permissão' }, 403)
    }

    // ── Buscar subscription ativa ─────────────────────────────
    const { data: sub } = await db
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('company_id', company_id)
      .single()

    if (!sub || !['active', 'past_due'].includes(sub.status)) {
      return json({ error: 'Nenhuma assinatura ativa encontrada' }, 400)
    }

    // ── Marcar cancelamento ao fim do período ─────────────────
    await db.from('subscriptions').update({
      cancel_at_period_end: true,
      metadata: db
        .from('subscriptions')
        .select('metadata')
        .eq('company_id', company_id)
        .then(() => ({})), // sobrescreve via update abaixo
    }).eq('company_id', company_id)

    // Salvar motivo nos metadados
    const { data: currentSub } = await db
      .from('subscriptions')
      .select('metadata')
      .eq('company_id', company_id)
      .single()

    await db.from('subscriptions').update({
      cancel_at_period_end: true,
      metadata: { ...(currentSub?.metadata ?? {}), cancel_reason: reason, canceled_requested_at: new Date().toISOString() },
    }).eq('company_id', company_id)

    console.log(`[billing-cancel] Cancelamento agendado para company ${company_id}, motivo: ${reason}`)

    return json({
      ok: true,
      access_until: sub.current_period_end,
      message: 'Cancelamento agendado. Acesso mantido até o fim do período.',
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[billing-cancel] Erro:', msg)
    return json({ error: msg }, 500)
  }
})
