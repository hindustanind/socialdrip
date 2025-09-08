import React from 'react';
// FIX: Updated Supabase client import path.
import { supabase } from "../lib/supa";

// Tiny helper to race a promise with a timeout
function withTimeout<T>(p: Promise<T>, ms = 4000) {
  return Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Login request timed out.')), ms)) as Promise<T>,
  ]);
}

interface FastLoginOptions {
    email: string;
    password: string;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export async function fastLogin({ email, password, setLoading, setError }: FastLoginOptions) {
    setLoading(true);
    setError(null);
    try {
        if (!email || !password) {
            throw new Error('Please fill all fields.');
        }

        // FIX: The type inference for `withTimeout` can be problematic, resulting in a type of `{}`. Casting the awaited result to `any` allows for destructuring the 'error' property.
        const { error } = (await withTimeout(
            // Using `as any` to match existing codebase style and avoid type issues.
            (supabase.auth as any).signInWithPassword({ email, password })
        )) as any;
        
        if (error) throw error;
        // On success, the onAuthStateChange listener will handle the session update and navigation.
        // We don't need to do anything else here.

    } catch (e: any) {
        setError(e?.message || 'Login failed. Please try again.');
    } finally {
        setLoading(false);
    }
}
