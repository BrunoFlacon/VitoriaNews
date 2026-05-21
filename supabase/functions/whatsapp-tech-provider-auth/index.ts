// Edge Function: whatsapp-tech-provider-auth (DEPRECIADO)
// Migrado para o modelo de Uso Próprio (Business) em meta-webhook/index.ts.
// Consulte META_OMNICHANNEL_SPEC.md na pasta docs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      status: "deprecated",
      message: "O fluxo de Tech Provider foi desativado. O sistema agora utiliza o modelo de Uso Próprio (Business). Configure os webhooks diretamente para /functions/v1/meta-webhook no painel da Meta.",
      spec: "docs/META_OMNICHANNEL_SPEC.md"
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

