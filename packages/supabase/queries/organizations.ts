import type { TypedSupabaseClient } from '../client';

export function getOrganizations(client: TypedSupabaseClient) {
  return client
    .from('organizations')
    .select(`
      *,
      organization_members!inner(user_id, role)
    `)
    .order('created_at', { ascending: false });
}

export function getOrganization(client: TypedSupabaseClient, id: string) {
  return client
    .from('organizations')
    .select(`
      *,
      organization_members(user_id, role)
    `)
    .eq('id', id)
    .single();
}

export function createOrganization(
  client: TypedSupabaseClient,
  data: { name: string; slug: string }
) {
  return client.from('organizations').insert(data).select().single();
}

export function updateOrganization(
  client: TypedSupabaseClient,
  id: string,
  data: { name?: string; logo_url?: string | null }
) {
  return client.from('organizations').update(data).eq('id', id).select().single();
}
