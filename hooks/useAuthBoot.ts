import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session } from '@supabase/supabase-js';

export function useAuthBoot() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function getInitialSession() {
      const { data } = await supabase.auth.getSession();
      // This is to guard against a race condition where onAuthStateChange may fire before getSession resolves.
      if (!session) {
        setSession(data.session);
      }
      setReady(true);
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sessionState) => {
      setSession(sessionState);
    });

    return () => {
      subscription?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ready, session };
}
