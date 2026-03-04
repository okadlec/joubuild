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
