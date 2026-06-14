export type MobileEnv = {
  apiUrl: string;
  appEnv: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
};

export const mobileEnv: MobileEnv = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "local",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""
};
