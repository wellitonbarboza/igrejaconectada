import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Não foi possível carregar o usuário atual', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const handleFocus = () => refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [refresh]);

  const signIn = useCallback(async ({ email, password }) => {
    const loggedUser = await base44.auth.login({ email, password });
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const signUp = useCallback(async (payload) => {
    const createdUser = await base44.auth.register(payload);
    setUser(createdUser);
    return createdUser;
  }, []);

  const signOut = useCallback(async () => {
    await base44.auth.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
