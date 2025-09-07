import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global { interface Window { __SUPABASE?: { url?: string; anon?: string } } }

let client: SupabaseClient | null = null;
export function getSupabase() {
  if (client) return client;
  // FIX: Cast `import.meta` to `any` to resolve TypeScript error. The `env` property is provided by Vite during build.
  const url = window.__SUPABASE?.url || (import.meta as any).env.VITE_SUPABASE_URL || '';
  // FIX: Cast `import.meta` to `any` to resolve TypeScript error. The `env` property is provided by Vite during build.
  const anon = window.__SUPABASE?.anon || (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
  client = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' }
  });
  return client;
}
export const supabase = getSupabase();