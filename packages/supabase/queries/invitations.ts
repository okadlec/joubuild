import type { TypedSupabaseClient } from '../client';

export function getOrganizationInvitations(client: TypedSupabaseClient, orgId: string) {
  return client
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
}

export function getPendingInvitationForEmail(client: TypedSupabaseClient, orgId: string, email: string) {
  return client
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();
}

export function getPendingInvitationsForUser(client: TypedSupabaseClient, email: string) {
  return client
    .from('organization_invitations')
    .select('*, organizations(name)')
    .eq('email', email)
    .eq('status', 'pending');
}
