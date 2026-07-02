/**
 * Verify HMAC-SHA256 signature for Meta webhooks (x-hub-signature-256)
 * 
 * Shared utility — used by all Meta webhooks (whatsapp-webhook, meta-webhook, etc.)
 * to validate that incoming requests genuinely come from Meta.
 * 
 * Usage:
 *   import { verifyHmacSignature } from "../_shared/security/verifyMetaSignature.ts";
 *   
 *   const rawBody = await req.text();
 *   const signature = req.headers.get("x-hub-signature-256") || "";
 *   const appSecret = Deno.env.get("META_APP_SECRET") || "";
 *   
 *   if (!(await verifyHmacSignature(rawBody, signature, appSecret))) {
 *     return new Response("Forbidden", { status: 403 });
 *   }
 */

/**
 * Verify that the x-hub-signature-256 header matches the HMAC-SHA256 of the raw body
 * using the Meta App Secret as the key.
 * 
 * @returns true if signature is valid, false otherwise
 */
export async function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  
  const expectedPrefix = 'sha256=';
  if (!signatureHeader.startsWith(expectedPrefix)) return false;
  
  const providedSig = signatureHeader.slice(expectedPrefix.length);
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const computedHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (computedHex.length !== providedSig.length) return false;
  
  // Constant-time comparison to prevent timing attacks
  const buf1 = new Uint8Array(encoder.encode(computedHex));
  const buf2 = new Uint8Array(encoder.encode(providedSig));
  let result = 0;
  for (let i = 0; i < buf1.length; i++) {
    result |= buf1[i] ^ buf2[i];
  }
  
  return result === 0;
}
