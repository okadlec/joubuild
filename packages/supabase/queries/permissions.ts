import type { TypedSupabaseClient } from '../client';

export function getProjectMemberRole(
  client: TypedSupabaseClient,
  projectId: string,
  userId: string
) {
  return client
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();
}
