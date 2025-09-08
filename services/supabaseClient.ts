import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global { interface Window { __SUPABASE?: { url?: string; anon?: string } } }

let client: SupabaseClient | null = null;
export function getSupabase() {
  if (client) return client;
  // FIX: Replaced import.meta.env with process.env to resolve TypeScript errors.
  const url = window.__SUPABASE?.url || process.env.VITE_SUPABASE_URL || '';
  // FIX: Replaced import.meta.env with process.env to resolve TypeScript errors.
  const anon = window.__SUPABASE?.anon || process.env.VITE_SUPABASE_ANON_KEY || '';
  client = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' }
  });
  return client;
}
export const supabase = getSupabase();