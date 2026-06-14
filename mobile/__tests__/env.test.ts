import { isSessionExpired } from "@/features/auth/auth-session";
import { createApiClient, getAuthorizationHeader } from "@/lib/api/client";
import { getSupabaseConfig } from "@/lib/supabase/client";

describe("mobile boot scaffolding", () => {
  it("creates an API auth header from session without making network calls", () => {
    const client = createApiClient({ session: { access_token: "mock-token" } });

    expect(client.getAuthHeader()).toBe("Bearer mock-token");
  });

  it("does not create an auth header without a session", () => {
    expect(getAuthorizationHeader(null)).toBeNull();
  });

  it("keeps Supabase configured only from public env", () => {
    expect(getSupabaseConfig()).toEqual({
      anonKeyConfigured: false,
      urlConfigured: false
    });
  });

  it("detects expired sessions locally", () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 60;

    expect(isSessionExpired({ expires_at: expiredAt })).toBe(true);
  });
});
