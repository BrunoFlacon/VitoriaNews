import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ENV } from "../config/env.ts"

export const supabase = createClient(
ENV.SUPABASE_URL,
ENV.SUPABASE_SERVICE_ROLE_KEY
)

export async function uploadMedia(file: File) {

const filename = `${crypto.randomUUID()}-${file.name}`

const { data, error } = await supabase
.storage
.from("media")
.upload(filename, file)

if (error) throw error

const { data: url } = supabase
.storage
.from("media")
.getPublicUrl(filename)

return url.publicUrl

}