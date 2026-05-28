import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Estas chaves são públicas por design (anon key / publishable key).
// A segurança real do Supabase vem das RLS policies, não de esconder essas chaves.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ghtkdkauseesambzqfrd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodGtka2F1c2Vlc2FtYnpxZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTUwMTQsImV4cCI6MjA4OTUzMTAxNH0.X1OeIwLezATvztpzJzDJWMSUgukNXIWNQp2L1rHkLGs';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

