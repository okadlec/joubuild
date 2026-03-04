'use server';

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import type { OrgRole } from '@joubuild/shared';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function updateMemberRole(userId: string, orgId: string, newRole: OrgRole) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  const { error } = await serviceClient
    .from('organization_members')
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('organization_id', orgId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeMember(userId: string, orgId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  const { error } = await serviceClient
    .from('organization_members')
    .delete()
    .eq('user_id', userId)
    .eq('organization_id', orgId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function addMemberToOrg(userId: string, orgId: string, role: OrgRole) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  const { error } = await serviceClient
    .from('organization_members')
    .insert({ organization_id: orgId, user_id: userId, role });

  if (error) return { error: error.message };
  return { success: true };
}

export async function addMemberByEmail(orgId: string, email: string, role: OrgRole) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  // Look up user by email
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile) return { error: 'Uzivatel s timto emailem neexistuje' };

  // Check for duplicate membership
  const { data: existing } = await serviceClient
    .from('organization_members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) return { error: 'Uzivatel je jiz clenem teto organizace' };

  const { error } = await serviceClient
    .from('organization_members')
    .insert({ organization_id: orgId, user_id: profile.id, role });

  if (error) return { error: error.message };
  return {
    success: true,
    member: {
      user_id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role,
    },
  };
}
