import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | null = null;

/**
 * Create a Supabase client for browser/client-side usage.
 * Returns a singleton instance.
 */
export function createBrowserClient(
  supabaseUrl?: string,
  supabaseAnonKey?: string,
  options?: {
    auth?: Partial<{
      storage: any;
      persistSession: boolean;
      autoRefreshToken: boolean;
      detectSessionInUrl: boolean;
    }>;
  }
): TypedSupabaseClient {
  if (browserClient) return browserClient;

  const url = supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  browserClient = createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      ...options?.auth,
    },
  });

  return browserClient;
}

/**
 * Create a Supabase client for server-side usage.
 * Each call creates a new instance (no singleton).
 */
export function createServerClient(
  supabaseUrl: string,
  supabaseKey: string,
  cookieHeader?: string
): TypedSupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    },
  });
}
