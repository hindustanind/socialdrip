import React, { useEffect } from 'react';
import { supabase } from '../lib/supa';

const ConnectivityProbes: React.FC = () => {

  useEffect(() => {
    const runProbes = async () => {
      console.log('%c[Connectivity Probe] Running...', 'color: cyan; font-weight: bold;');

      // Probe 1: Database SELECT
      try {
        const { data, error } = await supabase.from("outfits").select("id").limit(1);
        if (error) throw error;
        console.log('[Connectivity Probe] 1. Database SELECT: SUCCESS', { data });
      } catch (error) {
        console.error('[Connectivity Probe] 1. Database SELECT: FAILED', error);
      }
      
      // Probe 2: Storage LIST
      try {
        const { data, error } = await supabase.storage.from("outfits").list('', { limit: 1 });
        if (error) throw error;
        console.log('[Connectivity Probe] 2. Storage LIST: SUCCESS', { data });
      } catch (error) {
        console.error('[Connectivity Probe] 2. Storage LIST: FAILED', error);
      }

      // Probe 3: Storage createSignedUrls
      try {
        // Using a dummy path as requested
        const testPath = "9fc4c4a7-da6b-4f2d-9e5b-5b75a9382ae7/test.jpg";
        const { data, error } = await supabase.storage.from("outfits").createSignedUrls([testPath], 600);
        if (error) throw error;
        // The result will likely be an error if the object doesn't exist, but a successful API call is what we're testing.
        if (data && data.length > 0 && data[0].error) {
             console.warn('[Connectivity Probe] 3. Storage createSignedUrls: API call succeeded, but signing failed (this is expected if file does not exist)', { error: data[0].error });
        } else {
             console.log('[Connectivity Probe] 3. Storage createSignedUrls: SUCCESS', { data });
        }
      } catch (error) {
        console.error('[Connectivity Probe] 3. Storage createSignedUrls: FAILED', error);
      }

      // Probe 4: auth.getUser()
      try {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          console.log('[Connectivity Probe] 4. Auth getUser: SUCCESS', { user: data.user ? { id: data.user.id, email: data.user.email } : null });
      } catch (error) {
          console.error('[Connectivity Probe] 4. Auth getUser: FAILED', error);
      }

      console.log('%c[Connectivity Probe] Finished.', 'color: cyan; font-weight: bold;');
    };

    // A short delay to allow the main app to render first.
    const timer = setTimeout(runProbes, 1000);

    return () => clearTimeout(timer);

  }, []);

  return null; // This component does not render anything
};

export default ConnectivityProbes;