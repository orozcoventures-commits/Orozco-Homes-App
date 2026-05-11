import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Effect 1: sync auth state only — no Supabase API calls inside this callback.
  // Calling supabase.from() inside onAuthStateChange can deadlock the auth client's
  // internal lock in supabase-js v2, causing loadProfile to never resolve.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
          setLoading(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Effect 2: fetch profile whenever the logged-in user changes.
  // Depends on user?.id so a token refresh (same user, new object reference)
  // does not trigger an unnecessary round-trip.
  useEffect(() => {
    if (!user) return;
    loadProfile(user.id);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] loadProfile error:', error.message, error.code);
      }

      setProfile(data ?? null);
    } catch (err) {
      console.error('[Auth] loadProfile threw unexpectedly:', err);
      setProfile(null);
    } finally {
      // Always clear the loading gate — even on error or missing profile row.
      setLoading(false);
    }
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signup(email, password, fullName) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  }

  // Promotes the caller to admin only when no admin exists yet.
  // Uses getSession() for the user ID instead of the `user` state variable,
  // because this is called right after login() before React has re-rendered
  // and the `user` closure value is still null.
  async function claimFirstAdmin() {
    const { data, error } = await supabase.rpc('promote_to_first_admin');
    if (error) {
      console.error('[Auth] claimFirstAdmin RPC error:', error.message);
      throw error;
    }
    if (data) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await loadProfile(session.user.id);
    }
    return data;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  const isAuthenticated = !!user && !loading;
  const isAdmin         = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthenticated, isAdmin, login, signup, claimFirstAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
