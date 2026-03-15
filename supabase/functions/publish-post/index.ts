import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

import { publishTelegram } from "./platforms/telegram.ts"
import { publishX } from "./platforms/x.ts"
import { publishFacebook } from "./platforms/facebook.ts"
import { publishInstagram } from "./platforms/instagram.ts"
import { publishYoutube } from "./platforms/youtube.ts"
import { publishTikTok } from "./platforms/tiktok.ts"
import { publishLinkedin } from "./platforms/linkedin.ts"
import { publishPinterest } from "./platforms/pinterest.ts"
import { publishThreads } from "./platforms/threads.ts"
import { publishWhatsApp } from "./platforms/whatsapp.ts"
import { publishSnapchat } from "./platforms/snapchat.ts"

serve(async (req) => {

  const body = await req.json()

  const { content, platforms } = body

  const results:any[] = []

  for (const platform of platforms) {

    try {

      let response

      switch (platform) {

        case "telegram":
          response = await publishTelegram(content)
          break

        case "x":
          response = await publishX(content)
          break

        case "facebook":
          response = await publishFacebook(content)
          break

        case "instagram":
          response = await publishInstagram(content)
          break

        case "youtube":
          response = await publishYoutube(content)
          break

        case "tiktok":
          response = await publishTikTok(content)
          break

        case "linkedin":
          response = await publishLinkedin(content)
          break

        case "pinterest":
          response = await publishPinterest(content)
          break

        case "threads":
          response = await publishThreads(content)
          break

        case "whatsapp":
          response = await publishWhatsApp(content)
          break

        case "snapchat":
          response = await publishSnapchat(content)
          break

        default:
          response = { error: "platform not supported" }

      }

      results.push({
        platform,
        response
      })

    } catch (error) {

      results.push({
        platform,
        error: error.message
      })

    }

  }

  return new Response(
    JSON.stringify({
      success: true,
      results
    }),
    { headers: { "Content-Type": "application/json" } }
  )

})