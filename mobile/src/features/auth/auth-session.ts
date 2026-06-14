import type { Session } from "@supabase/supabase-js";

export type AuthSession = Pick<Session, "access_token" | "expires_at" | "user">;

export function isSessionExpired(session: Pick<Session, "expires_at"> | null) {
  if (!session?.expires_at) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return session.expires_at <= nowSeconds;
}

export function getSafeAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "No se pudo completar la operacion de autenticacion.";
}
