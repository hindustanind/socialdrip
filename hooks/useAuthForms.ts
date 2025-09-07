import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const RESERVED = new Set(['admin','support','root','null','undefined']);
const norm = (s: string) => s.trim().toLowerCase().replace(/__+/g,'_');

async function usernameAvailable(u: string) {
  if (!u) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .ilike('username', u)
    .limit(1)
    .maybeSingle();
  if (error && (error as any).code !== 'PGRST116') console.warn('username check', error);
  return !data;
}

export function useAuthForms() {
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string|null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [uStatus, setUStatus] = useState<'idle'|'checking'|'taken'|'ok'>('idle');
  const [signupError, setSignupError] = useState<string|null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const u = norm(username);
    if (!u) { setUStatus('idle'); return; }
    if (RESERVED.has(u) || u.length < 3 || u.length > 20 || !/^[a-z0-9_]+$/.test(u)) {
      setUStatus('taken'); return;
    }
    setUStatus('checking');
    const t = setTimeout(async () => {
      const ok = await usernameAvailable(u);
      if (!active) return;
      setUStatus(ok ? 'ok' : 'taken');
    }, 350);
    return () => { active = false; clearTimeout(t); };
  }, [username]);

  async function login() {
    setLoginError(null);
    if (!loginEmail || !loginPassword) { setLoginError('Please fill all fields.'); return; }
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) throw error;
      window.location.assign('/');
    } catch (e: any) {
      setLoginError(e?.message || 'Login failed. Please try again.');
    } finally { setLoginLoading(false); }
  }

  async function createAccount() {
    console.log('createAccount clicked');
    setSignupError(null);
    const u = norm(username); // always lowercased
    if (!email || !password || !u) { setSignupError('Please fill all fields.'); return; }
    if (uStatus !== 'ok') { setSignupError('Username is unavailable or invalid.'); return; }
    setSignupLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth.html`,
        },
      });

      if (error) throw error;
      
      const user = data.user;
      if (!user) throw new Error('Sign up failed. No user returned.');
      
      if (!data.session) {
        // Email confirmation is required
        localStorage.setItem('pending_username', u);
        alert('Check your email for a confirmation link!');
        return; // Stop execution until user confirms email
      }
      
      // A session exists, so user is logged in (auto-confirmation on)
      const { error: pe } = await supabase
        .from('profiles')
        .update({ username: u })
        .eq('id', user.id);

      if (pe) {
        if ((pe as any).code === '23505') throw new Error('Username already taken.');
        throw pe;
      }
      window.location.assign('/');
    } catch (e: any) {
      setSignupError(e?.message || 'Sign up failed. Please try again.');
    } finally { setSignupLoading(false); }
  }

  return {
    loginEmail, setLoginEmail,
    loginPassword, setLoginPassword,
    loginError, loginLoading, login,
    email, setEmail,
    password, setPassword,
    username, setUsername,
    uStatus,
    signupError, signupLoading, createAccount,
  };
}