import type { TypedSupabaseClient } from '../client';

export function getProfile(client: TypedSupabaseClient, userId: string) {
  return client.from('profiles').select('*').eq('id', userId).single();
}

export function updateProfile(
  client: TypedSupabaseClient,
  userId: string,
  data: { full_name?: string; avatar_url?: string | null }
) {
  return client.from('profiles').update(data).eq('id', userId).select().single();
}
