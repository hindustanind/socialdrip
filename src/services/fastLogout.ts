import { supabase } from "./supabaseClient";

// Tiny helper to race a promise with a timeout
function withTimeout<T>(p: Promise<T>, ms = 1500) {
  return Promise.race([
    p,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)) as unknown as Promise<T>,
  ]);
}

// Call this from your logout button
export async function fastLogout(options?: { onLocalClear?: () => void; onNavigate?: () => void }) {
  try {
    // 1) Local instant clear (no UI waiting)
    // - Tell the app "you are logged out" immediately
    options?.onLocalClear?.();

    // 2) Background sign-out (don't block UI)
    // Using `as any` to match existing codebase style and avoid type issues.
    await withTimeout((supabase.auth as any).signOut(), 1500);

    // 3) Extra cleanup (best-effort; safe if the keys don't exist)
    try {
      // Legacy profile data
      localStorage.removeItem('dripsocial-local-profile');
      
      // From user prompt
      localStorage.removeItem("closet_items");
      localStorage.removeItem("closet_migrated");
      localStorage.removeItem("sb-access-token");
      localStorage.removeItem("sb-refresh-token");

      // From existing app logic in AuthContext (excluding localProfile which is handled by its hook)
      localStorage.removeItem('dripsocial-dripscore');
      localStorage.removeItem('dripsocial-last-welcome-toast');
      localStorage.removeItem('dripsocial-ava-tone');
      localStorage.removeItem('dripsocial-has-generated-outfit');
      localStorage.removeItem('dripsocial-migrated');
    } catch {}

    // 4) Navigate to login (if the caller didn't already do it)
    options?.onNavigate?.();
  } catch {
    // Silent — user is already on /login; nothing to show
  }
}
