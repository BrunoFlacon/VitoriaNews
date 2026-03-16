import { serve } from "https://deno.land/std/http/server.ts"
import { publishHandler } from "./api/publish"
import { uploadHandler } from "./api/upload.ts"

serve(async (req: Request) => {

const url = new URL(req.url)

if(url.pathname==="/publish"){
return publishHandler(req)
}

if(url.pathname==="/upload"){
return uploadHandler(req)
}

return new Response("SocialHub API")

})