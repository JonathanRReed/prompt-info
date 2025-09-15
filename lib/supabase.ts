import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseConfigInput {
  url?: string;
  anonKey?: string;
}

interface SupabaseResolvedConfig {
  url: string;
  anonKey: string;
}

const URL_ENV_PRIORITY = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "DEFAULT_SUPABASE_URL",
];

const KEY_ENV_PRIORITY = [
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DEFAULT_SUPABASE_ANON_KEY",
];

let cachedClient: SupabaseClient | null = null;

const getFirstEnvValue = (keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
};

const resolveConfig = (config?: SupabaseConfigInput): SupabaseResolvedConfig | null => {
  if (config?.url && config?.anonKey) {
    return { url: config.url, anonKey: config.anonKey };
  }

  const url = config?.url ?? getFirstEnvValue(URL_ENV_PRIORITY);
  const anonKey = config?.anonKey ?? getFirstEnvValue(KEY_ENV_PRIORITY);

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
};

export const getSupabaseClient = (config?: SupabaseConfigInput): SupabaseClient | null => {
  const resolved = resolveConfig(config);
  if (!resolved) {
    return null;
  }

  if (config?.url || config?.anonKey) {
    return createClient(resolved.url, resolved.anonKey, { auth: { persistSession: false } });
  }

  if (!cachedClient) {
    cachedClient = createClient(resolved.url, resolved.anonKey, { auth: { persistSession: false } });
  }

  return cachedClient;
};
