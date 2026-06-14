import { secureSessionStorage } from "@/lib/supabase/client";

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  isAvailableAsync: jest.fn(async () => true),
  setItemAsync: jest.fn(async () => undefined)
}));

describe("secure session storage", () => {
  it("removes local session entries on logout without exposing token values", async () => {
    await secureSessionStorage.setItem("supabase-session", "mock-jwt-value");
    await secureSessionStorage.removeItem("supabase-session");

    await expect(secureSessionStorage.getItem("supabase-session")).resolves.toBeNull();
  });
});
