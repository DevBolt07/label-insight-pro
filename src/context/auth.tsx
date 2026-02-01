import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData?: { display_name?: string }
  ) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Helper to clear Supabase auth data from localStorage
const clearLocalAuthData = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase")) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("[Auth] Failed to clear local auth data:", error);
  }
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);

const isInvalidRefreshTokenError = (error: unknown): boolean => {
  if (!error) return false;
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    message.includes("refresh_token_not_found")
  );
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const safeSet = (next: { user: User | null; session: Session | null; loading?: boolean }) => {
    if (!mountedRef.current) return;
    setUser(next.user);
    setSession(next.session);
    if (typeof next.loading === "boolean") setLoading(next.loading);
  };

  const forceReauth = async (reason: string) => {
    console.warn(`[Auth] Forcing re-authentication: ${reason}`);

    // Keep this explicit: we handle the error and recover, rather than letting it break the UI.
    toast({
      title: "Session expired",
      description: "Your session is no longer valid. Please sign in again.",
      variant: "destructive",
    });

    try {
      // Try to stop any refresh loops inside the SDK.
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Ignore
    }

    clearLocalAuthData();
    safeSet({ user: null, session: null, loading: false });
  };

  useEffect(() => {
    mountedRef.current = true;

    // 1) Listen first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Keep callback synchronous (Supabase deadlock prevention).
      if (event === "SIGNED_OUT") {
        clearLocalAuthData();
        safeSet({ user: null, session: null, loading: false });
        return;
      }

      safeSet({
        user: newSession?.user ?? null,
        session: newSession ?? null,
        loading: false,
      });
    });

    // 2) Then initialize session
    (async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("[Auth] getSession error:", error);
          if (isInvalidRefreshTokenError(error)) {
            await forceReauth("invalid_refresh_token");
            return;
          }
        }

        safeSet({
          user: initialSession?.user ?? null,
          session: initialSession ?? null,
          loading: false,
        });
      } catch (error) {
        console.error("[Auth] getSession threw:", error);
        if (isInvalidRefreshTokenError(error)) {
          await forceReauth("invalid_refresh_token");
          return;
        }
        safeSet({ user: null, session: null, loading: false });
      }
    })();

    // 3) Catch rare cases where the SDK rejects a refresh promise without a consumer.
    // This prevents the app from getting stuck on a broken session.
    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (!isInvalidRefreshTokenError(e.reason)) return;

      console.error("[Auth] Unhandled invalid refresh token rejection:", e.reason);
      e.preventDefault();
      void forceReauth("unhandled_rejection_invalid_refresh_token");
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  const signUp: AuthContextValue["signUp"] = async (email, password, userData) => {
    const redirectUrl = `${window.location.origin}/`;

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData,
        },
      });

      return { error };
    } catch (error) {
      console.error("[Auth] signUp threw:", error);
      return { error: error as AuthError };
    }
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    try {
      // If local storage has a stale refresh token, Supabase can reject refresh.
      // Clearing first guarantees sign-in isn't blocked.
      clearLocalAuthData();

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      console.error("[Auth] signIn threw:", error);
      return { error: error as AuthError };
    }
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      clearLocalAuthData();
      return { error };
    } catch (error) {
      clearLocalAuthData();
      safeSet({ user: null, session: null, loading: false });
      return { error: error as AuthError };
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, signUp, signIn, signOut }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
