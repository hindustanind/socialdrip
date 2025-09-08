import { createClient } from "@supabase/supabase-js";

declare global { interface Window { __SUPABASE?: { url?: string; anon?: string } } }

const supabaseUrl = window.__SUPABASE?.url || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = window.__SUPABASE?.anon || process.env.VITE_SUPABASE_ANON_KEY || '';

// sessionStorage adapter
const sessionAdapter = {
  getItem: (key: string) => {
    try { return sessionStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string) => {
    try { sessionStorage.setItem(key, value); } catch {}
  },
  removeItem: (key: string) => {
    try { sessionStorage.removeItem(key); } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: sessionAdapter as any,
    autoRefreshToken: false,     // 🔒 stop surprise rehydration
    detectSessionInUrl: true,
  },
});