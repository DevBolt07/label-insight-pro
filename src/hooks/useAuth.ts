import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        void (async () => {
          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
          });
        })();
      }
    );

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    })();

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData?: { display_name?: string }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
  };
}