import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/gotrue-js';
import { isLogoutFlagSet } from '../services/logoutFlag';

export function useAuthBoot() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If a logout is in progress, short-circuit the auth boot process.
    // The app will render the LoginPage, which will clear the flag.
    if (isLogoutFlagSet()) {
      setReady(true);
      return;
    }

    async function getInitialSession() {
      const { data } = await (supabase.auth as any).getSession();
      // Guard against race conditions and the logout flag being set.
      if (!session && !isLogoutFlagSet()) {
        setSession(data.session);
      }
      setReady(true);
    }

    getInitialSession();

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, sessionState: Session | null) => {
      // The check is removed here to allow SIGNED_OUT event to be processed
      // during the logout flow. The initial check at the top of useEffect
      // prevents re-authentication if the page is reloaded during logout.
      setSession(sessionState);
    });

    return () => {
      subscription?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ready, session };
}
