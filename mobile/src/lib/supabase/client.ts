import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupportedStorage } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import { mobileEnv } from "@/lib/env/env";

const memoryStorage = new Map<string, string>();

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export const secureSessionStorage: SupportedStorage = {
  async getItem(key: string) {
    if (await isSecureStoreAvailable()) {
      return SecureStore.getItemAsync(key);
    }
    return AsyncStorage.getItem(key);
  },
  async removeItem(key: string) {
    memoryStorage.delete(key);
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value);
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  }
};

export function getSupabaseConfig() {
  return {
    anonKeyConfigured: Boolean(mobileEnv.supabaseAnonKey),
    urlConfigured: Boolean(mobileEnv.supabaseUrl)
  };
}

export function createSupabaseMobileClient() {
  if (!mobileEnv.supabaseUrl || !mobileEnv.supabaseAnonKey) {
    return null;
  }

  return createClient(mobileEnv.supabaseUrl, mobileEnv.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: secureSessionStorage
    }
  });
}
