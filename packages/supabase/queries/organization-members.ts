import type { TypedSupabaseClient } from '../client';

export function getOrganizationMembers(
  client: TypedSupabaseClient,
  orgId: string
) {
  return client
    .from('organization_members')
    .select('id, organization_id, user_id, role')
    .eq('organization_id', orgId);
}

export function getOrganizationMemberRole(
  client: TypedSupabaseClient,
  orgId: string,
  userId: string
) {
  return client
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single();
}
