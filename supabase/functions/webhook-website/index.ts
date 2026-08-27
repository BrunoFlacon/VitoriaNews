import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const reqData = await req.json();
    const { name, email, phone, plan_type = "free" } = reqData;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Salvar no banco (supondo que a tabela seja "subscribers")
    const { data: subscriber, error: dbError } = await supabase
      .from("subscribers")
      .upsert({ name, email, phone, plan_type, status: "active", updated_at: new Date().toISOString() })
      .select()
      .single();

    if (dbError && dbError.code !== '42P01') { // Ignore table not found for now
      console.error("DB Error:", dbError);
    }

    // 2. Disparar Email de Boas Vindas (Resend)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      let html = `<p>Olá ${name || 'Assinante'}, bem-vindo(a) à nossa Newsletter!</p>`;
      if (plan_type === 'paid') {
        html += `<p>Obrigado por assinar o plano VIP! Aqui estão os links exclusivos para nossos grupos no WhatsApp e Telegram.</p>`;
      } else {
        html += `<p>Ficamos felizes em ter você no nosso grupo gratuito.</p>`;
      }
      
      await resend.emails.send({
        from: 'no-reply@webradiovitoria.com.br',
        to: email,
        subject: 'Bem-vindo(a) à nossa Newsletter!',
        html
      });
    }

    // 3. Integração com WhatsApp (Chamar webhook existente ou Evolution API)
    // Opcionalmente chamar a function do whatsapp
    /*
    if (phone) {
       // logic to send welcome msg
    }
    */

    return new Response(JSON.stringify({ success: true, message: "Webhook processed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
