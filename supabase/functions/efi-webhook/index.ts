import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function calculateExpiresAt(plan: string, fromDate: Date): Date {
  const planDays: Record<string, number> = {
    monthly: 30,
    quarterly: 90,
    yearly: 365,
  }
  const days = planDays[plan] || 30
  return new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ─── Webhook authentication via secret token ──────────────
    const webhookSecret = Deno.env.get('EFI_WEBHOOK_SECRET') ?? ''
    if (webhookSecret) {
      const url = new URL(req.url)
      const token = url.searchParams.get('token')
      if (!token || token !== webhookSecret) {
        console.error('[EFI-Webhook] Invalid or missing token')
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()

    console.log('[EFI-Webhook] Received payload:', JSON.stringify(payload))

    const txid = payload.txid || payload?.pix?.[0]?.txid

    if (!txid) {
      console.warn('[EFI-Webhook] No txid found in payload')
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (charge.status === 'paid') {
      console.log('[EFI-Webhook] Charge already paid, skipping:', txid)
      return new Response(
        JSON.stringify({ received: true, status: 'already_paid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[EFI-Webhook] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
