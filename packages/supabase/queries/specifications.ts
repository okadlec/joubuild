import type { TypedSupabaseClient } from '../client';

export function getSpecifications(
  client: TypedSupabaseClient,
  projectId: string
) {
  return client
    .from('specifications')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
}

export function deleteSpecification(
  client: TypedSupabaseClient,
  id: string
) {
  return client.from('specifications').delete().eq('id', id);
}
