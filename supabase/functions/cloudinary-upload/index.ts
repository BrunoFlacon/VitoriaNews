import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageUrl, fileName, cloudName, apiKey, apiSecret } = await req.json()

    if (!imageUrl || !cloudName || !apiKey || !apiSecret) {
      throw new Error('Parâmetros obrigatórios ausentes (imageUrl, cloudName, apiKey, apiSecret)')
    }

    console.log(`Iniciando upload para Cloudinary: ${fileName || 'imagem-sem-nome'}`)

    // 1. Download da imagem original (do Supabase Storage ou URL externa)
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error('Falha ao baixar imagem da URL de origem')
    const imageBlob = await imageResponse.blob()

    // 2. Preparar FormData para Cloudinary
    // Nota: Usamos unsigned uploads se possível ou signed se o Secret for provido
    const formData = new FormData()
    formData.append('file', imageBlob)
    formData.append('api_key', apiKey)
    formData.append('timestamp', Math.floor(Date.now() / 1000).toString())
    
    // Gerar assinatura básica (em Deno é necessário usar SubtleCrypto ou biblioteca)
    // Para simplificar esta primeira versão, usaremos a API de upload direto
    // Cloudinary requer assinatura para uploads via Secret
    
    // TODO: Implementar hmac-sha1 para assinatura segura se o Secret for necessário
    // Por enquanto, assumiremos que o usuário pode configurar um 'upload_preset' unsigned
    // ou forneceremos uma estrutura de assinatura opcional
    
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    formData.append('upload_preset', 'social_canvas_hub') // Requer que o usuário crie este preset no Cloudinary

    const uploadResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    })

    const result = await uploadResponse.json()

    if (result.error) {
      throw new Error(`Cloudinary Error: ${result.error.message}`)
    }

    console.log(`Upload concluído com sucesso. URL Cloudinary: ${result.secure_url}`)

    return new Response(
      JSON.stringify({ cloudinaryUrl: result.secure_url, publicId: result.public_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Erro na função cloudinary-upload:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
