import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EfiTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface EfiPixCobResponse {
  txid: string
  calendario: { criacao: string; expiracao: number }
  status: string
  pixCopiaECola: string
  loc: { id: number; location: string; tipoCob: string }
  location: string
  valor: { original: string }
}

async function getEfiToken(clientId: string, clientSecret: string, sandbox: boolean): Promise<string> {
  const baseUrl = sandbox
    ? 'https://api-pix-h.gerencianet.com.br'
    : 'https://api-pix.gerencianet.com.br'

  const credentials = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch(`${baseUrl}/v2/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`EFI auth failed: ${response.status} ${err}`)
  }

  const data: EfiTokenResponse = await response.json()
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { plan, customer, method } = await req.json()

    if (!plan || !customer) {
      throw new Error('Missing required fields: plan, customer')
    }

    const planPrices: Record<string, number> = {
      monthly: 2292,
      quarterly: 6992,
      yearly: 22222,
    }

    const planDays: Record<string, number> = {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    }

    const valueCents = planPrices[plan]
    const intervalDays = planDays[plan]

    if (!valueCents || !intervalDays) {
      throw new Error(`Invalid plan: ${plan}`)
    }

    const clientId = Deno.env.get('EFI_CLIENT_ID') ?? ''
    const clientSecret = Deno.env.get('EFI_CLIENT_SECRET') ?? ''
    const pixKey = Deno.env.get('EFI_PIX_KEY') ?? ''
    const sandbox = Deno.env.get('EFI_SANDBOX') === 'true'

    if (!clientId || !clientSecret || !pixKey) {
      throw new Error('EFI Bank credentials not configured')
    }

    const baseUrl = sandbox
      ? 'https://api-pix-h.gerencianet.com.br'
      : 'https://api-pix.gerencianet.com.br'

    const token = await getEfiToken(clientId, clientSecret, sandbox)

    const expiresInSeconds = 3600
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000)

    const cobPayload = {
      calendario: { expiracao: expiresInSeconds },
      devedor: {
        nome: customer.name,
        cpf: customer.cpf || undefined,
        email: customer.email,
      },
      valor: {
        original: (valueCents / 100).toFixed(2),
      },
      chave: pixKey,
      infoAdicionais: [
        { nome: 'Plano', valor: plan },
        { nome: 'Metodo', valor: method || 'pix' },
      ],
    }

    const cobResponse = await fetch(`${baseUrl}/v2/cob`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cobPayload),
    })

    if (!cobResponse.ok) {
      const err = await cobResponse.text()
      throw new Error(`EFI cobranca failed: ${cobResponse.status} ${err}`)
    }

    const cobData: EfiPixCobResponse = await cobResponse.json()

    const txid = cobData.txid
    const qrcodeText = cobData.pixCopiaECola || ''
    const qrcodeUrl = cobData.loc?.location || ''

    let qrcodeImage = ''
    if (qrcodeUrl) {
      const qrResponse = await fetch(qrcodeUrl)
      if (qrResponse.ok) {
        const qrText = await qrResponse.text()
        qrcodeImage = `data:image/svg+xml;base64,${btoa(qrText)}`
      }
    }

    const { error: insertError } = await supabase
      .from('payment_charges')
      .insert({
        txid,
        plan,
        value_cents: valueCents,
        customer_email: customer.email,
        customer_name: customer.name,
        status: 'pending',
        qrcode_text: qrcodeText,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Failed to insert payment_charge:', insertError)
    }

    return new Response(
      JSON.stringify({
        txid,
        qrcodeText,
        qrcodeImage,
        expiresAt: expiresAt.toISOString(),
        valueCents,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
