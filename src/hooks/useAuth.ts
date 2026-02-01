import { useState, useEffect, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// Helper to clear all Supabase auth data from localStorage
const clearLocalAuthData = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Auth] Cleared local auth data');
  } catch (error) {
    console.warn('[Auth] Failed to clear local auth data:', error);
  }
};

// Check if error is an invalid refresh token error
const isInvalidRefreshTokenError = (error: unknown): boolean => {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('refresh token') || 
         message.toLowerCase().includes('refresh_token_not_found');
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Helper function to safely update state
    const safeSetState = (newState: AuthState) => {
      if (mountedRef.current) {
        setAuthState(newState);
      }
    };

    // Force sign out helper
    const forceSignOut = async () => {
      console.log('[Auth] Forcing sign out due to invalid session');
      clearLocalAuthData();
      safeSetState({ user: null, session: null, loading: false });
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignore
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] State change:', event, session?.user?.email);

        if (event === 'SIGNED_OUT') {
          clearLocalAuthData();
          safeSetState({ user: null, session: null, loading: false });
          return;
        }

        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('[Auth] Token refresh failed');
          forceSignOut();
          return;
        }

        safeSetState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    );

    // Initialize auth
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Session error:', error.message);
          if (isInvalidRefreshTokenError(error)) {
            await forceSignOut();
            return;
          }
        }

        safeSetState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      } catch (error) {
        console.error('[Auth] Initialization error:', error);
        if (isInvalidRefreshTokenError(error)) {
          await forceSignOut();
          return;
        }
        safeSetState({ user: null, session: null, loading: false });
      }
    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData?: { display_name?: string }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData
        }
      });
      return { error };
    } catch (error) {
      console.error('[Auth] Sign up error:', error);
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      clearLocalAuthData();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error('[Auth] Sign in error:', error);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      clearLocalAuthData();
      return { error };
    } catch (error) {
      clearLocalAuthData();
      setAuthState({ user: null, session: null, loading: false });
      return { error: error as AuthError };
    }
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
  };
}