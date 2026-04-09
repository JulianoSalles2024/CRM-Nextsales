// ============================================================
// EDGE FUNCTION: billing-checkout
// POST /functions/v1/billing-checkout
// ============================================================
// Cria customer no Asaas e gera cobrança (PIX / boleto / cartão).
//
// Body:
//   {
//     company_id: string
//     plan_slug: 'starter' | 'growth' | 'scale'
//     billing_interval: 'monthly' | 'yearly'
//     payment_type: 'boleto' | 'pix' | 'credit_card'
//     customer_data: { name, email, cpfCnpj, phone?, postalCode? }
//     credit_card?: { holderName, number, expiryMonth, expiryYear, ccv }
//     credit_card_holder?: { name, email, cpfCnpj, postalCode, phone }
//   }
//
// Retorna:
//   {
//     invoice_id, payment_url?, bank_slip_url?,
//     pix_qr_code?, pix_qr_code_image?, confirmed?
//   }
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ASAAS_API_KEY         = Deno.env.get('ASAAS_API_KEY')!
const ASAAS_API_URL         = Deno.env.get('ASAAS_API_URL') ?? 'https://sandbox.asaas.com/api/v3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Preços hardcoded (centavos)
const PLAN_PRICES: Record<string, { monthly: number; yearly: number; name: string }> = {
  starter: { monthly: 29700,  yearly: 267300,  name: 'Starter'  }, // R$297 / R$2.673
  growth:  { monthly: 69700,  yearly: 627300,  name: 'Growth'   }, // R$697 / R$6.273
  scale:   { monthly: 149700, yearly: 1347300, name: 'Scale'    }, // R$1.497 / R$13.473
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // ── Autenticação ──────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Não autorizado' }, 401)

  const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false },
  })
  const { data: { user } } = await anonClient.auth.getUser()
  if (!user) return json({ error: 'Não autorizado' }, 401)

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  let body: CheckoutBody
  try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }

  const { company_id, plan_slug, billing_interval, payment_type, customer_data, credit_card, credit_card_holder } = body

  // ── Verificar que usuário é admin da empresa ──────────────
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .eq('company_id', company_id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return json({ error: 'Sem permissão para gerenciar assinatura' }, 403)
  }

  const plan = PLAN_PRICES[plan_slug]
  if (!plan) return json({ error: `Plano '${plan_slug}' não encontrado` }, 400)

  const amountCents = billing_interval === 'yearly' ? plan.yearly : plan.monthly

  // ── Criar ou reusar customer no Asaas ────────────────────
  const { data: company } = await db
    .from('companies')
    .select('asaas_customer_id')
    .eq('id', company_id)
    .single()

  let gatewayCustomerId = company?.asaas_customer_id ?? null

  if (!gatewayCustomerId) {
    const customerRes = await asaasFetch('POST', '/customers', {
      name:       customer_data.name,
      email:      customer_data.email,
      cpfCnpj:    customer_data.cpfCnpj,
      phone:      customer_data.phone,
      postalCode: customer_data.postalCode,
      notificationDisabled: false,
    })

    if (!customerRes.id) {
      console.error('[billing-checkout] Erro ao criar customer:', customerRes)
      return json({ error: 'Erro ao criar cliente no gateway' }, 502)
    }

    gatewayCustomerId = customerRes.id

    // Salvar customer id na empresa
    await db
      .from('companies')
      .update({ asaas_customer_id: gatewayCustomerId })
      .eq('id', company_id)
  }

  // ── Atualizar ou criar subscription ──────────────────────
  await db.from('subscriptions').upsert({
    company_id,
    plan_slug,
    billing_interval,
    payment_type,
    status:               'past_due', // fica 'active' após pagamento confirmado
    gateway_customer_id:  gatewayCustomerId,
    cancel_at_period_end: false,       // reset ao fazer nova assinatura
    canceled_at:          null,
    metadata: {
      customer_name:  customer_data.name,
      customer_phone: customer_data.phone ?? null,
    },
  }, { onConflict: 'company_id' })

  // ── Gerar cobrança no Asaas ───────────────────────────────
  const dueDate    = addDays(new Date(), 3)
  const dueDateStr = formatDate(dueDate)

  const paymentBody: Record<string, unknown> = {
    customer:          gatewayCustomerId,
    billingType:       toBillingType(payment_type),
    value:             amountCents / 100,
    dueDate:           dueDateStr,
    description:       `${plan.name} - ${billing_interval === 'yearly' ? 'Anual' : 'Mensal'} (NextSales)`,
    externalReference: company_id,
  }

  if (payment_type === 'credit_card' && credit_card && credit_card_holder) {
    paymentBody.creditCard = {
      holderName:  credit_card.holderName,
      number:      credit_card.number,
      expiryMonth: credit_card.expiryMonth,
      expiryYear:  credit_card.expiryYear,
      ccv:         credit_card.ccv,
    }
    paymentBody.creditCardHolderInfo = credit_card_holder
  }

  const asaasPayment = await asaasFetch('POST', '/payments', paymentBody)

  if (!asaasPayment.id) {
    console.error('[billing-checkout] Erro ao gerar cobrança:', asaasPayment)
    return json({ error: 'Erro ao gerar cobrança no gateway' }, 502)
  }

  // ── Salvar token do cartão para renovação automática ─────
  if (payment_type === 'credit_card' && asaasPayment.creditCard?.creditCardToken) {
    await db.from('subscriptions').update({
      credit_card_token:       asaasPayment.creditCard.creditCardToken,
      credit_card_holder_name: asaasPayment.creditCard.creditCardHolderName ?? null,
      credit_card_last_four:   asaasPayment.creditCard.creditCardNumber?.slice(-4) ?? null,
      credit_card_brand:       asaasPayment.creditCard.creditCardBrand ?? null,
    }).eq('company_id', company_id)
    console.log('[billing-checkout] Token de cartão salvo para company:', company_id)
  }

  // ── Buscar QR Code PIX ────────────────────────────────────
  let pixPayload: string | null = null
  let pixImage: string | null   = null
  if (payment_type === 'pix') {
    try {
      const qr = await asaasFetch('GET', `/payments/${asaasPayment.id}/pixQrCode`)
      pixPayload = qr.payload      ?? null
      pixImage   = qr.encodedImage ?? null
    } catch (e) {
      console.warn('[billing-checkout] QR PIX não disponível:', e)
    }
  }

  // ── Salvar invoice ────────────────────────────────────────
  const { data: invoice, error: invError } = await db
    .from('invoices')
    .insert({
      company_id,
      gateway_invoice_id:  asaasPayment.id,
      gateway_customer_id: gatewayCustomerId,
      plan_slug,
      status:              asaasPayment.status === 'CONFIRMED' || asaasPayment.status === 'RECEIVED' ? 'paid' : 'pending',
      payment_type,
      amount_cents:        amountCents,
      due_date:            dueDateStr,
      paid_at:             asaasPayment.status === 'CONFIRMED' || asaasPayment.status === 'RECEIVED' ? new Date().toISOString() : null,
      payment_url:         asaasPayment.invoiceUrl  ?? null,
      bank_slip_url:       asaasPayment.bankSlipUrl ?? null,
      pix_qr_code:         pixPayload,
      pix_qr_code_image:   pixImage,
      description:         paymentBody.description as string,
      gateway_response:    asaasPayment,
    })
    .select('id')
    .single()

  if (invError) {
    console.error('[billing-checkout] Erro ao salvar invoice:', invError)
    return json({ error: 'Erro ao registrar cobrança' }, 500)
  }

  // Se cartão confirmado imediatamente: ativar plano
  if (asaasPayment.status === 'CONFIRMED' || asaasPayment.status === 'RECEIVED') {
    await activateCompanyPlan(db, company_id, plan_slug, billing_interval)
  }

  return json({
    invoice_id:         invoice.id,
    payment_url:        asaasPayment.invoiceUrl  ?? null,
    bank_slip_url:      asaasPayment.bankSlipUrl ?? null,
    pix_qr_code:        pixPayload,
    pix_qr_code_image:  pixImage,
    confirmed:          asaasPayment.status === 'CONFIRMED' || asaasPayment.status === 'RECEIVED',
  })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[billing-checkout] Erro não capturado:', msg)
    return json({ error: msg }, 500)
  }
})

// ── Ativar plano da empresa ───────────────────────────────────

async function activateCompanyPlan(
  db: ReturnType<typeof createClient>,
  companyId: string,
  planSlug: string,
  billingInterval: string,
) {
  const now     = new Date()
  const days    = billingInterval === 'yearly' ? 365 : 30
  const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  await Promise.all([
    db.from('companies').update({
      plan_status:     'active',
      plan_slug:       planSlug,
      plan_expires_at: expires.toISOString(),
    }).eq('id', companyId),

    db.from('subscriptions').update({
      status:               'active',
      plan_slug:            planSlug,
      current_period_start: now.toISOString(),
      current_period_end:   expires.toISOString(),
      grace_period_end:     null,
    }).eq('company_id', companyId),
  ])
}

// ── Helpers ───────────────────────────────────────────────────

async function asaasFetch(method: string, path: string, body?: unknown) {
  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  console.log(`[asaasFetch] ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Asaas retornou resposta inválida (${res.status}): ${text.slice(0, 200)}`)
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function toBillingType(type: string): string {
  return { boleto: 'BOLETO', pix: 'PIX', credit_card: 'CREDIT_CARD' }[type] ?? 'BOLETO'
}

// ── Tipos ──────────────────────────────────────────────────────

interface CheckoutBody {
  company_id:       string
  plan_slug:        string
  billing_interval: 'monthly' | 'yearly'
  payment_type:     'boleto' | 'pix' | 'credit_card'
  customer_data: {
    name:        string
    email:       string
    cpfCnpj:     string
    phone?:      string
    postalCode?: string
  }
  credit_card?: {
    holderName:  string
    number:      string
    expiryMonth: string
    expiryYear:  string
    ccv:         string
  }
  credit_card_holder?: {
    name:       string
    email:      string
    cpfCnpj:    string
    postalCode: string
    phone:      string
  }
}
