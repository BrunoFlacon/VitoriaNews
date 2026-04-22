import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const payload = await req.json()
    const { record } = payload // From Subscriptions Webhook

    if (!record) {
      throw new Error('No record found in payload')
    }

    // 1. Fetch System Settings for Credentials
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('group', 'general')
      .single()

    const results: any = { record_id: record.id }

    // 2. Send Welcome Email via Resend
    if (settings?.resend_api_key && record.email) {
      const isPaid = record.plan_type === 'paid'
      const subject = isPaid ? "Assinatura PREMIUM Confirmada! ⭐" : "Bem-vindo ao SocialHub News! 🚀"
      const body = isPaid 
        ? `Olá ${record.full_name},\n\nParabéns! Seu acesso Premium foi liberado. Agora você tem acesso ao Radar de Poder e furos exclusivos.`
        : `Olá ${record.full_name},\n\nSucesso! Você agora faz parte da nossa newsletter gratuita e receberá alertas em tempo real.`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.resend_api_key}`,
        },
        body: JSON.stringify({
          from: settings.platform_name || 'SocialHub <contato@socialhub.com>',
          to: [record.email],
          subject: subject,
          text: body,
        }),
      })
      results.email_sent = res.ok
    }

    // 3. Send Welcome WhatsApp via Meta API
    if (settings?.whatsapp_meta_api_token && settings?.whatsapp_meta_phone_number_id && record.phone) {
      // Format number (remove non-digits, ensure standard format)
      const cleanPhone = record.phone.replace(/\D/g, '')
      
      const res = await fetch(`https://graph.facebook.com/v18.0/${settings.whatsapp_meta_phone_number_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.whatsapp_meta_api_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: {
            preview_url: false,
            body: `Olá ${record.full_name}! 👋 Confirmamos seu cadastro no Social Canvas Hub. Você passará a receber nossos alertas de inteligência e breaking news diretamente por aqui. Seja bem-vindo!`
          }
        }),
      })
      results.whatsapp_sent = res.ok
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
