import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias.');
}

const AUTH_STORAGE_KEY = `sb-${SUPABASE_URL.replace(/[^a-zA-Z0-9]/g, '-')}-auth-token`;

// Remove sessão expirada do localStorage no load do módulo para evitar que
// o SDK tente fazer refresh automático com servidor inacessível.
function clearStaleSession(): void {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const expiresAt = parsed?.expires_at ?? 0;
    // Se já expirou ou expira em <60s, remove para evitar refresh desnecessário
    if (expiresAt < (Date.now() / 1000) + 60) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
  }
}
clearStaleSession();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: false,
  }
});

export function clearSupabaseSession(): void {
  try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
}

