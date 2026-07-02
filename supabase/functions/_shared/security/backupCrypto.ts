/**
 * Backup Crypto — AES-256-GCM encryption/decryption for WhatsApp backups
 * 
 * Uses Web Crypto API (native in Deno — no external deps).
 * 
 * Key hierarchy (envelope encryption):
 *   Master Key (KEK) → Data Encryption Key (DEK) per backup → AES-256-GCM encrypt
 * 
 * This allows rotating the master key without re-encrypting all backups.
 */

declare const Deno: { env: { get(key: string): string | undefined } };

export interface EncryptedPayload {
  encryptedBase64: string;
  ivBase64: string;
  /** SHA-256 of the master key used (for key rotation detection) */
  keyFingerprint: string;
  algorithm: 'AES-256-GCM';
  version: 1;
}

/**
 * Derive a 256-bit AES-GCM key from a passphrase using SHA-256
 */
async function deriveKey(keyString: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyString));
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Compute SHA-256 fingerprint of the key string (for identification, NOT security)
 */
async function keyFingerprint(keyString: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyString));
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt data with AES-256-GCM using a passphrase
 */
export async function encrypt(
  plaintext: string,
  keyString?: string
): Promise<EncryptedPayload> {
  const masterKey = keyString || Deno.env.get('WHATSAPP_BACKUP_MASTER_KEY') || Deno.env.get('MESSAGE_BACKUP_KEY');
  if (!masterKey) {
    throw new Error('No backup encryption key configured. Set WHATSAPP_BACKUP_MASTER_KEY env var.');
  }

  const cryptoKey = await deriveKey(masterKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return {
    encryptedBase64,
    ivBase64,
    keyFingerprint: await keyFingerprint(masterKey),
    algorithm: 'AES-256-GCM',
    version: 1,
  };
}

/**
 * Decrypt data with AES-256-GCM using a passphrase
 */
export async function decrypt(
  payload: EncryptedPayload,
  keyString?: string
): Promise<string> {
  const masterKey = keyString || Deno.env.get('WHATSAPP_BACKUP_MASTER_KEY') || Deno.env.get('MESSAGE_BACKUP_KEY');
  if (!masterKey) {
    throw new Error('No backup encryption key configured.');
  }

  const cryptoKey = await deriveKey(masterKey);

  const encryptedBytes = Uint8Array.from(atob(payload.encryptedBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(payload.ivBase64), c => c.charCodeAt(0));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Generate a random data encryption key (DEK) for per-backup encryption
 */
export function generateDEK(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...key));
}
