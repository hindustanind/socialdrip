import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global { interface Window { __SUPABASE?: { url?: string; anon?: string } } }

let client: SupabaseClient | null = null;
export function getSupabase() {
  if (client) return client;
  const url = window.__SUPABASE?.url || process.env.VITE_SUPABASE_URL || '';
  const anon = window.__SUPABASE?.anon || process.env.VITE_SUPABASE_ANON_KEY || '';
  
  // --- ADDED DIAGNOSTIC LOGGING ---
  console.log('[SupaClient] Initializing Supabase client...');
  console.log(`[SupaClient] URL: ${url}`);
  if (anon) {
    console.log(`[SupaClient] Anon Key Prefix: ${anon.substring(0, 8)}...`);
  } else {
    console.warn('[SupaClient] Anon Key is missing or empty!');
  }
  // --- END DIAGNOSTIC LOGGING ---

  client = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' }
  });
  return client;
}
export const supabase = getSupabase();
