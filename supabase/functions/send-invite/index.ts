import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const FROM              = 'NextSales <noreply@julianosalles.com.br>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── Autenticação: apenas usuários autenticados podem disparar ──
  //
  // O frontend passa o Bearer token do usuário logado.
  // Validamos contra o Supabase Auth e exigimos role = 'admin'
  // para garantir que somente admins enviem convites.

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.slice(7).trim()

  // Cria cliente com o token do usuário para validar a sessão
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth:   { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verifica se o chamador é admin na tabela profiles
  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Permissão insuficiente. Apenas administradores podem enviar convites.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Corpo da requisição ────────────────────────────────────────

  try {
    const { email, invite_link, invited_by_name, role, expires_at } = await req.json()

    if (!email || !invite_link) {
      return new Response(JSON.stringify({ error: 'email e invite_link são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const roleLabel = role === 'admin' ? 'Administrador' : 'Vendedor'
    const expirationLabel = expires_at
      ? `em ${new Date(expires_at).toLocaleDateString('pt-BR')}`
      : 'nunca'

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite NextSales</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f,#0f172a);padding:40px 40px 32px;text-align:center;">
              <div style="display:inline-block;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:12px 24px;">
                <span style="color:#60a5fa;font-size:20px;font-weight:700;letter-spacing:0.5px;">NextSales</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:700;">Você foi convidado para a NextSales</h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                <strong style="color:#e2e8f0;">${invited_by_name}</strong> te convidou para entrar na plataforma como <strong style="color:#60a5fa;">${roleLabel}</strong>. Clique no botão abaixo para criar sua conta e começar a usar.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${invite_link}"
                      style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;box-shadow:0 4px 24px rgba(59,130,246,0.35);">
                      Aceitar convite
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin:28px 0 0;color:#475569;font-size:13px;line-height:1.5;">
                Este link expira ${expirationLabel}.<br />
                Se você não esperava este convite, pode ignorar este e-mail com segurança.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;color:#334155;font-size:12px;">NextSales · Sistema de Vendas com IA</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: `${invited_by_name} te convidou para a NextSales`,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
