import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // supabase auth user
  const [profile, setProfile] = useState(null);   // { role, full_name } from profiles table
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rehydrate session on mount (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Keep state in sync across tabs / token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
    setLoading(false);
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  const isAuthenticated = !!user && !loading;
  const isAdmin         = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthenticated, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
