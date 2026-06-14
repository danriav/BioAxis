import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getSafeAuthErrorMessage, isSessionExpired } from "@/features/auth/auth-session";
import { createSupabaseMobileClient } from "@/lib/supabase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type AuthState = {
  error: string | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  status: AuthStatus;
};

const AuthContext = createContext<AuthState | null>(null);

const supabase = createSupabaseMobileClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback((nextSession: Session | null) => {
    if (!nextSession || isSessionExpired(nextSession)) {
      setSession(null);
      setStatus("unauthenticated");
      return;
    }

    setSession(nextSession);
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      if (!supabase) {
        setStatus("error");
        setError("Faltan variables públicas de Supabase para iniciar sesión.");
        return;
      }

      const { data, error: restoreError } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      if (restoreError) {
        setSession(null);
        setStatus("error");
        setError(getSafeAuthErrorMessage(restoreError));
        return;
      }

      applySession(data.session);
    }

    void restoreSession();

    const { data: listener } =
      supabase?.auth.onAuthStateChange((_event, nextSession) => {
        applySession(nextSession);
        setError(null);
      }) ?? { data: { subscription: null } };

    return () => {
      mounted = false;
      listener.subscription?.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setStatus("error");
      setError("Faltan variables públicas de Supabase para iniciar sesión.");
      return;
    }

    setStatus("loading");
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setSession(null);
      setStatus("unauthenticated");
      setError("No pudimos iniciar sesión con esas credenciales.");
      return;
    }

    applySession(data.session);
  }, [applySession]);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();

    setSession(null);
    setStatus("unauthenticated");

    if (signOutError) {
      setError(getSafeAuthErrorMessage(signOutError));
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      error,
      session,
      signIn,
      signOut,
      status
    }),
    [error, session, signIn, signOut, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
