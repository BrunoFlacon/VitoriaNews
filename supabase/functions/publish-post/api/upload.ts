import { uploadMedia } from "../storage/storage.ts"

export async function uploadHandler(req: Request) {

const form = await req.formData()

const file = form.get("file") as File

const url = await uploadMedia(file)

return new Response(
JSON.stringify({
success:true,
url
}),
{ headers: { "Content-Type":"application/json"} }
)

}