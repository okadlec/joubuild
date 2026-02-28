import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | null = null;

/**
 * Create a Supabase client for browser/client-side usage.
 * Returns a singleton instance.
 */
export function createBrowserClient(): TypedSupabaseClient {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
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
