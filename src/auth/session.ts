// FIX: Updated Supabase client import path.
import { supabase } from "../lib/supa";
import { isLogoutFlagSet } from "../services/logoutFlag";

let currentSession: any = null;
let ready = false;
let listeners: Array<(s: any, rdy: boolean) => void> = [];
let polling = false;
let intervalId: number | null = null;

const onVis = () => { if (document.visibilityState === "visible") tick(); };

export function onSession(cb: (session: any, ready: boolean) => void) {
  listeners.push(cb);
  cb(currentSession, ready);
  return () => { listeners = listeners.filter(x => x !== cb); };
}

function emit() {
  for (const cb of listeners) cb(currentSession, ready);
}

export async function bootSessionOnce() {
  if (ready) return;
  const { data } = await supabase.auth.getSession();
  currentSession = data?.session ?? null;
  ready = true;
  emit();
  startPolling();
}

async function tick() {
    if (isLogoutFlagSet()) {
      stopSessionPoller();
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const next = data?.session ?? null;
      if ((next && !currentSession) || (!next && currentSession) || (next?.access_token !== currentSession?.access_token)) {
        currentSession = next;
        emit();
      }
    } catch {}
}

function startPolling() {
  if (polling) return;
  polling = true;
  intervalId = window.setInterval(tick, 2000);
  document.addEventListener("visibilitychange", onVis);
}

export function stopSessionPoller() {
    if (!polling) return;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    document.removeEventListener("visibilitychange", onVis);
    polling = false;
}

export function getSessionSnapshot() {
  return { session: currentSession, ready };
}
