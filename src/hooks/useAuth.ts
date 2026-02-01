import { useState, useEffect, useCallback } from 'react';
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
    // Remove Supabase auth tokens
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
const isInvalidRefreshTokenError = (error: AuthError | Error | unknown): boolean => {
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

  // Safe sign out that clears everything
  const forceSignOut = useCallback(async () => {
    console.log('[Auth] Forcing sign out due to invalid session');
    clearLocalAuthData();
    setAuthState({
      user: null,
      session: null,
      loading: false,
    });
    // Attempt Supabase signOut (ignore errors as session may already be invalid)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore - we've already cleared local state
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log('[Auth] State change:', event, session?.user?.email);

        // Handle sign out event
        if (event === 'SIGNED_OUT') {
          clearLocalAuthData();
          setAuthState({
            user: null,
            session: null,
            loading: false,
          });
          return;
        }

        // Handle token refresh failure
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('[Auth] Token refresh failed, forcing sign out');
          forceSignOut();
          return;
        }

        // Normal state update
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Session error:', error.message);
          
          // If refresh token is invalid, clear and force re-auth
          if (isInvalidRefreshTokenError(error)) {
            console.warn('[Auth] Invalid refresh token detected, clearing session');
            await forceSignOut();
            return;
          }
        }

        if (mounted) {
          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
          });
        }
      } catch (error) {
        console.error('[Auth] Initialization error:', error);
        
        if (isInvalidRefreshTokenError(error)) {
          await forceSignOut();
          return;
        }

        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
          });
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [forceSignOut]);

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
      // Clear any stale session data before signing in
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
      // Even if signOut fails, clear local state
      clearLocalAuthData();
      setAuthState({
        user: null,
        session: null,
        loading: false,
      });
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