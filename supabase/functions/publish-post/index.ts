import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { publishFacebook } from "./platforms/facebook.ts"
import { publishInstagram } from "./platforms/instagram.ts"
import { publishX } from "./platforms/x.ts"
import { publishYoutube } from "./platforms/youtube.ts"
import { publishTelegram } from "./platforms/telegram.ts"
import { publishTikTok } from "./platforms/tiktok.ts"
import { publishPinterest } from "./platforms/pinterest.ts"
import { publishLinkedin } from "./platforms/linkedin.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { postId, platforms, content, mediaUrls } = await req.json()

  const results = []

  const { data: connections } = await supabase
    .from("social_connections")
    .select("*")

  for (const platform of platforms) {

    const connection = connections.find((c:any)=>c.platform===platform)

    if(!connection){
      results.push({
        platform,
        success:false,
        error:"Conta não conectada"
      })
      continue
    }

    let result

    switch(platform){

      case "facebook":
        result = await publishFacebook(content,mediaUrls,connection)
        break

      case "instagram":
        result = await publishInstagram(content,mediaUrls,connection)
        break

      case "x":
        result = await publishX(content,mediaUrls,connection)
        break

      case "youtube":
        result = await publishYoutube(content,mediaUrls,connection)
        break

      case "telegram":
        result = await publishTelegram(content,mediaUrls,connection)
        break

      case "tiktok":
        result = await publishTikTok(content,mediaUrls,connection)
        break

      case "pinterest":
        result = await publishPinterest(content,mediaUrls,connection)
        break

      case "linkedin":
        result = await publishLinkedin(content,mediaUrls,connection)
        break

      default:
        result={success:false,error:"Plataforma não suportada"}
    }

    results.push({
      platform,
      ...result
    })

  }

  return new Response(JSON.stringify({results}),{
    headers:{...corsHeaders,"Content-Type":"application/json"}
  })

})