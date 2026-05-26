import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

function calculateExpiresAt(plan: string, fromDate: Date): Date {
  const planDays: Record<string, number> = {
    monthly: 30,
    quarterly: 90,
    yearly: 365,
  }
  const days = planDays[plan] || 30
  return new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000)
}

async function verifyHmacSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const payloadBytes = encoder.encode(payload)
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const expectedSig = await crypto.subtle.sign('HMAC', cryptoKey, payloadBytes)
    const expectedHex = Array.from(new Uint8Array(expectedSig)).map(b => b.toString(16).padStart(2, '0')).join('')
    return expectedHex === signature
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    // ─── Webhook authentication via HMAC-SHA256 signature ─────
    const webhookSecret = Deno.env.get('EFI_WEBHOOK_SECRET') ?? ''
    if (webhookSecret) {
      const rawBody = await req.clone().text()
      const signature = req.headers.get('x-efi-signature') || req.headers.get('x-signature-sha256') || ''
      const isValid = await verifyHmacSignature(rawBody, signature, webhookSecret)
      if (!signature || !isValid) {
        console.error('[EFI-Webhook] Invalid HMAC signature')
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }, status: 401 }
        )
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()

    console.log('[EFI-Webhook] Received payment notification for txid:', payload.txid || '(pending)')

    const txid = payload.txid || payload?.pix?.[0]?.txid

    if (!txid) {
      console.warn('[EFI-Webhook] No txid found in payload')
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const { data: charge, error: findError } = await supabase
      .from('payment_charges')
      .select('*')
      .eq('txid', txid)
      .single()

    if (findError || !charge) {
      console.error('[EFI-Webhook] Charge not found for txid:', txid)
      return new Response(
        JSON.stringify({ error: 'Charge not found' }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (charge.status === 'paid') {
      console.log('[EFI-Webhook] Charge already paid, skipping:', txid)
      return new Response(
        JSON.stringify({ received: true, status: 'already_paid' }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const { error: updateError } = await supabase
      .from('payment_charges')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('txid', txid)

    if (updateError) {
      throw new Error(`Failed to update payment_charge: ${updateError.message}`)
    }

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', charge.customer_email)
      .maybeSingle()

    if (existingSub) {
      const currentExpires = existingSub.expires_at
        ? new Date(existingSub.expires_at)
        : new Date()
      const newExpires = currentExpires > new Date()
        ? calculateExpiresAt(charge.plan, currentExpires)
        : calculateExpiresAt(charge.plan, new Date())

      const { error: renewError } = await supabase
        .from('subscriptions')
        .update({
          plan: charge.plan,
          status: 'active',
          expires_at: newExpires.toISOString(),
        })
        .eq('email', charge.customer_email)

      if (renewError) {
        console.error('[EFI-Webhook] Failed to renew subscription:', renewError)
      }
    } else {
      const newExpires = calculateExpiresAt(charge.plan, new Date())

      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          email: charge.customer_email,
          plan: charge.plan,
          status: 'active',
          expires_at: newExpires.toISOString(),
        })

      if (insertError) {
        console.error('[EFI-Webhook] Failed to create subscription:', insertError)
      }
    }

    const { data: subscriber } = await supabase
      .from('portal_subscribers')
      .select('*')
      .eq('email', charge.customer_email)
      .maybeSingle()

    if (subscriber) {
      const metadata = subscriber.metadata || {}
      metadata.payment_status = 'pago'
      metadata.efi_txid = txid

      const { error: subUpdateError } = await supabase
        .from('portal_subscribers')
        .update({
          plan_type: 'paid_sub',
          metadata,
        })
        .eq('email', charge.customer_email)

      if (subUpdateError) {
        console.error('[EFI-Webhook] Failed to update subscriber:', subUpdateError)
      }
    }

    return new Response(
      JSON.stringify({
        received: true,
        txid,
        status: 'paid',
        customer_email: charge.customer_email,
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[EFI-Webhook] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
